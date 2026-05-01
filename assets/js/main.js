// 1:90 Align — Shared JavaScript

document.addEventListener('DOMContentLoaded', function () {
  // ─── Mobile Menu Toggle ──────────────────────────────────────────
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuIconOpen = document.getElementById('menu-icon-open');
  const menuIconClose = document.getElementById('menu-icon-close');

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function () {
      const isOpen = mobileMenu.classList.toggle('open');
      // Update aria-expanded for screen readers
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
      if (menuIconOpen) menuIconOpen.classList.toggle('hidden');
      if (menuIconClose) menuIconClose.classList.toggle('hidden');
    });
  }

  // ─── Mobile Accordion Sub-menus ─────────────────────────────────
  document.querySelectorAll('.mobile-group-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const sub = this.nextElementSibling;
      if (sub) {
        const isExpanded = sub.classList.toggle('hidden') === false;
        // Update aria-expanded for screen readers
        this.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        const arrow = this.querySelector('.arrow');
        if (arrow) arrow.classList.toggle('rotate-180');
      }
    });
    // Set initial aria-expanded state
    btn.setAttribute('aria-expanded', 'false');
  });

  // ─── Scroll Animations ───────────────────────────────────────────
  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.fade-up, .fade-left, .fade-in').forEach(function (el) {
    observer.observe(el);
  });

  // ─── Calendly Modal ─────────────────────────────────────────────
  const calendlyModal = document.getElementById('calendly-modal');
  const calendlyClose = document.getElementById('calendly-close');
  const calendlyContainer = document.getElementById('calendly-container');

  function openCalendly() {
    if (!calendlyModal) return;
    calendlyModal.classList.add('open');

    // Init Calendly widget if not already done
    if (calendlyContainer && !calendlyContainer.dataset.loaded) {
      calendlyContainer.dataset.loaded = 'true';
      if (window.Calendly) {
        window.Calendly.initInlineWidget({
          url: 'https://calendly.com/190align/15min',
          parentElement: calendlyContainer,
          prefill: {},
          utm: {}
        });
      } else {
        // Fallback: load the script then init
        var s = document.createElement('script');
        s.src = 'https://assets.calendly.com/assets/external/widget.js';
        s.onload = function () {
          window.Calendly.initInlineWidget({
            url: 'https://calendly.com/190align/15min',
            parentElement: calendlyContainer
          });
        };
        document.head.appendChild(s);
      }
    }
  }

  function closeCalendly() {
    if (calendlyModal) calendlyModal.classList.remove('open');
  }

  // Book Now buttons
  document.querySelectorAll('.open-calendly').forEach(function (btn) {
    btn.addEventListener('click', openCalendly);
  });

  if (calendlyClose) {
    calendlyClose.addEventListener('click', closeCalendly);
  }

  if (calendlyModal) {
    calendlyModal.addEventListener('click', function (e) {
      if (e.target === calendlyModal) closeCalendly();
    });
  }

  // ─── Interactive Framework ───────────────────────────────────────
  document.querySelectorAll('.framework-item').forEach(function (item) {
    item.addEventListener('click', function () {
      const expand = this.querySelector('.framework-expand');
      const isOpen = expand && expand.classList.contains('open');
      const plusIcon = this.querySelector('.plus-icon');
      const xIcon = this.querySelector('.x-icon');
      const activeTag = this.querySelector('.active-tag');

      // Close all
      document.querySelectorAll('.framework-item').forEach(function (fi) {
        fi.querySelector('.framework-expand')?.classList.remove('open');
        fi.classList.remove('border-orange-500', 'bg-blue-950', 'text-white');
        fi.classList.add('border-blue-950', 'bg-white');
        fi.querySelector('.plus-icon')?.classList.remove('hidden');
        fi.querySelector('.x-icon')?.classList.add('hidden');
        fi.querySelector('.active-tag')?.classList.add('hidden');
        const iconBox = fi.querySelector('.icon-box');
        if (iconBox) {
          iconBox.classList.remove('border-white', 'bg-orange-500', 'rotate-3');
          iconBox.classList.add('border-blue-950', 'bg-gray-100');
        }
      });

      // Toggle this one
      if (!isOpen && expand) {
        expand.classList.add('open');
        this.classList.add('border-orange-500', 'bg-blue-950', 'text-white');
        this.classList.remove('border-blue-950', 'bg-white');
        if (plusIcon) plusIcon.classList.add('hidden');
        if (xIcon) xIcon.classList.remove('hidden');
        if (activeTag) activeTag.classList.remove('hidden');
        const iconBox = this.querySelector('.icon-box');
        if (iconBox) {
          iconBox.classList.add('border-white', 'bg-orange-500', 'rotate-3');
          iconBox.classList.remove('border-blue-950', 'bg-gray-100');
        }
      }
    });
  });

  // ─── Currency Switcher ───────────────────────────────────────────
  const currencySelect = document.getElementById('currency-select');
  if (currencySelect) {
    const currencies = {
      'UK':           { symbol: '£', rate: 1 },
      'USA':          { symbol: '$', rate: 1.27 },
      'Canada':       { symbol: '$', rate: 1.73 },
      'South Africa': { symbol: 'R', rate: 23.5 },
      'Australia':    { symbol: '$', rate: 1.92 },
      'New Zealand':  { symbol: '$', rate: 2.06 }
    };

    function updatePrices(country) {
      const c = currencies[country] || currencies['UK'];
      document.querySelectorAll('[data-gbp]').forEach(function (el) {
        const gbp = parseFloat(el.dataset.gbp);
        const converted = Math.round(gbp * c.rate);
        el.textContent = c.symbol + converted.toLocaleString();
      });
    }

    currencySelect.addEventListener('change', function () {
      updatePrices(this.value);
    });

    updatePrices('UK');
  }

  // ─── Contact Form (Formspree) ────────────────────────────────────
  document.querySelectorAll('.contact-form').forEach(function (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      const successDiv = document.getElementById(form.dataset.success);
      const originalText = btn ? btn.innerHTML : '';

      // Honeypot check
      const honeypot = form.querySelector('[name="website"], [name="_gotcha"]');
      if (honeypot && honeypot.value) return; // bot

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="label">Sending...</span>';
      }

      try {
        const data = new FormData(form);
        const res = await fetch(form.action, {
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          form.style.display = 'none';
          if (successDiv) {
            successDiv.classList.remove('hidden');
            successDiv.classList.add('visible');
          }
        } else {
          alert('Failed to send message. Please try again or email us directly at contact@190align.com');
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
          }
        }
      } catch (err) {
        alert('Failed to send message. Please try again or email us directly at contact@190align.com');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }
    });
  });

});
