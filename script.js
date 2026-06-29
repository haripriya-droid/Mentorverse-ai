/* MentorVerse AI · script.js */

// ── Navbar scroll effect ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// ── Hamburger menu ──
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');
hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  const isOpen = navLinks.classList.contains('open');
  hamburger.setAttribute('aria-expanded', isOpen);
});
// Close on link click
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// ── Animated stat counters ──
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1400;
  const start    = performance.now();
  const update   = (now) => {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ── Intersection Observer for reveals + counters ──
const revealEls   = document.querySelectorAll('.reveal');
const counterEls  = document.querySelectorAll('.stat-num');

const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      // stagger delay
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, (i % 6) * 80);
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => revealObs.observe(el));

const counterObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

counterEls.forEach(el => counterObs.observe(el));

// ── Mentor Personality Tabs ──
const tabBtns  = document.querySelectorAll('.tab-btn');
const panels   = document.querySelectorAll('.personality-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;

    // Update button active state
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Show matching panel
    panels.forEach(panel => {
      panel.classList.remove('active');
      if (panel.id === `panel-${tab}`) {
        panel.classList.add('active');
      }
    });
  });
});

// ── Smooth scroll for anchor links ──
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      const offset = 80; // navbar height
      const top    = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ── Feature cards keyboard interaction ──
document.querySelectorAll('.feature-card').forEach(card => {
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      card.style.transform = 'translateY(-8px)';
      setTimeout(() => card.style.transform = '', 200);
    }
  });
});

// ── Launch button: page-fade transition → app.html ──
const launchBtn = document.getElementById('launch-btn');
if (launchBtn) {
  launchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // Sparkle burst
    const rect = launchBtn.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      createSparkle(
        rect.left + Math.random() * rect.width,
        rect.top  + Math.random() * rect.height
      );
    }
    // Page fade-out
    document.body.classList.add('page-leaving');
    setTimeout(() => {
      window.location.href = 'app.html';
    }, 420);
  });
}

function createSparkle(x, y) {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: hsl(${Math.random() * 60 + 260}, 100%, 70%);
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%) scale(0);
    animation: sparkle 0.7s forwards;
  `;
  document.body.appendChild(el);
  const angle  = Math.random() * 360;
  const dist   = 40 + Math.random() * 60;
  const dx     = Math.cos(angle * Math.PI / 180) * dist;
  const dy     = Math.sin(angle * Math.PI / 180) * dist;
  el.animate([
    { transform: 'translate(-50%,-50%) scale(0)', opacity: 1 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.2)`, opacity: 0.8, offset: 0.5 },
    { transform: `translate(calc(-50% + ${dx * 1.5}px), calc(-50% + ${dy * 1.5}px)) scale(0)`, opacity: 0 }
  ], { duration: 700, easing: 'ease-out', fill: 'forwards' });
  setTimeout(() => el.remove(), 800);
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: linear-gradient(135deg, #8b5cf6, #22d3ee);
    color: #fff;
    font-family: 'Outfit', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    padding: 14px 28px;
    border-radius: 100px;
    box-shadow: 0 8px 32px rgba(139,92,246,0.4);
    z-index: 9999;
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
    white-space: nowrap;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ── Cursor glow effect (desktop only) ──
if (window.matchMedia('(pointer: fine)').matches) {
  const glow = document.createElement('div');
  glow.style.cssText = `
    position: fixed;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(139,92,246,0.07), transparent 70%);
    pointer-events: none;
    z-index: 0;
    transform: translate(-50%, -50%);
    transition: left 0.1s ease, top 0.1s ease;
    mix-blend-mode: screen;
  `;
  document.body.appendChild(glow);
  window.addEventListener('mousemove', (e) => {
    glow.style.left = e.clientX + 'px';
    glow.style.top  = e.clientY + 'px';
  });
}

console.log('%c MentorVerse AI 🚀', 'color: #8b5cf6; font-size: 24px; font-weight: 900;');
console.log('%c Learn smarter. Build faster. Grow with a mentor that speaks your language.', 'color: #22d3ee; font-size: 14px;');
