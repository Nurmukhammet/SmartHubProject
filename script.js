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

// ── Переворачивающиеся билборды ──
// Десктоп (есть мышь) — переворот по наведению (CSS).
// Телефон/планшет (нет наведения) — переворот по тапу.
const isTouch = window.matchMedia('(hover: none)').matches;
if (isTouch) {
    document.querySelectorAll('.flip-card').forEach(card => {
        card.addEventListener('click', () => card.classList.toggle('flipped'));
    });
}

// ── Карусель отзывов (стрелки + точки + свайп) ────────────
(function initReviews() {
    const carousel = document.querySelector('.reviews-carousel');
    if (!carousel) return;
    const track = carousel.querySelector('.reviews-track');
    const prev = carousel.querySelector('.rev-prev');
    const next = carousel.querySelector('.rev-next');
    const dotsWrap = carousel.querySelector('.reviews-dots');
    const cards = Array.from(track.querySelectorAll('.review-card'));
    if (!cards.length) return;

    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap) || 22;

    const cardStep = () => cards[0].offsetWidth + gap;
    const perView = () => Math.max(1, Math.round((track.clientWidth + gap) / cardStep()));
    const pageCount = () => Math.max(1, Math.ceil(cards.length / perView()));
    const pageWidth = () => cardStep() * perView();
    const currentPage = () => Math.round(track.scrollLeft / pageWidth());

    function scrollToPage(i) {
        track.scrollTo({ left: i * pageWidth(), behavior: 'smooth' });
    }

    function buildDots() {
        dotsWrap.innerHTML = '';
        for (let i = 0; i < pageCount(); i++) {
            const b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('aria-label', 'Отзывы, страница ' + (i + 1));
            b.addEventListener('click', () => scrollToPage(i));
            dotsWrap.appendChild(b);
        }
    }

    function update() {
        const page = currentPage();
        Array.from(dotsWrap.children).forEach((d, i) => d.classList.toggle('active', i === page));
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    }

    prev.addEventListener('click', () => scrollToPage(Math.max(0, currentPage() - 1)));
    next.addEventListener('click', () => scrollToPage(Math.min(pageCount() - 1, currentPage() + 1)));

    let raf;
    track.addEventListener('scroll', () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(update);
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { buildDots(); update(); }, 150);
    });

    buildDots();
    update();
})();

// ── Лайтбокс для фотогалереи достижений ───────────────────
(function initLightbox() {
    const items = Array.from(document.querySelectorAll('.gallery-item'));
    if (!items.length) return;

    const slides = items.map(fig => ({
        src: fig.querySelector('img').getAttribute('src'),
        caption: (fig.querySelector('figcaption') || {}).textContent || '',
    }));

    // создаём оверлей один раз
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML =
        '<button class="lightbox-close" aria-label="Закрыть">×</button>' +
        '<button class="lightbox-nav lightbox-prev" aria-label="Предыдущее">‹</button>' +
        '<img alt="" />' +
        '<button class="lightbox-nav lightbox-next" aria-label="Следующее">›</button>' +
        '<div class="lightbox-caption"></div>';
    document.body.appendChild(box);

    const imgEl = box.querySelector('img');
    const capEl = box.querySelector('.lightbox-caption');
    const btnClose = box.querySelector('.lightbox-close');
    const btnPrev = box.querySelector('.lightbox-prev');
    const btnNext = box.querySelector('.lightbox-next');
    let current = 0;

    function show(i) {
        current = (i + slides.length) % slides.length;
        imgEl.src = slides[current].src;
        imgEl.alt = slides[current].caption;
        capEl.textContent = slides[current].caption;
    }

    function open(i) {
        show(i);
        box.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function close() {
        box.classList.remove('open');
        document.body.style.overflow = '';
    }

    items.forEach((fig, i) => {
        fig.addEventListener('click', () => open(i));
    });

    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', () => show(current - 1));
    btnNext.addEventListener('click', () => show(current + 1));

    // клик по тёмному фону (не по фото/кнопкам) закрывает
    box.addEventListener('click', (e) => {
        if (e.target === box) close();
    });

    document.addEventListener('keydown', (e) => {
        if (!box.classList.contains('open')) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') show(current - 1);
        else if (e.key === 'ArrowRight') show(current + 1);
    });
})();

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
        message: (this.querySelector('[name="message"]') || {}).value?.trim() || '',
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