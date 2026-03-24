/**
 * PDF-каталог з даних LOZACENTR_PRODUCTS (pdfmake).
 * Візуально узгоджено з CSS сайту: --bg-alt, --bg-card, цінові теги, блок характеристик.
 */
(function () {
  "use strict";

  var MM10_PT = (10 * 72) / 25.4;
  var PAGE_W_PT = 595.28;
  var INNER_W_PT = PAGE_W_PT - 2 * MM10_PT;
  var IMAGE_STUB_REL = "images/image-stub.png";

  var C = {
    bg: "#f4efe5",
    bgAlt: "#ece7dc",
    bgCard: "#faf8f4",
    text: "#1f2e22",
    textMuted: "#687a6c",
    textLight: "#96a898",
    accent: "#456b51",
    accentHover: "#2e4f3a",
    accentLight: "#eaf1eb",
    border: "#d5cec4",
    borderCard: "#e6e0d6",
    priceHiBorder: "#7a9b87",
  };

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

  function codeBadgePdf(id) {
    return {
      margin: [0, 0, 0, 6],
      table: {
        widths: ["auto"],
        body: [
          [
            {
              text: "КОД " + id,
              style: "codeInner",
              margin: [5, 4, 5, 4],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: function () {
          return 0.5;
        },
        vLineWidth: function () {
          return 0.5;
        },
        hLineColor: function () {
          return "rgba(69, 107, 81, 0.22)";
        },
        vLineColor: function () {
          return "rgba(69, 107, 81, 0.22)";
        },
        fillColor: function () {
          return C.accentLight;
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

  /** Скільки рядків сітки 2×N займають ціни (для вирівнювання пари карток). */
  function priceTagBodyRowCount(prices) {
    var list = prices || [];
    if (!list.length) {
      return 1;
    }
    return Math.ceil(list.length / 2);
  }

  function noteBlockCount(p) {
    if (!p) {
      return 0;
    }
    return (p.note ? 1 : 0) + (p.priceNote ? 1 : 0);
  }

  /** Рядки вмісту в блоці характеристик (без заголовка «Характеристики»). */
  function specsContentLines(p) {
    if (!p) {
      return 0;
    }
    return p.dimensions ? 4 : 1;
  }

  function priceTagCell(x, index) {
    if (!x) {
      return { text: "" };
    }
    var hi = index === 0;
    return {
      stack: [
        {
          text: x.label,
          style: hi ? "ptLabelHi" : "ptLabel",
          alignment: "center",
        },
        {
          text: x.amount + " грн",
          style: hi ? "ptAmtHi" : "ptAmt",
          alignment: "center",
        },
      ],
      margin: [4, 6, 4, 6],
      fillColor: hi ? "#ffffff" : C.bgAlt,
      border: [true, true, true, true],
      borderColor: hi ? C.priceHiBorder : C.borderCard,
      borderWidth: hi ? 0.85 : 0.35,
    };
  }

  function priceTagsPlaceholderRow() {
    var spacer = {
      text: "\u00a0",
      color: C.bgCard,
      margin: [4, 22, 4, 22],
    };
    return [spacer, spacer];
  }

  function priceTagsTable(prices, minBodyRows) {
    minBodyRows = minBodyRows || 1;
    var list = prices || [];
    if (!list.length) {
      var fallback = {
        text: "Ціну уточнюйте",
        style: "priceFallback",
        margin: [0, 2, 0, 0],
      };
      if (minBodyRows > 1) {
        var extraH = (minBodyRows - 1) * 38;
        return {
          margin: [0, 0, 0, 8],
          stack: [
            fallback,
            { text: "", margin: [0, extraH, 0, 0] },
          ],
        };
      }
      return {
        margin: [0, 0, 0, 8],
        stack: [fallback],
      };
    }
    var rows = [];
    for (var i = 0; i < list.length; i += 2) {
      rows.push([
        priceTagCell(list[i], i),
        list[i + 1] ? priceTagCell(list[i + 1], i + 1) : { text: "" },
      ]);
    }
    while (rows.length < minBodyRows) {
      rows.push(priceTagsPlaceholderRow());
    }
    return {
      margin: [0, 0, 0, 8],
      table: {
        widths: ["*", "*"],
        body: rows,
      },
      layout: {
        hLineWidth: function () {
          return 0;
        },
        vLineWidth: function () {
          return 0;
        },
        paddingLeft: function () {
          return 2;
        },
        paddingRight: function () {
          return 2;
        },
        paddingTop: function () {
          return 2;
        },
        paddingBottom: function () {
          return 2;
        },
      },
    };
  }

  function specsBlock(d, alignContentLines) {
    var natural = d ? 4 : 1;
    alignContentLines = Math.max(alignContentLines || natural, natural);
    var padAfter = Math.max(0, alignContentLines - natural) * 9.2;

    var specBody;
    if (!d) {
      var missStack = [
        {
          text: "Розміри: уточнюйте у виробника.",
          style: "specNote",
          margin: [0, 2, 0, 0],
        },
      ];
      if (padAfter > 0) {
        missStack.push({ text: "", margin: [0, padAfter, 0, 0] });
      }
      specBody = { stack: missStack };
    } else {
      var fullStack = [
        {
          table: {
            widths: ["auto", "*"],
            body: [
              [
                { text: "Висота", style: "specDt" },
                { text: d.heightCm + " см", style: "specDd", alignment: "right" },
              ],
              [
                { text: "З ручкою", style: "specDt" },
                { text: d.heightWithHandleCm + " см", style: "specDd", alignment: "right" },
              ],
              [
                { text: "Довжина", style: "specDt" },
                { text: d.lengthCm + " см", style: "specDd", alignment: "right" },
              ],
              [
                { text: "Ширина", style: "specDt" },
                { text: d.widthCm + " см", style: "specDd", alignment: "right" },
              ],
            ],
          },
          layout: "noBorders",
        },
      ];
      if (padAfter > 0) {
        fullStack.push({ text: "", margin: [0, padAfter, 0, 0] });
      }
      specBody = { stack: fullStack };
    }

    var lineW = Math.min(268, INNER_W_PT * 0.42);

    return {
      margin: [0, 2, 0, 0],
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                {
                  columns: [
                    { text: "Характеристики", style: "specTitle", width: "*" },
                    {
                      text: "−",
                      style: "specMinus",
                      width: 16,
                      alignment: "right",
                    },
                  ],
                },
                {
                  canvas: [
                    {
                      type: "line",
                      x1: 0,
                      y1: 0,
                      x2: lineW,
                      y2: 0,
                      lineWidth: 0.45,
                      lineColor: C.borderCard,
                    },
                  ],
                  margin: [0, 4, 0, 6],
                },
                specBody,
              ],
              margin: [8, 8, 8, 8],
              fillColor: C.bg,
              border: [true, true, true, true],
              borderColor: C.borderCard,
              borderWidth: 0.5,
            },
          ],
        ],
      },
      layout: {
        hLineWidth: function () {
          return 0;
        },
        vLineWidth: function () {
          return 0;
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

  function productCell(p, imgDataUrl, minPriceRows, maxNoteBlocks, alignSpecsLines) {
    if (!p) {
      return { text: "" };
    }

    minPriceRows = minPriceRows || 1;
    maxNoteBlocks = maxNoteBlocks == null ? noteBlockCount(p) : maxNoteBlocks;
    alignSpecsLines =
      alignSpecsLines == null ? specsContentLines(p) : alignSpecsLines;

    var imgPart;
    if (imgDataUrl) {
      imgPart = {
        image: imgDataUrl,
        width: 218,
        height: 96,
        fit: [218, 96],
        alignment: "center",
      };
    } else {
      imgPart = {
        text: "Фото недоступне",
        style: "noPhoto",
        alignment: "center",
        margin: [0, 22, 0, 22],
      };
    }

    var imageRow = {
      stack: [imgPart],
      margin: [8, 11, 8, 11],
    };

    var bodyItems = [
      codeBadgePdf(p.id),
      { text: p.name, style: "pname" },
      priceTagsTable(p.prices, minPriceRows),
      specsBlock(p.dimensions, alignSpecsLines),
    ];
    if (p.note) {
      bodyItems.push({ text: p.note, style: "note" });
    }
    if (p.priceNote) {
      bodyItems.push({ text: p.priceNote, style: "pnote" });
    }
    var nb = noteBlockCount(p);
    if (maxNoteBlocks > nb) {
      bodyItems.push({
        text: "",
        margin: [0, 0, 0, (maxNoteBlocks - nb) * 12],
      });
    }

    var bodyRow = {
      stack: bodyItems,
      margin: [10, 10, 10, 11],
    };

    return {
      table: {
        widths: ["*"],
        body: [[imageRow], [bodyRow]],
      },
      layout: {
        hLineWidth: function (i, node) {
          if (i === 0 || i === node.table.body.length) return 0.55;
          return 0.55;
        },
        vLineWidth: function () {
          return 0.55;
        },
        hLineColor: function () {
          return C.borderCard;
        },
        vLineColor: function () {
          return C.borderCard;
        },
        fillColor: function (i) {
          return i === 0 ? C.bgAlt : C.bgCard;
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

  function pairRowLayout() {
    return {
      hLineWidth: function () {
        return 0;
      },
      vLineWidth: function () {
        return 0;
      },
      paddingLeft: function (i) {
        return i === 1 ? 6 : 0;
      },
      paddingRight: function (i) {
        return i === 0 ? 6 : 0;
      },
      paddingTop: function () {
        return 0;
      },
      paddingBottom: function () {
        return 0;
      },
    };
  }

  /** Дві картки в одному рядку таблиці — однакова висота комірок. */
  function productPairTable(left, right, imgById) {
    var minPrice = 1;
    var maxNotes = 0;
    var maxSpecs = 1;
    if (left && right) {
      minPrice = Math.max(
        priceTagBodyRowCount(left.prices),
        priceTagBodyRowCount(right.prices)
      );
      maxNotes = Math.max(noteBlockCount(left), noteBlockCount(right));
      maxSpecs = Math.max(specsContentLines(left), specsContentLines(right));
    } else if (left) {
      minPrice = priceTagBodyRowCount(left.prices);
      maxNotes = noteBlockCount(left);
      maxSpecs = specsContentLines(left);
    } else if (right) {
      minPrice = priceTagBodyRowCount(right.prices);
      maxNotes = noteBlockCount(right);
      maxSpecs = specsContentLines(right);
    }

    return {
      table: {
        widths: ["*", "*"],
        body: [
          [
            productCell(
              left,
              left ? imgById[left.id] : null,
              minPrice,
              maxNotes,
              maxSpecs
            ),
            productCell(
              right,
              right ? imgById[right.id] : null,
              minPrice,
              maxNotes,
              maxSpecs
            ),
          ],
        ],
      },
      layout: pairRowLayout(),
    };
  }

  function buildPageBlock(batch, imgById, pageIndex) {
    var four = padBatchToFour(batch);
    var head = pageIndex === 0 ? fullHeader() : compactHeader();
    return {
      stack: head.concat([
        productPairTable(four[0], four[1], imgById),
        {
          margin: [0, 12, 0, 0],
          stack: [productPairTable(four[2], four[3], imgById)],
        },
      ]),
      pageBreak: pageIndex > 0 ? "before" : undefined,
    };
  }

  function paintFrame() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        setTimeout(resolve, 40);
      });
    });
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
      overlay.setAttribute("aria-busy", "true");
    }

    await paintFrame();

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
          color: C.text,
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
                  color: C.bg,
                },
              ],
            },
          ];
        },
        styles: {
          brand: { fontSize: 22, bold: true, color: C.text },
          brandSmall: { fontSize: 16, bold: true, color: C.text },
          contacts: { fontSize: 8, color: C.textMuted },
          title: { fontSize: 17, italics: true, color: C.text },
          subtitle: { fontSize: 9, color: C.textMuted },
          codeInner: {
            fontSize: 7.5,
            bold: true,
            color: C.accent,
            characterSpacing: 0.6,
          },
          pname: {
            fontSize: 10,
            bold: true,
            color: C.text,
            margin: [0, 0, 0, 4],
          },
          priceFallback: { fontSize: 8, color: C.textMuted, italics: true },
          ptLabel: { fontSize: 7.2, color: C.textLight },
          ptLabelHi: { fontSize: 7.2, color: C.textMuted },
          ptAmt: { fontSize: 9.2, bold: true, color: C.text },
          ptAmtHi: { fontSize: 9.2, bold: true, color: C.accentHover },
          specTitle: { fontSize: 8.2, bold: true, color: C.textMuted },
          specMinus: { fontSize: 10, color: C.textLight },
          specDt: { fontSize: 7.6, color: C.textLight },
          specDd: { fontSize: 7.6, bold: true, color: C.text },
          specNote: { fontSize: 7.5, color: C.textMuted },
          note: { fontSize: 7.5, color: "#a07a4a", margin: [0, 4, 0, 0] },
          pnote: { fontSize: 7.5, color: C.textMuted, margin: [0, 2, 0, 0] },
          noPhoto: { fontSize: 8, color: C.textLight, italics: true },
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
        overlay.setAttribute("aria-busy", "false");
      }
    }
  };
})();
