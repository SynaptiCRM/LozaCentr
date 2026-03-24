/**
 * PDF-каталог з даних LOZACENTR_PRODUCTS (pdfmake: текст + вбудовані зображення, без html2canvas).
 */
(function () {
  "use strict";

  var MM10_PT = (10 * 72) / 25.4;
  var PAGE_W_PT = 595.28;
  var INNER_W_PT = PAGE_W_PT - 2 * MM10_PT;
  /** Заглушка в репозиторії: images/image-stub.png */
  var IMAGE_STUB_REL = "images/image-stub.png";

  function ensurePdfFonts() {
    if (typeof pdfMake === "undefined") return;
    if (!pdfMake.fonts || !pdfMake.fonts.Roboto) {
      pdfMake.fonts = {
        Roboto: {
          normal: "Roboto-Regular.ttf",
          bold: "Roboto-Medium.ttf",
          italics: "Roboto-Italic.ttf",
          bolditalics: "Roboto-MediumItalic.ttf",
        },
      };
    }
  }

  function sortProducts(products) {
    return products.slice().sort(function (a, b) {
      var na = parseFloat(String(a.id).replace(/[^0-9.]/g, "")) || 0;
      var nb = parseFloat(String(b.id).replace(/[^0-9.]/g, "")) || 0;
      return na - nb;
    });
  }

  function getPrimaryPrice(prices) {
    var list = prices || [];
    if (!list.length) return "Ціну уточнюйте";
    return list
      .map(function (x) {
        return x.label + " " + x.amount + " грн";
      })
      .join(" · ");
  }

  function resolveImageUrl(relPath) {
    try {
      return new URL(relPath, window.location.href).href;
    } catch (e) {
      return relPath;
    }
  }

  function fetchImageDataUrl(url) {
    return fetch(url, { mode: "cors", credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.blob();
      })
      .then(function (blob) {
        return new Promise(function (resolve, reject) {
          var fr = new FileReader();
          fr.onload = function () {
            resolve(fr.result);
          };
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
      });
  }

  function chunkArray(arr, size) {
    var out = [];
    for (var i = 0; i < arr.length; i += size) {
      out.push(arr.slice(i, i + size));
    }
    return out;
  }

  function padBatchToFour(batch) {
    var b = batch.slice();
    while (b.length < 4) {
      b.push(null);
    }
    return b;
  }

  function dimsBlock(d) {
    if (!d) {
      return {
        text: "Розміри: уточнюйте у виробника.",
        style: "dimMissing",
        margin: [0, 2, 0, 0],
      };
    }
    return {
      margin: [0, 2, 0, 0],
      table: {
        widths: ["*", "*"],
        body: [
          [
            { text: "Висота: " + d.heightCm + " см", style: "dimCell" },
            { text: "З ручкою: " + d.heightWithHandleCm + " см", style: "dimCell" },
          ],
          [
            { text: "Довжина: " + d.lengthCm + " см", style: "dimCell" },
            { text: "Ширина: " + d.widthCm + " см", style: "dimCell" },
          ],
        ],
      },
      layout: "noBorders",
    };
  }

  function productCell(p, imgDataUrl) {
    if (!p) {
      return { width: "*", text: "" };
    }
    var stack = [];
    if (imgDataUrl) {
      stack.push({
        image: imgDataUrl,
        width: 230,
        height: 88,
        fit: [230, 88],
        alignment: "center",
        margin: [0, 0, 0, 6],
      });
    } else {
      stack.push({
        text: "Фото недоступне",
        style: "noPhoto",
        alignment: "center",
        margin: [0, 28, 0, 28],
      });
    }
    stack.push({ text: "Код " + p.id, style: "code" });
    stack.push({ text: p.name, style: "pname" });
    stack.push({ text: getPrimaryPrice(p.prices), style: "prices" });
    stack.push(dimsBlock(p.dimensions));
    if (p.note) {
      stack.push({ text: p.note, style: "note" });
    }
    if (p.priceNote) {
      stack.push({ text: p.priceNote, style: "note" });
    }
    return {
      width: "*",
      table: {
        widths: ["*"],
        body: [[{ stack: stack, margin: [6, 6, 6, 6] }]],
      },
      layout: {
        hLineWidth: function () {
          return 0.5;
        },
        vLineWidth: function () {
          return 0.5;
        },
        hLineColor: function () {
          return "#e2dcd2";
        },
        vLineColor: function () {
          return "#e2dcd2";
        },
        fillColor: function () {
          return "#ffffff";
        },
        paddingLeft: function () {
          return 0;
        },
        paddingRight: function () {
          return 0;
        },
        paddingTop: function () {
          return 0;
        },
        paddingBottom: function () {
          return 0;
        },
      },
    };
  }

  function headerLine() {
    return {
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: INNER_W_PT,
          y2: 0,
          lineWidth: 0.75,
          lineColor: "#c8c2b6",
        },
      ],
      margin: [0, 6, 0, 8],
    };
  }

  function fullHeader() {
    return [
      {
        columns: [
          { text: "LozaCentr", style: "brand", width: "auto" },
          {
            text: "lozacentr@gmail.com    +380 (97) 579 78 33",
            style: "contacts",
            alignment: "right",
            width: "*",
          },
        ],
        margin: [0, 0, 0, 4],
      },
      headerLine(),
      {
        text: "Вироби з лози ручної роботи",
        style: "title",
        alignment: "center",
        margin: [0, 0, 0, 4],
      },
      {
        text: "Ознайомчий каталог: фото, коди, розміри та ціни.",
        style: "subtitle",
        alignment: "center",
        margin: [0, 0, 0, 12],
      },
    ];
  }

  function compactHeader() {
    return [
      {
        columns: [
          { text: "LozaCentr", style: "brandSmall", width: "auto" },
          {
            text: "lozacentr@gmail.com  ·  +380 (97) 579 78 33",
            style: "contacts",
            alignment: "right",
            width: "*",
          },
        ],
        margin: [0, 0, 0, 8],
      },
      headerLine(),
    ];
  }

  function buildPageBlock(batch, imgById, pageIndex) {
    var four = padBatchToFour(batch);
    var cells = four.map(function (p) {
      return productCell(p, p ? imgById[p.id] : null);
    });
    var head = pageIndex === 0 ? fullHeader() : compactHeader();
    return {
      stack: head.concat([
        {
          columns: [cells[0], cells[1]],
          columnGap: 10,
        },
        {
          columns: [cells[2], cells[3]],
          columnGap: 10,
          margin: [0, 10, 0, 0],
        },
      ]),
      pageBreak: pageIndex > 0 ? "before" : undefined,
    };
  }

  window.generateLozaCentrCatalogPdf = async function () {
    var overlay = document.getElementById("pdf-loading-overlay");

    if (typeof pdfMake === "undefined") {
      alert(
        "Бібліотека pdfmake не завантажилась. Перевірте інтернет і оновіть сторінку."
      );
      return;
    }

    ensurePdfFonts();

    if (!pdfMake.vfs || Object.keys(pdfMake.vfs).length === 0) {
      alert(
        "Шрифти PDF не ініціалізовані. Переконайтесь, що підключено vfs_fonts.min.js після pdfmake."
      );
      return;
    }

    var raw = window.LOZACENTR_PRODUCTS || [];
    var products = sortProducts(raw);

    if (overlay) {
      overlay.style.display = "flex";
    }

    try {
      var imgById = {};
      await Promise.all(
        products.map(function (p) {
          var u = resolveImageUrl(p.image);
          return fetchImageDataUrl(u)
            .then(function (data) {
              imgById[p.id] = data;
            })
            .catch(function () {
              imgById[p.id] = null;
            });
        })
      );

      var stubData = null;
      try {
        stubData = await fetchImageDataUrl(resolveImageUrl(IMAGE_STUB_REL));
      } catch (e) {
        stubData = null;
      }
      if (stubData) {
        products.forEach(function (p) {
          if (!imgById[p.id]) {
            imgById[p.id] = stubData;
          }
        });
      }

      var batches = chunkArray(products, 4);
      var content = batches.map(function (batch, idx) {
        return buildPageBlock(batch, imgById, idx);
      });

      var docDefinition = {
        pageSize: "A4",
        pageOrientation: "portrait",
        pageMargins: [MM10_PT, MM10_PT, MM10_PT, MM10_PT],
        defaultStyle: {
          font: "Roboto",
          fontSize: 9,
          color: "#1f2e22",
        },
        pageBackground: function (currentPage, pageSize) {
          return [
            {
              canvas: [
                {
                  type: "rect",
                  x: 0,
                  y: 0,
                  w: pageSize.width,
                  h: pageSize.height,
                  color: "#f4efe5",
                },
              ],
            },
          ];
        },
        styles: {
          brand: { fontSize: 22, bold: true, color: "#1f2e22" },
          brandSmall: { fontSize: 16, bold: true, color: "#1f2e22" },
          contacts: { fontSize: 8, color: "#5e7262" },
          title: { fontSize: 17, italics: true, color: "#1f2e22" },
          subtitle: { fontSize: 9, color: "#667a6a" },
          code: {
            fontSize: 8,
            bold: true,
            color: "#456b51",
            margin: [0, 2, 0, 2],
          },
          pname: { fontSize: 10, bold: true, margin: [0, 0, 0, 2] },
          prices: { fontSize: 8, color: "#304437", margin: [0, 0, 0, 2] },
          dimCell: { fontSize: 7, color: "#304437" },
          dimMissing: { fontSize: 7, color: "#526558" },
          note: { fontSize: 7, color: "#85673c", margin: [0, 2, 0, 0] },
          noPhoto: { fontSize: 8, color: "#95a89a", italics: true },
        },
        content: content,
      };

      pdfMake.createPdf(docDefinition).download("LozaCentr_Catalog_2026.pdf");
    } catch (e) {
      console.error("PDF Generation Error:", e);
      alert(
        "Не вдалося створити PDF. Відкрийте сайт через http://localhost (не file://), щоб завантажувались фото з папки images."
      );
    } finally {
      if (overlay) {
        overlay.style.display = "none";
      }
    }
  };
})();
