const express = require('express');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = 'smarthub2025';
const DB_FILE = path.join(__dirname, 'submissions.json');

// ── JSON-база данных ──────────────────────────────────────
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return { nextId: 1, rows: [] };
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { nextId: 1, rows: [] }; }
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// ── Middleware ────────────────────────────────────────────
// ── CORS: разрешаем приём заявок с любого устройства/домена ──
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
app.post('/api/submit', (req, res) => {
  const { name, phone, age, direction, message } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Укажите имя' });
  if (!phone || !phone.trim()) return res.status(400).json({ error: 'Укажите телефон' });

  const db = loadDB();
  const now = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' });
  const record = {
    id: db.nextId++,
    name: name.trim(),
    phone: phone.trim(),
    age: (age || '').toString().trim(),
    direction: (direction || '').trim(),
    message: (message || '').trim(),
    created_at: now,
  };
  db.rows.unshift(record);
  saveDB(db);
  res.json({ ok: true, id: record.id });
});

// ── API: Все заявки (админ) ───────────────────────────────
app.get('/api/submissions', requireAdmin, (req, res) => {
  res.json(loadDB().rows);
});

// ── API: Удалить заявку (админ) ───────────────────────────
app.delete('/api/submissions/:id', requireAdmin, (req, res) => {
  const db = loadDB();
  const id = Number(req.params.id);
  db.rows = db.rows.filter(r => r.id !== id);
  saveDB(db);
  res.json({ ok: true });
});

// ── API: Экспорт в Excel (админ) ──────────────────────────
app.get('/api/export', requireAdmin, (req, res) => {
  const { rows } = loadDB();
  const data = rows.map(r => ({
    'ID':        r.id,
    'Имя':       r.name,
    'Телефон':   r.phone,
    'Возраст':   r.age,
    'Направление': r.direction,
    'Сообщение': r.message,
    'Дата':      r.created_at,
  }));

  const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ 'ID':'','Имя':'','Телефон':'','Возраст':'','Направление':'','Сообщение':'','Дата':'' }]);
  ws['!cols'] = [{ wch:6 },{ wch:22 },{ wch:18 },{ wch:16 },{ wch:16 },{ wch:40 },{ wch:22 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Заявки SmartHub');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=smarthub-zayavki.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// ── Запуск ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  Сервер запущен: http://localhost:${PORT}`);
  console.log(`📋  Админка:        http://localhost:${PORT}/admin.html`);
  console.log(`🔑  Ключ доступа:   ${ADMIN_KEY}\n`);
});
