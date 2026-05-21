// Dark theme toggle
const themeToggle = document.getElementById('themeToggle');

if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}

themeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// Smooth scroll + active nav highlight
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('nav a[href^="#"]');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => {
        a.classList.remove('active');
        if (a.getAttribute('href') === '#' + entry.target.id) {
          a.classList.add('active');
        }
      });
    }
  });
}, { threshold: 0.35 });

sections.forEach(s => observer.observe(s));

// Burger menu toggle
const burger = document.querySelector('.burger');
const nav = document.querySelector('nav');
burger.addEventListener('click', () => nav.classList.toggle('open'));
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

// ── Определяем режим: сервер или файл ────────────────────
const SERVER_MODE = window.location.protocol !== 'file:';

// ── Хранилище заявок (fallback — localStorage) ────────────
function saveToLocal(data) {
  const existing = JSON.parse(localStorage.getItem('sh_submissions') || '[]');
  data.id = Date.now();
  data.created_at = new Date().toLocaleString('ru-RU');
  existing.unshift(data);
  localStorage.setItem('sh_submissions', JSON.stringify(existing));
}

// Contact form
document.getElementById('contactForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const submitBtn = this.querySelector('[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Отправка...';
  submitBtn.disabled = true;

  const data = {
    name:    this.querySelector('[name="name"]').value.trim(),
    phone:   this.querySelector('[name="phone"]').value.trim(),
    city:    this.querySelector('[name="city"]').value.trim(),
    country: this.querySelector('[name="country"]').value.trim(),
    message: this.querySelector('[name="message"]').value.trim(),
  };

  if (!data.name) { showFormToast('Укажите ваше имя', false); submitBtn.textContent = originalText; submitBtn.disabled = false; return; }
  if (!data.phone) { showFormToast('Укажите номер телефона', false); submitBtn.textContent = originalText; submitBtn.disabled = false; return; }

  if (SERVER_MODE) {
    // Режим сервера — отправляем на API
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        showFormToast(`Спасибо, ${data.name}! Мы свяжемся с вами в ближайшее время.`, true);
        this.reset();
      } else {
        const err = await res.json().catch(() => ({}));
        showFormToast(err.error || 'Ошибка отправки. Попробуйте ещё раз.', false);
      }
    } catch {
      // Сервер недоступен — сохраняем локально
      saveToLocal({ ...data });
      showFormToast(`Спасибо, ${data.name}! Заявка сохранена.`, true);
      this.reset();
    }
  } else {
    // Режим без сервера (file://) — сохраняем в localStorage
    saveToLocal({ ...data });
    showFormToast(`Спасибо, ${data.name}! Мы свяжемся с вами в ближайшее время.`, true);
    this.reset();
  }

  submitBtn.textContent = originalText;
  submitBtn.disabled = false;
});

function showFormToast(msg, ok) {
  let el = document.getElementById('formToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'formToast';
    el.style.cssText = `
      position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
      padding:14px 28px;border-radius:10px;font-weight:700;font-size:.95rem;
      color:#fff;z-index:9999;opacity:0;transition:opacity .3s;
      max-width:90%;text-align:center;pointer-events:none;
    `;
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = ok ? '#1e8c3a' : '#CC0000';
  el.style.opacity = '1';
  setTimeout(() => el.style.opacity = '0', 4000);
}
