// ── Автоскролл наверх при загрузке страницы ──────────────
if (history.scrollRestoration) history.scrollRestoration = 'manual';

// ════════════════════════════════════════════════════════════
//  Адрес backend-сервера (куда уходят заявки).
//  Пусто '' = тот же адрес, откуда открыт сайт (локальный сервер).
//  Если сайт на хостинге, а сервер развёрнут отдельно — впишите его URL,
//  например: const API_BASE = 'https://smarthub-xxxx.onrender.com';
// ════════════════════════════════════════════════════════════
const API_BASE = '';
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

    // Отправляем на сервер и ДОЖИДАЕМСЯ ответа — чтобы заявка точно попала в админку
    let serverOk = false;
    if (window.location.protocol !== 'file:') {
        try {
            const res = await fetch(API_BASE + '/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            serverOk = res.ok;
        } catch (_) {
            serverOk = false;
        }
    }

    if (serverOk) {
        toast(`Спасибо, ${data.name}! Мы свяжемся с вами в ближайшее время.`, true);
    } else {
        // Сервер недоступен — сохраняем локально как резерв, чтобы заявка не потерялась
        saveToLocal({ ...data });
        toast(`Спасибо, ${data.name}! Заявка сохранена.`, true);
    }
    this.reset();
    btn.textContent = orig;
    btn.disabled = false;
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

// ── Флаги-достижения открываются на весь экран по клику ──
(function initFlagModal() {
    const flags = document.querySelectorAll('.flag-card.flip-card');
    if (!flags.length) return;

    const modal = document.createElement('div');
    modal.className = 'flag-modal';
    modal.innerHTML =
        '<div class="flag-modal-box">' +
        '<button class="flag-modal-close" aria-label="Закрыть">\u00d7</button>' +
        '<img alt="" /><h3></h3><h4></h4><p></p></div>';
    document.body.appendChild(modal);

    const img = modal.querySelector('img');
    const h3 = modal.querySelector('h3');
    const h4 = modal.querySelector('h4');
    const p  = modal.querySelector('p');

    function open(card) {
        const back = card.querySelector('.flip-card-back');
        img.src = card.querySelector('.flag-img').src;
        h3.textContent = card.querySelector('.flag-name').textContent;
        h4.textContent = back && back.querySelector('h4') ? back.querySelector('h4').textContent : '';
        p.textContent  = back && back.querySelector('p')  ? back.querySelector('p').textContent  : '';
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function close() {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }

    flags.forEach(card => card.addEventListener('click', () => open(card)));
    modal.querySelector('.flag-modal-close').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('open')) close();
    });
})();


// ── Карточки учебной программы открываются на весь экран по клику ──
(function initCardModal() {
    const cards = document.querySelectorAll('.level-card.flip-card, .track-card.flip-card');
    if (!cards.length) return;

    const modal = document.createElement('div');
    modal.className = 'card-modal';
    modal.innerHTML =
        '<button class="card-modal-close" aria-label="Закрыть">\u00d7</button>' +
        '<div class="card-modal-box"><div class="card-modal-body"></div></div>';
    document.body.appendChild(modal);

    const box = modal.querySelector('.card-modal-box');
    const body = modal.querySelector('.card-modal-body');

    function open(card) {
        const back = card.querySelector('.flip-card-back');
        body.innerHTML = back ? back.innerHTML : '';
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        box.scrollTop = 0;
    }
    function close() {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }

    cards.forEach(card => card.addEventListener('click', () => open(card)));
    modal.querySelector('.card-modal-close').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('open')) close();
    });
})();


// ── Карта филиалов: клик по филиалу показывает его на карте ──
(function initBranchesMap() {
    const frame = document.getElementById('branchesMap');
    const btns = document.querySelectorAll('.branch-btn');
    if (!frame || !btns.length) return;

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const q = encodeURIComponent(btn.dataset.q);
            frame.src = 'https://www.google.com/maps?q=' + q + '&z=16&output=embed';
        });
    });
})();


// ── Маска телефона: +7 (XXX) XXX-XX-XX ──
(function initPhoneMask() {
    const phone = document.querySelector('#contactForm [name="phone"]');
    if (!phone) return;

    function format(value) {
        let d = value.replace(/\D/g, '');
        if (d.startsWith('8')) d = '7' + d.slice(1);
        if (d && !d.startsWith('7')) d = '7' + d;
        d = d.slice(0, 11);            // 7 + 10 цифр
        const p = d.slice(1);          // цифры после кода страны
        let r = '+7';
        if (p.length) {
            r += ' (' + p.substring(0, 3);
            if (p.length >= 3) r += ') ';
            if (p.length > 3)  r += p.substring(3, 6);
            if (p.length > 6)  r += '-' + p.substring(6, 8);
            if (p.length > 8)  r += '-' + p.substring(8, 10);
        }
        return r;
    }

    phone.addEventListener('focus', () => {
        if (!phone.value) phone.value = '+7 (';
    });
    phone.addEventListener('input', () => {
        phone.value = format(phone.value);
    });
    phone.addEventListener('blur', () => {
        if (phone.value === '+7 (' || phone.value === '+7') phone.value = '';
    });
})();
