// ── Автоскролл наверх при загрузке страницы ──────────────
if (history.scrollRestoration) history.scrollRestoration = 'manual';
window.addEventListener('load', () => window.scrollTo({ top: 0, behavior: 'instant' }));

// ── Тёмная тема ───────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// ── Навигация: активная ссылка при скролле ────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('nav a[href^="#"]');
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            navLinks.forEach(a => {
                a.classList.remove('active');
                if (a.getAttribute('href') === '#' + entry.target.id) a.classList.add('active');
            });
        }
    });
}, { threshold: 0.35 });
sections.forEach(s => observer.observe(s));

// ── Бургер-меню ───────────────────────────────────────────
const burger = document.querySelector('.burger');
const nav = document.querySelector('nav');
burger.addEventListener('click', () => nav.classList.toggle('open'));
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

// ── Переворачивающиеся билборды (клик/тап на мобильных) ──
const flipCards = document.querySelectorAll('.flip-card');
flipCards.forEach(card => {
    card.addEventListener('click', () => card.classList.toggle('flipped'));
});

// ── Сохранение в localStorage ─────────────────────────────
function saveToLocal(data) {
    const list = JSON.parse(localStorage.getItem('sh_submissions') || '[]');
    list.unshift({
        ...data,
        id: Date.now(),
        created_at: new Date().toLocaleString('ru-RU'),
    });
    localStorage.setItem('sh_submissions', JSON.stringify(list));
}

// ── Форма заявки ──────────────────────────────────────────
document.getElementById('contactForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const btn = this.querySelector('[type="submit"]');
    const orig = btn.textContent;
    btn.textContent = 'Отправка...';
    btn.disabled = true;

    const data = {
        name: this.querySelector('[name="name"]').value.trim(),
        phone: this.querySelector('[name="phone"]').value.trim(),
        age: this.querySelector('[name="age"]').value.trim(),
        direction: this.querySelector('[name="direction"]').value.trim(),
        message: (this.querySelector('[name="message"]') || {}).value ? .trim() || '',
    };

    if (!data.name) { toast('Укажите ваше имя', false);
        btn.textContent = orig;
        btn.disabled = false; return; }
    if (!data.phone) { toast('Укажите номер телефона', false);
        btn.textContent = orig;
        btn.disabled = false; return; }

    // Сначала всегда сохраняем локально — пользователь никогда не теряет заявку
    saveToLocal({...data });

    // Показываем успех сразу, не ждём сервер
    toast(`Спасибо, ${data.name}! Мы свяжемся с вами в ближайшее время.`, true);
    this.reset();
    btn.textContent = orig;
    btn.disabled = false;

    // Тихо пытаемся отправить на сервер в фоне (не блокирует UI)
    if (window.location.protocol !== 'file:') {
        fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).catch(() => { /* сервер недоступен — данные уже в localStorage */ });
    }
});

// ── Toast уведомление ─────────────────────────────────────
function toast(msg, ok) {
    let el = document.getElementById('formToast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'formToast';
        el.style.cssText = [
            'position:fixed', 'bottom:28px', 'left:50%', 'transform:translateX(-50%)',
            'padding:14px 28px', 'border-radius:12px', 'font-weight:700', 'font-size:.95rem',
            'color:#fff', 'z-index:9999', 'opacity:0', 'transition:opacity .35s',
            'max-width:90%', 'text-align:center', 'pointer-events:none',
            'box-shadow:0 4px 20px rgba(0,0,0,.25)',
        ].join(';');
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = ok ? '#1e8c3a' : '#CC0000';
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => el.style.opacity = '0', 4500);
}