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

    var note = p.note
      ? '<p class="catalog-note" role="status">' + escapeHtml(p.note) + "</p>"
      : "";
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
      '<div class="product-code">Код ' +
      escapeHtml(p.id) +
      "</div>" +
      '<h2 class="product-name">' +
      escapeHtml(p.name) +
      "</h2>" +
      note +
      '<div class="price-tags">' +
      prices +
      "</div>" +
      priceNote +
      (specs || noSpecs) +
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
      bindCardGlow(card);
      bindMediaTilt(card);
    });
    grid.querySelectorAll(".product-media img").forEach(bindImgFallback);
  }

  function bindImgFallback(img) {
    img.addEventListener("error", function () {
      this.style.display = "none";
      var wrap = this.closest("[data-img-wrap]");
      if (wrap) wrap.classList.add("is-placeholder");
    });
  }

  function bindCardGlow(card) {
    card.addEventListener(
      "pointermove",
      function (e) {
        var r = card.getBoundingClientRect();
        var x = ((e.clientX - r.left) / r.width) * 100;
        var y = ((e.clientY - r.top) / r.height) * 100;
        card.style.setProperty("--mx", x + "%");
        card.style.setProperty("--my", y + "%");
      },
      { passive: true }
    );
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
          "rotateY(" + (px * 11).toFixed(2) + "deg) rotateX(" + (-py * 9).toFixed(2) + "deg)";
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

  function wrapKineticTitle() {
    var el = document.getElementById("hero-kinetic-title");
    if (!el) return;
    var text = el.textContent;
    el.textContent = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === " ") {
        el.appendChild(document.createTextNode(" "));
        continue;
      }
      var span = document.createElement("span");
      span.textContent = ch;
      span.style.animationDelay = (i * 0.04).toFixed(2) + "s";
      el.appendChild(span);
    }
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
  wrapKineticTitle();
  initPdfButton();
  render(products);
})();
