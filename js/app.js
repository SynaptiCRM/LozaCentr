(function () {
  "use strict";

  var products = window.LOZACENTR_PRODUCTS || [];
  var grid = document.getElementById("products-grid");
  var search = document.getElementById("catalog-search");
  var countEl = document.getElementById("result-count");
  var searchToggle = document.getElementById("search-toggle");
  var searchPanel = document.getElementById("search-panel");
  var pdfBtn = document.getElementById("btn-pdf-catalog");

  function norm(s) {
    return (s || "").toString().toLowerCase().trim();
  }

  function formatDims(d) {
    if (!d) return null;
    return [
      ["Висота", d.heightCm + " см"],
      ["З ручкою", d.heightWithHandleCm + " см"],
      ["Довжина", d.lengthCm + " см"],
      ["Ширина", d.widthCm + " см"],
    ];
  }

  function priceTagsHTML(prices) {
    var list = prices || [];
    return list
      .map(function (x, i) {
        var hi = i === 0 ? " price-tag--highlight" : "";
        return (
          '<span class="price-tag' +
          hi +
          '"><span>' +
          x.label +
          "</span><strong>" +
          x.amount +
          " грн</strong></span>"
        );
      })
      .join("");
  }

  function cardHTML(p) {
    var dims = formatDims(p.dimensions);
    var specsBlock =
      dims &&
      "<dl>" +
      dims
        .map(function (kv) {
          return "<dt>" + kv[0] + ":</dt><dd>" + kv[1] + "</dd>";
        })
        .join("") +
      "</dl>";

    var prices = priceTagsHTML(p.prices);

    var note = "";
    var priceNote = p.priceNote
      ? '<p class="price-note">' + escapeHtml(p.priceNote) + "</p>"
      : "";

    var specs =
      dims &&
      '<details class="specs">' +
      "<summary>Характеристики</summary>" +
      '<div class="specs-inner">' +
      specsBlock +
      "</div>" +
      "</details>";

    var noSpecs = !dims && '<p class="price-note">Розміри уточнюйте у виробника.</p>';

    return (
      '<article class="product-card" data-code="' +
      escapeAttr(p.id) +
      '">' +
      '<div class="product-media" data-img-wrap>' +
      '<div class="product-media-tilt">' +
      '<img src="' +
      escapeAttr(p.image) +
      '" alt="' +
      escapeAttr(p.name) +
      '" loading="lazy" width="400" height="400" />' +
      "</div>" +
      "</div>" +
      '<div class="product-body">' +
      '<div class="product-head">' +
      '<div class="product-code">Код ' +
      escapeHtml(p.id) +
      "</div>" +
      '<h2 class="product-name">' +
      escapeHtml(p.name) +
      "</h2>" +
      note +
      "</div>" +
      '<div class="product-foot">' +
      '<div class="price-tags">' +
      prices +
      "</div>" +
      priceNote +
      '<div class="product-specs-area">' +
      (specs || noSpecs) +
      "</div>" +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function escapeHtml(t) {
    var d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
  }

  function escapeAttr(t) {
    return String(t)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function filterList(q) {
    var n = norm(q);
    if (!n) return products.slice();
    return products.filter(function (p) {
      var hay = norm(p.id + " " + p.name);
      return hay.includes(n);
    });
  }

  function render(list) {
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML =
        '<p class="empty-state">Нічого не знайдено. Спробуйте інший код або назву.</p>';
      if (countEl) countEl.textContent = "0 позицій";
      return;
    }
    grid.innerHTML = list.map(cardHTML).join("");
    if (countEl) countEl.textContent = list.length + " позицій";
    grid.querySelectorAll(".product-card").forEach(function (card) {
      bindMediaTilt(card);
    });
    grid.querySelectorAll(".product-media img").forEach(bindImgFallback);
    initCardScrollAnimations();
  }

  function bindImgFallback(img) {
    img.addEventListener("error", function () {
      this.style.display = "none";
      var wrap = this.closest("[data-img-wrap]");
      if (wrap) wrap.classList.add("is-placeholder");
    });
  }

  function bindMediaTilt(card) {
    var media = card.querySelector(".product-media");
    var tilt = card.querySelector(".product-media-tilt");
    if (!media || !tilt) return;

    card.addEventListener(
      "pointermove",
      function (e) {
        if (media.classList.contains("is-placeholder")) {
          tilt.style.transform = "";
          return;
        }
        var r = media.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.transform =
          "rotateY(" + (px * 8).toFixed(2) + "deg) rotateX(" + (-py * 6).toFixed(2) + "deg)";
      },
      { passive: true }
    );

    card.addEventListener("pointerleave", function () {
      tilt.style.transform = "";
    });
  }

  function onSearch() {
    if (!search) return;
    render(filterList(search.value));
  }

  if (search) {
    search.addEventListener("input", onSearch);
    search.addEventListener("search", onSearch);
  }

  function initSearchToggle() {
    if (!searchToggle || !searchPanel || !search) return;

    function setOpen(open) {
      searchToggle.setAttribute("aria-expanded", open ? "true" : "false");
      searchToggle.setAttribute("aria-label", open ? "Закрити пошук" : "Відкрити пошук");
      if (open) {
        searchPanel.removeAttribute("hidden");
        requestAnimationFrame(function () {
          search.focus();
        });
      } else {
        searchPanel.setAttribute("hidden", "");
        search.value = "";
        render(products);
      }
    }

    var open = false;
    searchToggle.addEventListener("click", function () {
      open = !open;
      setOpen(open);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && open) {
        open = false;
        setOpen(false);
      }
    });
  }

  function initHeroAnimation() {
    var ctaBlock = document.querySelector(".hero-cta-block");
    var title = document.getElementById("hero-kinetic-title");
    var lead = document.querySelector(".hero-lead");
    var actions = document.querySelector(".hero-actions");

    if (!ctaBlock || typeof gsap === "undefined") {
      if (ctaBlock) ctaBlock.classList.add("is-visible");
      return;
    }

    gsap.set(ctaBlock, { opacity: 1 });
    gsap.set([title, lead, actions], { opacity: 0, y: 28 });

    gsap.to(title, {
      opacity: 1,
      y: 0,
      duration: 1.1,
      ease: "power3.out",
      delay: 0.2,
    });
    gsap.to(lead, {
      opacity: 1,
      y: 0,
      duration: 0.95,
      ease: "power3.out",
      delay: 0.45,
    });
    gsap.to(actions, {
      opacity: 1,
      y: 0,
      duration: 0.85,
      ease: "power3.out",
      delay: 0.65,
    });
  }

  function initCardScrollAnimations() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    var cards = grid.querySelectorAll(".product-card");
    if (!cards.length) return;

    gsap.set(cards, { opacity: 0, y: 40 });

    ScrollTrigger.batch(cards, {
      onEnter: function (batch) {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          stagger: 0.08,
        });
      },
      start: "top 92%",
      once: true,
    });
  }

  function initPdfButton() {
    if (!pdfBtn || typeof window.generateLozaCentrCatalogPdf !== "function") return;
    pdfBtn.addEventListener("click", function () {
      if (pdfBtn.disabled) return;
      pdfBtn.disabled = true;
      pdfBtn.classList.add("is-loading");
      pdfBtn.setAttribute("aria-busy", "true");
      Promise.resolve()
        .then(function () {
          return window.generateLozaCentrCatalogPdf();
        })
        .finally(function () {
          pdfBtn.disabled = false;
          pdfBtn.classList.remove("is-loading");
          pdfBtn.setAttribute("aria-busy", "false");
        });
    });
  }

  initSearchToggle();
  initHeroAnimation();
  initPdfButton();
  render(products);
})();
