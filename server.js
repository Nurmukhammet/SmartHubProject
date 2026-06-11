const express = require('express');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'smarthub2025';
const DB_FILE = path.join(__dirname, 'submissions.json');
const MONGODB_URI = process.env.MONGODB_URI || '';
const USE_MONGO = !!MONGODB_URI;

// ════════════════════════════════════════════════════════════
//  Хранилище заявок
//  • Если задан MONGODB_URI  → надёжная облачная база MongoDB.
//  • Если нет (локально)     → файл submissions.json (как раньше).
// ════════════════════════════════════════════════════════════

// ── Файловое хранилище (резерв / локальная разработка) ──
function fileLoad() {
  if (!fs.existsSync(DB_FILE)) return { nextId: 1, rows: [] };
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { nextId: 1, rows: [] }; }
}
function fileSave(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}
const fileStore = {
  async all() { return fileLoad().rows; },
  async add(rec) {
    const db = fileLoad();
    rec.id = db.nextId++;
    db.rows.unshift(rec);
    fileSave(db);
    return rec;
  },
  async remove(id) {
    const db = fileLoad();
    db.rows = db.rows.filter(r => r.id !== Number(id));
    fileSave(db);
  },
  async update(id, fields) {
    const db = fileLoad();
    const r = db.rows.find(x => x.id === Number(id));
    if (r) Object.assign(r, fields);
    fileSave(db);
    return r;
  },
};

// ── MongoDB хранилище ──
let col = null;   // коллекция заявок
let cnt = null;   // счётчик id

async function nextId() {
  const res = await cnt.findOneAndUpdate(
    { _id: 'sub' },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  const doc = res && res.value ? res.value : res; // совместимость с разными версиями драйвера
  return (doc && doc.seq) ? doc.seq : 1;
}

const mongoStore = {
  async all() {
    return col.find({}, { projection: { _id: 0 } }).sort({ id: -1 }).toArray();
  },
  async add(rec) {
    rec.id = await nextId();
    await col.insertOne(rec);
    delete rec._id;
    return rec;
  },
  async remove(id) {
    await col.deleteOne({ id: Number(id) });
  },
  async update(id, fields) {
    await col.updateOne({ id: Number(id) }, { $set: fields });
    return col.findOne({ id: Number(id) }, { projection: { _id: 0 } });
  },
};

const store = USE_MONGO ? mongoStore : fileStore;

async function initMongo() {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('smarthub');
  col = db.collection('submissions');
  cnt = db.collection('counters');

  // Перенос существующих заявок из файла в базу (один раз)
  const count = await col.countDocuments();
  if (count === 0 && fs.existsSync(DB_FILE)) {
    try {
      const fileDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (fileDb.rows && fileDb.rows.length) {
        await col.insertMany(fileDb.rows.map(r => ({ ...r })));
        const maxId = Math.max(0, ...fileDb.rows.map(r => r.id || 0));
        await cnt.updateOne({ _id: 'sub' }, { $set: { seq: maxId } }, { upsert: true });
        console.log(`📥  Импортировано из submissions.json: ${fileDb.rows.length} заявок`);
      }
    } catch (e) {
      console.log('Миграция пропущена:', e.message);
    }
  }
}

// ── Middleware ────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function requireAdmin(req, res, next) {
  const key = req.query.key || req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'Неверный ключ доступа' });
  next();
}

// ── API: Сохранить заявку ─────────────────────────────────
app.post('/api/submit', async (req, res) => {
  try {
    const { name, phone, age, direction, message } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Укажите имя' });
    if (!phone || !phone.trim()) return res.status(400).json({ error: 'Укажите телефон' });

    const record = {
      name: name.trim(),
      phone: phone.trim(),
      age: (age || '').toString().trim(),
      direction: (direction || '').trim(),
      message: (message || '').trim(),
      payment: 'Не оплачено',
      created_at: new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' }),
    };
    const saved = await store.add(record);
    res.json({ ok: true, id: saved.id });
  } catch (e) {
    console.error('submit error:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── API: Все заявки (админ) ───────────────────────────────
app.get('/api/submissions', requireAdmin, async (req, res) => {
  try { res.json(await store.all()); }
  catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ── API: Удалить заявку (админ) ───────────────────────────
app.delete('/api/submissions/:id', requireAdmin, async (req, res) => {
  try { await store.remove(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ── API: Обновить заявку — статус оплаты и др. (админ) ────
app.patch('/api/submissions/:id', requireAdmin, async (req, res) => {
  try {
    const allowed = ['payment', 'status', 'name', 'phone', 'age', 'direction', 'message'];
    const fields = {};
    for (const k of allowed) if (k in req.body) fields[k] = (req.body[k] ?? '').toString();
    await store.update(req.params.id, fields);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ── API: Экспорт в Excel (админ) ──────────────────────────
app.get('/api/export', requireAdmin, async (req, res) => {
  const rows = await store.all();
  const data = rows.map(r => ({
    'ID':          r.id,
    'Имя':         r.name,
    'Телефон':     r.phone,
    'Возраст':     r.age,
    'Направление': r.direction,
    'Статус оплаты': r.payment || 'Не оплачено',
    'Сообщение':   r.message,
    'Дата':        r.created_at,
  }));

  const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ 'ID':'','Имя':'','Телефон':'','Возраст':'','Направление':'','Статус оплаты':'','Сообщение':'','Дата':'' }]);
  ws['!cols'] = [{ wch:6 },{ wch:22 },{ wch:18 },{ wch:10 },{ wch:16 },{ wch:16 },{ wch:40 },{ wch:22 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Заявки SmartHub');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=smarthub-zayavki.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// ── Запуск ────────────────────────────────────────────────
async function start() {
  if (USE_MONGO) {
    try {
      await initMongo();
      console.log('✅  База данных: MongoDB (надёжное облачное хранилище)');
    } catch (e) {
      console.error('❌  Не удалось подключиться к MongoDB:', e.message);
      process.exit(1);
    }
  } else {
    console.log('💾  База данных: файл submissions.json (локальный режим)');
  }
  app.listen(PORT, () => {
    console.log(`\n✅  Сервер запущен: http://localhost:${PORT}`);
    console.log(`📋  Админка:        http://localhost:${PORT}/admin.html`);
    console.log(`🔑  Ключ доступа:   ${ADMIN_KEY}\n`);
  });
}

start();
