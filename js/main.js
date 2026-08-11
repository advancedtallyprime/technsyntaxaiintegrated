/* ==========================================================================
   Tech'nSyntax — Main JavaScript
   No external libraries. Vanilla JS only.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  initHeaderScroll();
  initMobileMenu();
  initActiveNav();
  initSmoothScroll();
  initScrollReveal();
  initScrollToTop();
  initFooterYear();
  initContactForm();
  initHeroCodeTyping();
  initImageFallbacks();
});

/* --- Header background on scroll ----------------------------------------- */
function initHeaderScroll() {
  var header = document.querySelector('.header');
  if (!header) return;

  function toggle() {
    if (window.scrollY > 8) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }
  toggle();
  window.addEventListener('scroll', toggle, { passive: true });
}

/* --- Mobile navigation menu ------------------------------------------------ */
function initMobileMenu() {
  var toggleBtn = document.querySelector('.hamburger');
  var navLinks = document.querySelector('.nav-links');
  var overlay = document.querySelector('.nav-overlay');
  var scrollTopBtn = document.querySelector('.scroll-top');
  if (!toggleBtn || !navLinks) return;

  function openMenu() {
    navLinks.classList.add('is-open');
    toggleBtn.setAttribute('aria-expanded', 'true');
    if (overlay) overlay.classList.add('is-open');
    // Prevent the floating scroll-to-top button from visually competing
    // with the open mobile nav panel.
    if (scrollTopBtn) scrollTopBtn.classList.add('is-hidden-by-menu');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    navLinks.classList.remove('is-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    if (overlay) overlay.classList.remove('is-open');
    if (scrollTopBtn) scrollTopBtn.classList.remove('is-hidden-by-menu');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', function () {
    var isOpen = navLinks.classList.contains('is-open');
    isOpen ? closeMenu() : openMenu();
  });

  if (overlay) overlay.addEventListener('click', closeMenu);

  // Close after selecting a link
  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });
}

/* --- Active navigation link (based on current page) ------------------------ */
function initActiveNav() {
  var current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === current || (current === '' && href === 'index.html')) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

/* --- Smooth scrolling for in-page anchor links ----------------------------- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var targetId = link.getAttribute('href');
      if (targetId.length < 2) return;
      var target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      var headerOffset = 80;
      var top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });
}

/* --- Scroll-triggered reveal animations ------------------------------------ */
function initScrollReveal() {
  var items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in-view'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -10% 0px' });

  items.forEach(function (el) { observer.observe(el); });

  // Safety net: content must never stay permanently invisible. Fast
  // scrolling, direct anchor-link navigation, and — importantly — search
  // engine crawlers and social-preview scrapers that render the page
  // without simulating a real scroll can all leave elements below the
  // fold stuck at opacity:0. After load, force-reveal anything still
  // hidden so real content is always present in what gets indexed/seen.
  window.addEventListener('load', function () {
    setTimeout(function () {
      items.forEach(function (el) { el.classList.add('is-in-view'); });
      observer.disconnect();
    }, 1800);
  });
}

