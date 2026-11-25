/* Studio Halvøy — interactions
   Overlay menu, section indicator, hero parallax, draggable project
   gallery with line-drawing reveals, project filter. No dependencies. */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad2 = (n) => String(n).padStart(2, "0");

  /* ------------------------------------------------------------ header */

  const header = document.querySelector("[data-header]");
  const onScrollHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 40);
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* -------------------------------------------------------- overlay menu */

  const menu = document.querySelector("[data-menu]");
  const openButton = document.querySelector("[data-menu-open]");
  const closeButton = document.querySelector("[data-menu-close]");
  const MENU_MS = reduceMotion ? 0 : 700;
  let closeTimer = 0;

  const focusables = () => [...menu.querySelectorAll("a, button")];

  function openMenu() {
    window.clearTimeout(closeTimer);
    menu.hidden = false;
    document.body.classList.add("menu-locked");
    openButton.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => {
      menu.classList.add("is-open");
      closeButton.focus();
    });
  }

  function closeMenu({ restoreFocus = true } = {}) {
    menu.classList.remove("is-open");
    openButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-locked");
    closeTimer = window.setTimeout(() => {
      menu.hidden = true;
    }, MENU_MS);
    if (restoreFocus) openButton.focus();
  }

  openButton.addEventListener("click", openMenu);
  closeButton.addEventListener("click", () => closeMenu());

  menu.addEventListener("click", (event) => {
    if (event.target.closest("a[href^='#']")) closeMenu({ restoreFocus: false });
  });

  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusables();
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* --------------------------------------------------- section indicator */

  const indicatorNum = document.querySelector("[data-indicator-num]");
  const indicatorName = document.querySelector("[data-indicator-name]");
  const sections = document.querySelectorAll("[data-section]");

  function setIndicator(section) {
    if (indicatorNum.textContent === section.dataset.section) return;
    indicatorNum.textContent = section.dataset.section;
    indicatorName.textContent = section.dataset.name;
    [indicatorNum, indicatorName].forEach((el) => {
      el.classList.remove("is-changing");
      void el.offsetWidth;
      el.classList.add("is-changing");
    });
  }

  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setIndicator(entry.target)),
      { rootMargin: "-45% 0px -54% 0px" }
    );
    sections.forEach((section) => sectionObserver.observe(section));
  }

  /* ------------------------------------------------- fit the hero word */

  // Scale the giant wordmark so its letters span exactly the content width.
  const heroWord = document.querySelector(".hero-word");

  function fitHeroWord() {
    heroWord.style.fontSize = "";
    const range = document.createRange();
    range.selectNodeContents(heroWord);
    const textWidth = range.getBoundingClientRect().width;
    const available = heroWord.parentElement.getBoundingClientRect().width;
    if (!textWidth || !available) return;
    const size = parseFloat(getComputedStyle(heroWord).fontSize);
    heroWord.style.fontSize = `${((size * available) / textWidth).toFixed(2)}px`;
  }

  fitHeroWord();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHeroWord);
  window.addEventListener("resize", fitHeroWord);

  /* ------------------------------------------------------ hero parallax */

  const layers = [...document.querySelectorAll(".layer[data-speed]")];
  const hero = document.querySelector(".hero");
  let parallaxQueued = false;

  function applyParallax() {
    parallaxQueued = false;
    const y = window.scrollY;
    if (y > hero.offsetHeight) return;
    layers.forEach((layer) => {
      layer.style.transform = `translateY(${y * Number(layer.dataset.speed)}px)`;
    });
  }

  if (!reduceMotion) {
    window.addEventListener(
      "scroll",
      () => {
        if (!parallaxQueued) {
          parallaxQueued = true;
          requestAnimationFrame(applyParallax);
        }
      },
      { passive: true }
    );
  }

  /* ------------------------------------------------------ project gallery */

  const gallery = document.querySelector("[data-gallery]");
  const cards = [...gallery.querySelectorAll(".project-card")];
  const prev = document.querySelector("[data-gallery-prev]");
  const next = document.querySelector("[data-gallery-next]");
  const position = document.querySelector("[data-gallery-pos]");
  const bar = document.querySelector("[data-gallery-bar]");

  const cardStep = () => {
    const gap = parseFloat(getComputedStyle(gallery.querySelector(".gallery-track")).columnGap) || 0;
    return cards[0].getBoundingClientRect().width + gap;
  };

  function updateGallery() {
    const max = gallery.scrollWidth - gallery.clientWidth;
    const progress = max > 0 ? gallery.scrollLeft / max : 0;
    const visibleShare = gallery.clientWidth / gallery.scrollWidth;
    bar.style.width = `${Math.max(visibleShare, 0.08) * 100 + progress * (1 - visibleShare) * 100}%`;
    const index = Math.min(cards.length - 1, Math.round(gallery.scrollLeft / cardStep()));
    position.textContent = pad2(index + 1);
    prev.disabled = gallery.scrollLeft <= 2;
    next.disabled = gallery.scrollLeft >= max - 2;
  }

  const scrollByCards = (direction) =>
    gallery.scrollBy({ left: direction * cardStep(), behavior: reduceMotion ? "auto" : "smooth" });

  prev.addEventListener("click", () => scrollByCards(-1));
  next.addEventListener("click", () => scrollByCards(1));
  gallery.addEventListener("scroll", updateGallery, { passive: true });
  window.addEventListener("resize", updateGallery);

  gallery.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByCards(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByCards(-1);
    }
  });

  // Drag to scroll with a mouse (touch already scrolls natively).
  let drag = null;
  gallery.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag = { x: event.clientX, left: gallery.scrollLeft, moved: false };
  });
  window.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 4) {
      drag.moved = true;
      gallery.classList.add("is-dragging");
    }
    if (drag.moved) gallery.scrollLeft = drag.left - dx;
  });
  window.addEventListener("pointerup", () => {
    if (!drag) return;
    const wasDragging = drag.moved;
    drag = null;
    if (!wasDragging) return;
    gallery.classList.remove("is-dragging");
    // Snap to the nearest card once the drag ends.
    const target = Math.round(gallery.scrollLeft / cardStep()) * cardStep();
    gallery.scrollTo({ left: target, behavior: reduceMotion ? "auto" : "smooth" });
  });
  gallery.addEventListener("dragstart", (event) => event.preventDefault());

  updateGallery();

  // Line-drawing reveal: each stroke draws itself the first time a card is seen.
  const figures = [...document.querySelectorAll(".project-figure")];
  figures.forEach((figure) => {
    figure.querySelectorAll(".draw").forEach((path) => {
      const length = Math.ceil(path.getTotalLength());
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = reduceMotion ? "0" : `${length}`;
    });
    if (reduceMotion) figure.classList.add("is-drawn");
  });

  function drawFigure(figure) {
    figure.classList.add("is-drawn");
    figure.querySelectorAll(".draw").forEach((path) => {
      path.style.strokeDashoffset = "0";
    });
  }

  if ("IntersectionObserver" in window && !reduceMotion) {
    const drawObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          drawFigure(entry.target);
          drawObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.35 }
    );
    figures.forEach((figure) => drawObserver.observe(figure));
  } else {
    figures.forEach(drawFigure);
  }

  /* ---------------------------------------------------------- project index */

  const filters = [...document.querySelectorAll("[data-filter]")];
  const rows = [...document.querySelectorAll("[data-index-body] .index-row")];
  const count = document.querySelector("[data-index-count]");
  const FADE_MS = reduceMotion ? 0 : 280;
  let filterTimer = 0;

  function applyFilter(type) {
    filters.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.filter === type)));
    const matches = (row) => type === "all" || row.dataset.type === type;

    window.clearTimeout(filterTimer);
    rows.forEach((row) => {
      if (!matches(row) && !row.hidden) row.classList.add("is-leaving");
    });

    filterTimer = window.setTimeout(() => {
      rows.forEach((row) => {
        row.classList.remove("is-leaving");
        if (matches(row)) {
          if (row.hidden) {
            row.hidden = false;
            row.classList.add("is-entering");
            requestAnimationFrame(() => requestAnimationFrame(() => row.classList.remove("is-entering")));
          }
        } else {
          row.hidden = true;
        }
      });
    }, FADE_MS);

    const shown = rows.filter(matches).length;
    count.textContent =
      type === "all" ? `Showing all ${rows.length} projects` : `Showing ${shown} of ${rows.length} projects`;
  }

  filters.forEach((button) => button.addEventListener("click", () => applyFilter(button.dataset.filter)));

  /* ------------------------------------------------------ reveal on scroll */

  const revealTargets = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
    );
    revealTargets.forEach((el) => revealObserver.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  }

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
