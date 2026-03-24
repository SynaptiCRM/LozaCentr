/**
 * Генерація PDF каталогу 2026 з тих самих даних, що й лендінг (LOZACENTR_PRODUCTS).
 * Потрібен html2pdf.bundle (CDN) та відкриття сайту через http:// (не file://), щоб фото потрапили в PDF.
 */
(function () {
  "use strict";

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function formatPrices(prices) {
    return (prices || [])
      .map(function (x) {
        return x.label + ": " + x.amount + " грн";
      })
      .join(" · ");
  }

  function formatDims(d) {
    if (!d) {
      return "Розміри: уточнюйте у виробника.";
    }
    return (
      "Висота: " +
      d.heightCm +
      " см\n" +
      "З ручкою: " +
      d.heightWithHandleCm +
      " см\n" +
      "Довжина: " +
      d.lengthCm +
      " см\n" +
      "Ширина: " +
      d.widthCm +
      " см"
    );
  }

  function buildCard(p) {
    var prices = formatPrices(p.prices);
    var dims = formatDims(p.dimensions);
    var note = p.note ? '<p class="pdf-note">' + escapeHtml(p.note) + "</p>" : "";
    var pnote = p.priceNote ? '<p class="pdf-note">' + escapeHtml(p.priceNote) + "</p>" : "";
    var src = escapeHtml(p.image);
    return (
      '<div class="pdf-card">' +
      '<div class="pdf-card-img-wrap" data-pdf-img-wrap><img src="' +
      src +
      '" alt=""/></div>' +
      "<h2>Код " +
      escapeHtml(p.id) +
      "</h2>" +
      "<h3>" +
      escapeHtml(p.name) +
      "</h3>" +
      '<p class="pdf-prices">' +
      escapeHtml(prices) +
      "</p>" +
      '<p class="pdf-dims">' +
      escapeHtml(dims) +
      "</p>" +
      note +
      pnote +
      "</div>"
    );
  }

  function waitImages(root) {
    var imgs = root.querySelectorAll("img");
    var promises = [];
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        promises.push(
          new Promise(function (resolve) {
            function finish() {
              var wrap = img.closest("[data-pdf-img-wrap]");
              if ((!img.naturalWidth || img.naturalHeight === 0) && wrap) {
                wrap.classList.add("is-missing");
                wrap.innerHTML = '<span class="pdf-ph">?</span>';
              }
              resolve();
            }
            if (img.complete) {
              finish();
              return;
            }
            img.onload = finish;
            img.onerror = finish;
            setTimeout(finish, 10000);
          })
        );
      })(imgs[i]);
    }
    return Promise.all(promises);
  }

  window.generateLozaCentrCatalogPdf = async function () {
    var products = window.LOZACENTR_PRODUCTS || [];
    var root = document.getElementById("pdf-export-root");

    if (!root) {
      alert("Внутрішня помилка: не знайдено контейнер PDF.");
      return;
    }

    if (typeof html2pdf === "undefined") {
      alert(
        "Бібліотека PDF не завантажилась. Перевірте підключення до інтернету або спробуйте оновити сторінку."
      );
      return;
    }

    var now = new Date();
    var dateStr = now.toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    var cover =
      '<div class="pdf-cover">' +
      "<h1>LozaCentr</h1>" +
      '<p class="pdf-sub">Каталог виробів з лози · орієнтовні ціни та розміри (2026)</p>' +
      '<p class="pdf-meta">Сформовано з веб-каталогу · ' +
      escapeHtml(dateStr) +
      "</p>" +
      '<p class="pdf-meta">Ознайомчі матеріали. Для замовлення та уточнень — контакти на сайті.</p>' +
      "</div>";

    var cards = products.map(buildCard).join("");
    root.innerHTML = cover + '<div class="pdf-grid">' + cards + "</div>";

    await waitImages(root);

    root.classList.add("is-pdf-active");

    var opt = {
      margin: [10, 10, 10, 10],
      filename: "LozaCentr-katalog-2026.pdf",
      image: { type: "jpeg", quality: 0.88 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: "#fafafa",
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    try {
      await html2pdf().set(opt).from(root).save();
    } catch (e) {
      console.error(e);
      alert(
        "Не вдалося створити PDF. Відкрийте сайт через локальний сервер (наприклад Live Server), а не як файл з диска — інакше браузер може блокувати зображення в PDF."
      );
    } finally {
      root.classList.remove("is-pdf-active");
      root.innerHTML = "";
    }
  };
})();