/* --- Scroll-to-top button --------------------------------------------------- */
function initScrollToTop() {
  var btn = document.querySelector('.scroll-top');
  if (!btn) return;

  function toggle() {
    if (window.scrollY > 480) {
      btn.classList.add('is-visible');
    } else {
      btn.classList.remove('is-visible');
    }
  }
  toggle();
  window.addEventListener('scroll', toggle, { passive: true });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* --- Dynamic footer year ------------------------------------------------- */
function initFooterYear() {
  document.querySelectorAll('.js-year').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
}

/* --- Contact form validation (client-side only, no backend) --------------- */
function initContactForm() {
  var form = document.querySelector('.js-contact-form');
  if (!form) return;

  var successBox = form.querySelector('.form-success');

  var validators = {
    name: function (v) { return v.trim().length >= 2; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); },
    phone: function (v) { return v.trim() === '' || /^[+\d][\d\s\-()]{6,}$/.test(v.trim()); },
    service: function (v) { return v.trim() !== ''; },
    message: function (v) { return v.trim().length >= 10; }
  };

  function setError(field, show) {
    var group = field.closest('.form-group');
    if (!group) return;
    group.classList.toggle('has-error', show);
  }

  function validateField(field) {
    var name = field.name;
    if (!validators[name]) return true;
    var valid = validators[name](field.value);
    setError(field, !valid);
    return valid;
  }

  form.querySelectorAll('input, select, textarea').forEach(function (field) {
    field.addEventListener('blur', function () { validateField(field); });
    field.addEventListener('input', function () {
      if (field.closest('.form-group').classList.contains('has-error')) {
        validateField(field);
      }
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fields = form.querySelectorAll('input[name], select[name], textarea[name]');
    var allValid = true;

    fields.forEach(function (field) {
      if (!validateField(field)) allValid = false;
    });

    if (!allValid) {
      var firstError = form.querySelector('.has-error input, .has-error select, .has-error textarea');
      if (firstError) firstError.focus();
      return;
    }

    // This is a static site with no backend, so the form can't submit
    // anywhere on its own. Instead, build a pre-filled mailto: link from
    // the form fields and hand off to the visitor's own email app to
    // actually send it.
    var name = form.querySelector('#name').value.trim();
    var email = form.querySelector('#email').value.trim();
    var phone = form.querySelector('#phone').value.trim();
    var serviceSelect = form.querySelector('#service');
    var service = serviceSelect.options[serviceSelect.selectedIndex].text;
    var message = form.querySelector('#message').value.trim();

    var subject = 'Project inquiry: ' + service;
    var bodyLines = [
      'Name: ' + name,
      'Email: ' + email,
      'Phone: ' + (phone || 'Not provided'),
      'Service: ' + service,
      '',
      'Message:',
      message
    ];
    var mailtoLink = 'mailto:info@technsyntax.site'
      + '?subject=' + encodeURIComponent(subject)
      + '&body=' + encodeURIComponent(bodyLines.join('\n'));

    window.location.href = mailtoLink;

    if (successBox) {
      successBox.classList.add('is-visible');
      successBox.setAttribute('tabindex', '-1');
      successBox.focus();
      setTimeout(function () { successBox.classList.remove('is-visible'); }, 8000);
    }
    form.reset();
  });
}

/* --- Image placeholder fallback --------------------------------------------
   Every /images/*.webp file ships as an empty placeholder (per project
   spec). Rather than letting the browser show a broken-image icon, we
   catch the load failure and swap in a clean, on-brand placeholder box
   using the image's own container. Once real image files are added at
   the same paths, this never runs. ------------------------------------- */
function initImageFallbacks() {
  document.querySelectorAll('img').forEach(function (img) {
    // Skip the visually-hidden decorative hero image; it's intentionally
    // invisible and doesn't need a placeholder treatment.
    if (img.hasAttribute('aria-hidden')) return;

    function showFallback() {
      var container = img.parentElement;
      if (!container) return;
      var label = img.getAttribute('alt') || 'Image placeholder';
      container.setAttribute('data-img-label', label);
      container.classList.add('img-placeholder');
      img.style.display = 'none';
    }

    // Image already failed before listeners attached (e.g. cached 0-byte file).
    if (img.complete && img.naturalWidth === 0) {
      showFallback();
    } else {
      img.addEventListener('error', showFallback, { once: true });
    }
  });
}

/* --- Hero code panel typing effect ----------------------------------------- */
function initHeroCodeTyping() {
  var el = document.querySelector('.js-code-typing');
  if (!el) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.querySelectorAll('.code-cursor').forEach(function (c) { c.style.display = 'none'; });
    return;
  }
  // Static, pre-rendered markup already present; this hook is reserved
  // for future enhancement (e.g., re-triggering typing on view).
}
