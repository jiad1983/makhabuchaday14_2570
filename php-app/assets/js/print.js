(function (global) {
  'use strict';

  function escapeHtml(val) {
    return String(val == null ? '' : val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeImageUrl(val) {
    const str = String(val == null ? '' : val).trim();
    if (!str) return '';
    if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(str)) {
      return str;
    }
    if (/^(https?:\/\/|uploads\/|\/)/i.test(str) && !/["'<>`\\]/.test(str)) {
      return str;
    }
    return '';
  }

  function toThaiDigits(val) {
    const digits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return String(val == null ? '' : val).replace(/[0-9]/g, function (d) {
      return digits[Number(d)];
    });
  }

  function convertHtmlTextToThaiDigits(htmlString) {
    return String(htmlString || '').replace(/(<[^>]+>)|([^<]+)/g, function (_m, tag, text) {
      if (tag) return tag;
      return toThaiDigits(text);
    });
  }

  function formatCertNumber(roleCode, seq) {
    const padded = String(seq).padStart(3, '0');
    return 'เลขที่ จอ.0010.มฆ_' + roleCode + '_' + padded + ' /2570';
  }

  function calculateNormalizedScore(scoresObj) {
    if (!scoresObj || typeof scoresObj !== 'object') {
      return { average100: 0, judgeCount: 0, rawSum: 0 };
    }
    const vals = Object.values(scoresObj).filter(function (v) {
      return typeof v === 'number' && !Number.isNaN(v);
    });
    if (vals.length === 0) return { average100: 0, judgeCount: 0, rawSum: 0 };
    const rawSum = vals.reduce(function (a, b) { return a + b; }, 0);
    return {
      average100: Number((rawSum / vals.length).toFixed(2)),
      judgeCount: vals.length,
      rawSum: rawSum,
    };
  }

  function getMedalTier(score, hasScores) {
    if (hasScores === false) {
      return { label: 'รอคะแนน', certText: 'เข้าร่วมการแข่งขัน', badgeCls: 'badge-slate', printColor: '#475569' };
    }
    if (score >= 80) {
      return { label: 'เหรียญทอง', certText: 'ได้รับรางวัลระดับเหรียญทอง', badgeCls: 'badge-amber', printColor: '#b45309' };
    }
    if (score >= 70) {
      return { label: 'เหรียญเงิน', certText: 'ได้รับรางวัลระดับเหรียญเงิน', badgeCls: 'badge-slate', printColor: '#334155' };
    }
    if (score >= 60) {
      return { label: 'เหรียญทองแดง', certText: 'ได้รับรางวัลระดับเหรียญทองแดง', badgeCls: 'badge-orange', printColor: '#c2410c' };
    }
    return { label: 'เข้าร่วม', certText: 'เข้าร่วมการแข่งขัน', badgeCls: 'badge-sky', printColor: '#0369a1' };
  }

  function buildCardSheetsHtml(cardsArray, layoutMode) {
    if (layoutMode === '1-up') {
      return cardsArray
        .map(function (cardHtml) {
          return '<div class="page-break" style="display:flex;justify-content:center;align-items:center;">' + cardHtml + '</div>';
        })
        .join('');
    }
    const sheets = [];
    for (let i = 0; i < cardsArray.length; i += 4) {
      const chunk = cardsArray.slice(i, i + 4);
      const cells = chunk
        .map(function (cardHtml) {
          return '<div class="card-slot-4up" style="width:100%;height:100%;min-width:0;min-height:0;display:flex;justify-content:center;align-items:center;">' + cardHtml + '</div>';
        })
        .join('');
      sheets.push('<div class="page-break a4-4up-sheet portrait-4up"><div class="grid-4up portrait-grid-4up">' + cells + '</div></div>');
    }
    return sheets.join('');
  }

  function buildPrintableHtmlDoc(title, bodyHtml, pageSizeCss, extraStyleCss) {
    const safeTitle = escapeHtml(title);
    const thaiBody = convertHtmlTextToThaiDigits(bodyHtml);
    return '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8" />' +
      '<title>' + safeTitle + '</title>' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet" crossorigin="anonymous">' +
      '<style>' +
      '@page { size: ' + pageSizeCss + '; margin: 0; }' +
      '* { box-sizing: border-box; font-family: "Sarabun","Noto Sans Thai","TH Sarabun New","Tahoma",sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      'body { margin: 0; padding: 16px; background: #e2e8f0; color: #0f172a; }' +
      '.sheet-wrap { display: flex; flex-direction: column; align-items: center; gap: 20px; padding-bottom: 16px; }' +
      '.sheet-wrap > .page-break { box-shadow: 0 6px 20px rgba(15,23,42,0.14); }' +
      '.a4-4up-sheet { width: 297mm; height: 210mm; background: #fff; padding: 6mm; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 6px 20px rgba(15,23,42,0.12); }' +
      '.a4-4up-sheet.portrait-4up { width: 210mm; height: 297mm; padding: 6mm; overflow: hidden; }' +
      '.grid-4up { width: 100%; height: 100%; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3mm; align-items: center; justify-items: center; }' +
      '.grid-4up.portrait-grid-4up { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 4mm; }' +
      '.card-slot-4up { width: 100%; height: 100%; min-width: 0; min-height: 0; display: flex; align-items: center; justify-content: center; }' +
      '.grid-4up .card-item { flex-shrink: 0; transform: scale(0.66); transform-origin: center center; }' +
      '.grid-4up.portrait-grid-4up .card-item { flex-shrink: 0; transform: scale(0.88); transform-origin: center center; }' +
      (extraStyleCss || '') +
      '@media print { body { background: #fff; padding: 0; } .sheet-wrap { display: block; gap: 0; padding-bottom: 0; } .sheet-wrap > .page-break, .a4-4up-sheet { box-shadow: none !important; page-break-after: always; break-after: page; } .sheet-wrap > .page-break:last-child, .a4-4up-sheet:last-child { page-break-after: auto; break-after: auto; } .page-break { page-break-after: always; break-after: page; } .a4-4up-sheet .page-break { page-break-after: auto; break-after: auto; } }' +
      '</style></head><body><div class="sheet-wrap">' + thaiBody + '</div></body></html>';
  }

  function openPreviewModal(doc, containerEl, onToast) {
    if (!containerEl) return;
    const htmlDoc = buildPrintableHtmlDoc(doc.title, doc.bodyHtml, doc.pageSizeCss, doc.extraStyleCss || '');
    containerEl.innerHTML = '';

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop z-print';
    backdrop.onclick = function () { containerEl.innerHTML = ''; };

    const box = document.createElement('div');
    box.className = 'modal-box wide';
    box.onclick = function (e) { e.stopPropagation(); };

    const header = document.createElement('div');
    header.className = 'modal-header';

    const titleWrap = document.createElement('div');
    titleWrap.innerHTML =
      '<div style="font-weight:700;font-size:15px;">' + escapeHtml(doc.title) + '</div>' +
      '<div style="font-size:11.5px;color:#d1fae5;">กด "พิมพ์เอกสาร / บันทึกเป็น PDF" เพื่อสั่งพิมพ์หรือเลือก Save as PDF</div>';

    const actions = document.createElement('div');
    actions.className = 'row-wrap';

    const printBtn = document.createElement('button');
    printBtn.type = 'button';
    printBtn.className = 'btn btn-amber btn-sm';
    printBtn.textContent = '🖨 พิมพ์ / บันทึก PDF';

    const downloadHtmlBtn = document.createElement('button');
    downloadHtmlBtn.type = 'button';
    downloadHtmlBtn.className = 'btn btn-white btn-sm';
    downloadHtmlBtn.textContent = '⬇ ดาวน์โหลดเอกสาร (.html)';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn btn-rose-solid btn-sm';
    closeBtn.textContent = '✕ ปิด';
    closeBtn.onclick = function () { containerEl.innerHTML = ''; };

    actions.appendChild(printBtn);
    actions.appendChild(downloadHtmlBtn);
    actions.appendChild(closeBtn);
    header.appendChild(titleWrap);
    header.appendChild(actions);

    const iframe = document.createElement('iframe');
    iframe.className = 'print-iframe';
    iframe.title = doc.title;
    iframe.srcdoc = htmlDoc;

    printBtn.onclick = function () {
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          return;
        }
      } catch (_err) {
        // fallback below
      }
      if (onToast) onToast('กรุณากดดาวน์โหลดเอกสารเพื่อสั่งพิมพ์', 'error');
    };

    downloadHtmlBtn.onclick = function () {
      const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (doc.title.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'document') + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    };

    box.appendChild(header);
    box.appendChild(iframe);
    backdrop.appendChild(box);
    containerEl.appendChild(backdrop);
  }

  global.MakhaPrint = {
    escapeHtml: escapeHtml,
    safeImageUrl: safeImageUrl,
    toThaiDigits: toThaiDigits,
    formatCertNumber: formatCertNumber,
    calculateNormalizedScore: calculateNormalizedScore,
    getMedalTier: getMedalTier,
    buildCardSheetsHtml: buildCardSheetsHtml,
    openPreviewModal: openPreviewModal,
  };
})(window);
