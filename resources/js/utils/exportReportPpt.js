import { format, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// Qsales Brand Colors (Hijau Qsales identity)
const COLORS = {
  primary: '00A88F',      // Hijau Qsales utama
  primaryDark: '007F6C',  // Hijau tua untuk teks tebal / card gelap
  surfaceLight: 'E9F8F5', // Hijau muda card background
  surfaceTint: 'F4FBF9',  // Tint sangat muda
  white: 'FFFFFF',
  grayBorder: 'D7EBE7',   // Divider & border tabel
  grayText: '64748B',     // Charcoal abu-abu untuk subtitle / label
  darkText: '172033',     // Charcoal gelap untuk heading / teks utama
  accentGold: 'F59E0B',   // Aksen kuning / oranye
  accentRed: 'EF4444',    // Warning / lost
};

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const getCurrencyFontSize = (text, defaultSize = 26) => {
  if (!text) return defaultSize;
  if (text.length >= 17) return 18;
  if (text.length >= 14) return 21;
  return defaultSize;
};

const formatDate = (str) => {
  if (!str) return '-';
  try {
    const d = parseISO(str);
    if (!isValid(d)) return str;
    return format(d, 'd MMM yyyy', { locale: idLocale });
  } catch {
    return str;
  }
};

/**
 * Generate and download a PowerPoint report (.pptx) styled with Qsales Green theme
 * taking data directly from Leads (Lead Pipeline) with active filter awareness.
 */
export async function exportReportPpt({
  leads = [],
  quotations = [],
  stages = [],
  filterSalesName = 'Semua Sales',
  filterStageName = 'Semua Tahap',
  searchKeyword = '',
  filterStatus = 'all',
  filterBuName = 'Semua business unit',
  userName = 'Pengguna',
}) {
  const pptxModule = await import('pptxgenjs');
  const PptxGen = pptxModule.default || pptxModule;
  const pptx = new (PptxGen.default || PptxGen)();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches (16:9)

  const dateNow = new Date();
  const dateFormatted = format(dateNow, 'd MMMM yyyy', { locale: idLocale });
  const monthYear = format(dateNow, 'MMMM yyyy', { locale: idLocale });
  const dateStamp = format(dateNow, 'yyyy-MM-dd');

  // Determine whether this export is based on Leads pipeline or Quotations
  const isLeadsMode = leads && leads.length > 0;

  // Derive stage classifications
  const dealStageKeys = stages.filter((s) => s.type === 'deal').map((s) => s.key);
  const effectiveDealKeys = dealStageKeys.length > 0
    ? dealStageKeys
    : ['win', 'selesai_terbayar', 'proyek_deal', 'proyek_selesai'];

  const lostStageKeys = stages.filter((s) => s.type === 'lost').map((s) => s.key);
  const effectiveLostKeys = lostStageKeys.length > 0
    ? lostStageKeys
    : ['lost', 'no_deal'];

  // Calculations for Leads mode
  const totalCount = isLeadsMode ? leads.length : quotations.length;

  const totalEstimated = isLeadsMode
    ? leads.reduce((sum, l) => sum + (Number(l.estimated_value) || 0), 0)
    : quotations.reduce((sum, q) => sum + (Number(q.grand_total) || Number(q.total) || 0), 0);

  const dealLeads = isLeadsMode
    ? leads.filter((l) => effectiveDealKeys.includes(l.stage))
    : quotations.filter((q) => q.status === 'approved');
  const dealTotal = isLeadsMode
    ? dealLeads.reduce((sum, l) => sum + (Number(l.estimated_value) || 0), 0)
    : dealLeads.reduce((sum, q) => sum + (Number(q.grand_total) || Number(q.total) || 0), 0);

  const lostLeads = isLeadsMode
    ? leads.filter((l) => effectiveLostKeys.includes(l.stage))
    : quotations.filter((q) => ['rejected', 'expired', 'cancelled'].includes(q.status));
  const lostTotal = isLeadsMode
    ? lostLeads.reduce((sum, l) => sum + (Number(l.estimated_value) || 0), 0)
    : lostLeads.reduce((sum, q) => sum + (Number(q.grand_total) || Number(q.total) || 0), 0);

  // Active leads (in progress / qualification / negotiation)
  const activeLeads = isLeadsMode
    ? leads.filter((l) => !effectiveDealKeys.includes(l.stage) && !effectiveLostKeys.includes(l.stage))
    : quotations.filter((q) => !['approved', 'rejected', 'expired', 'cancelled'].includes(q.status));
  const activeTotal = isLeadsMode
    ? activeLeads.reduce((sum, l) => sum + (Number(l.estimated_value) || 0), 0)
    : activeLeads.reduce((sum, q) => sum + (Number(q.grand_total) || Number(q.total) || 0), 0);

  // Hot progress leads (e.g. negotiation stage)
  const hotLeads = isLeadsMode
    ? leads.filter((l) => l.stage === 'negotiation' || l.stage === 'lead_qualification')
    : quotations.filter((q) => ['sent', 'revision_draft'].includes(q.status));
  const hotTotal = isLeadsMode
    ? hotLeads.reduce((sum, l) => sum + (Number(l.estimated_value) || 0), 0)
    : hotLeads.reduce((sum, q) => sum + (Number(q.grand_total) || Number(q.total) || 0), 0);

  // Conversion rates
  const winRate = totalCount > 0 ? Math.round((dealLeads.length / totalCount) * 100) : 0;
  const closingRate = (dealLeads.length + hotLeads.length) > 0
    ? Math.round((dealLeads.length / (dealLeads.length + hotLeads.length)) * 100)
    : winRate;

  const footerText = `PT. ACTiV Teknologi Solusi · Qsales Report · ${monthYear}`;

  // Helper for consistent slide footer
  const addFooter = (slide, pageNum) => {
    slide.addShape(pptx.shapes.RECTANGLE, {
      x: 0,
      y: 7.0,
      w: 13.33,
      h: 0.5,
      fill: { color: COLORS.surfaceTint },
      line: { color: COLORS.grayBorder, width: 0.5 },
    });
    slide.addText(footerText, {
      x: 0.8,
      y: 7.1,
      w: 10,
      h: 0.3,
      fontSize: 10,
      color: COLORS.grayText,
      fontFace: 'Arial',
    });
    slide.addText(`Slide ${pageNum}`, {
      x: 11.5,
      y: 7.1,
      w: 1.0,
      h: 0.3,
      fontSize: 10,
      align: 'right',
      color: COLORS.primaryDark,
      bold: true,
      fontFace: 'Arial',
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SLIDE 1: COVER
  // ─────────────────────────────────────────────────────────────────────────────
  const slide1 = pptx.addSlide();
  slide1.background = { color: COLORS.white };

  // Decorative top bar in Qsales Green
  slide1.addShape(pptx.shapes.RECTANGLE, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.15,
    fill: { color: COLORS.primary },
  });

  // Logo ACTiV: Square aspect ratio (1.1 x 1.1) to avoid squishing
  try {
    slide1.addImage({ path: '/logo.png', x: 0.8, y: 0.75, w: 1.1, h: 1.1 });
  } catch {
    slide1.addText('ACTiV Qsales', {
      x: 0.8,
      y: 0.75,
      w: 3.0,
      h: 0.6,
      fontSize: 22,
      bold: true,
      color: COLORS.primary,
    });
  }

  // Accent bar (Gold/Orange)
  slide1.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8,
    y: 2.15,
    w: 0.9,
    h: 0.08,
    fill: { color: COLORS.accentGold },
  });

  // Eyebrow
  slide1.addText('REPORT PENJUALAN · LEAD PIPELINE', {
    x: 0.8,
    y: 2.4,
    w: 8.0,
    h: 0.3,
    fontSize: 13,
    bold: true,
    color: COLORS.primaryDark,
    fontFace: 'Arial',
  });

  // Main Title
  slide1.addText('Laporan Pipeline Penjualan', {
    x: 0.8,
    y: 2.75,
    w: 11.0,
    h: 0.9,
    fontSize: 38,
    bold: true,
    color: COLORS.darkText,
    fontFace: 'Georgia',
  });

  // Subtitle
  slide1.addText(`PT. ACTiV Teknologi Solusi · Periode ${monthYear}`, {
    x: 0.8,
    y: 3.75,
    w: 10.0,
    h: 0.4,
    fontSize: 18,
    color: COLORS.grayText,
    fontFace: 'Arial',
  });

  // Scope info cards
  slide1.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.8,
    y: 4.45,
    w: 11.73,
    h: 1.8,
    fill: { color: COLORS.surfaceLight },
    line: { color: COLORS.grayBorder, width: 1 },
    rectRadius: 0.1,
  });

  const scopeTexts = [
    { text: 'Cakupan Laporan:\n', options: { bold: true, color: COLORS.primaryDark, fontSize: 13 } },
    { text: `• Filter Sales: ${filterSalesName}\n`, options: { color: COLORS.darkText, fontSize: 11 } },
    { text: `• Filter Tahap: ${filterStageName}\n`, options: { color: COLORS.darkText, fontSize: 11 } },
  ];

  if (searchKeyword) {
    scopeTexts.push({ text: `• Pencarian: "${searchKeyword}"\n`, options: { color: COLORS.darkText, fontSize: 11 } });
  }

  scopeTexts.push({
    text: `• Total Lead: ${totalCount} prospek (Total Estimasi Pipeline: ${formatCurrency(totalEstimated)})\n`,
    options: { color: COLORS.darkText, fontSize: 11, bold: true },
  });

  slide1.addText(scopeTexts, { x: 1.1, y: 4.6, w: 10.0, h: 1.5 });

  // Meta footer on cover
  slide1.addText(`Dibuat pada ${dateFormatted} · Pengguna: ${userName}`, {
    x: 0.8,
    y: 6.75,
    w: 10.0,
    h: 0.3,
    fontSize: 11,
    color: COLORS.grayText,
    fontFace: 'Arial',
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SLIDE 2: RINGKASAN PERIODE INI (EXECUTIVE SUMMARY)
  // ─────────────────────────────────────────────────────────────────────────────
  const slide2 = pptx.addSlide();
  slide2.background = { color: COLORS.white };

  // Accent bar
  slide2.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 0.5, w: 0.8, h: 0.08, fill: { color: COLORS.accentGold } });
  slide2.addText('Ringkasan Periode Ini', { x: 0.8, y: 0.7, w: 8.0, h: 0.6, fontSize: 26, bold: true, color: COLORS.darkText, fontFace: 'Georgia' });
  slide2.addText('Estimasi deal, pipeline aktif, dan performa konversi.', { x: 0.8, y: 1.3, w: 8.0, h: 0.3, fontSize: 12, color: COLORS.grayText, fontFace: 'Arial' });

  // Big DEAL Card (Hijau Qsales Solid)
  slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.8,
    y: 1.8,
    w: 5.2,
    h: 4.8,
    fill: { color: COLORS.primaryDark },
    line: { color: COLORS.primary, width: 1.5 },
    rectRadius: 0.12,
  });

  slide2.addText('ESTIMASI DEAL / MENANG (WON)', {
    x: 1.1,
    y: 2.2,
    w: 4.6,
    h: 0.3,
    fontSize: 13,
    bold: true,
    color: COLORS.surfaceLight,
    fontFace: 'Arial',
  });

  const dealTotalText = formatCurrency(dealTotal);
  slide2.addText(dealTotalText, {
    x: 1.1,
    y: 2.65,
    w: 4.6,
    h: 1.1,
    fontSize: getCurrencyFontSize(dealTotalText, 30),
    bold: true,
    color: COLORS.white,
    fontFace: 'Georgia',
  });

  slide2.addText(`${dealLeads.length} lead deal / menang`, {
    x: 1.1,
    y: 3.9,
    w: 4.6,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: COLORS.accentGold,
    fontFace: 'Arial',
  });

  slide2.addText(
    `Total Estimasi Pipeline:\n${formatCurrency(totalEstimated)} dari ${totalCount} lead.\n\nWin rate mencapai ${winRate}% dari seluruh prospek dalam filter.`,
    {
      x: 1.1,
      y: 4.6,
      w: 4.6,
      h: 1.6,
      fontSize: 11,
      color: COLORS.surfaceLight,
      fontFace: 'Arial',
    }
  );

  // 4 KPI Cards in a 2x2 grid on the right side
  const kpiCards = [
    { title: 'Total Lead', value: `${totalCount}`, desc: `${formatCurrency(totalEstimated)}`, colorBar: COLORS.primary },
    { title: 'Dalam Proses', value: `${activeLeads.length}`, desc: `${formatCurrency(activeTotal)}`, colorBar: COLORS.accentGold },
    { title: 'Hot / Negosiasi', value: `${hotLeads.length}`, desc: `${formatCurrency(hotTotal)}`, colorBar: COLORS.primary },
    { title: 'Deal (Won)', value: `${dealLeads.length}`, desc: `${formatCurrency(dealTotal)}`, colorBar: COLORS.primaryDark },
  ];

  kpiCards.forEach((kpi, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const cardX = 6.3 + col * 3.1;
    const cardY = 1.8 + row * 2.5;
    const cardW = 2.9;
    const cardH = 2.3;

    slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: cardX,
      y: cardY,
      w: cardW,
      h: cardH,
      fill: { color: COLORS.surfaceLight },
      line: { color: COLORS.grayBorder, width: 1 },
      rectRadius: 0.1,
    });

    // Color bar indicator
    slide2.addShape(pptx.shapes.RECTANGLE, {
      x: cardX,
      y: cardY,
      w: 0.1,
      h: cardH,
      fill: { color: kpi.colorBar },
    });

    slide2.addText(kpi.title, {
      x: cardX + 0.3,
      y: cardY + 0.25,
      w: cardW - 0.4,
      h: 0.3,
      fontSize: 12,
      color: COLORS.grayText,
      fontFace: 'Arial',
    });

    slide2.addText(kpi.value, {
      x: cardX + 0.3,
      y: cardY + 0.65,
      w: cardW - 0.4,
      h: 0.8,
      fontSize: 32,
      bold: true,
      color: COLORS.darkText,
      fontFace: 'Georgia',
    });

    slide2.addText(kpi.desc, {
      x: cardX + 0.3,
      y: cardY + 1.55,
      w: cardW - 0.4,
      h: 0.45,
      fontSize: getCurrencyFontSize(kpi.desc, 11),
      bold: true,
      color: COLORS.primaryDark,
      fontFace: 'Arial',
    });
  });

  addFooter(slide2, 2);

  // ─────────────────────────────────────────────────────────────────────────────
  // SLIDE 3: PIPELINE (VISUAL & KONVERSI)
  // ─────────────────────────────────────────────────────────────────────────────
  const slide3 = pptx.addSlide();
  slide3.background = { color: COLORS.white };

  slide3.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 0.5, w: 0.8, h: 0.08, fill: { color: COLORS.accentGold } });
  slide3.addText('Pipeline Penjualan', { x: 0.8, y: 0.7, w: 8.0, h: 0.6, fontSize: 26, bold: true, color: COLORS.darkText, fontFace: 'Georgia' });
  slide3.addText('Sebaran lead per tahap dan tingkat konversi.', { x: 0.8, y: 1.3, w: 8.0, h: 0.3, fontSize: 12, color: COLORS.grayText, fontFace: 'Arial' });

  // Funnel / Column Chart on Left
  const stageCategories = stages && stages.length > 0
    ? stages.slice(0, 5).map((s) => s.name || s.key)
    : ['Lead Masuk', 'Follow Up', 'Kualifikasi', 'Negosiasi', 'Deal'];

  const stageKeys = stages && stages.length > 0
    ? stages.slice(0, 5).map((s) => s.key)
    : ['lead_masuk', 'follow_up', 'lead_qualification', 'negotiation', 'win'];

  const stageCounts = stageKeys.map((key) =>
    isLeadsMode
      ? leads.filter((l) => l.stage === key).length
      : 0
  );

  // Fallback values if all 0 to make chart visually sensible
  const chartLabels = stageCategories;
  const chartValues = stageCounts.map((c, i) => (c > 0 ? c : i === 0 && totalCount > 0 ? totalCount : 0));

  const pipelineData = [
    { name: 'Jumlah Lead', labels: chartLabels, values: chartValues },
  ];

  slide3.addChart(pptx.charts.BAR, pipelineData, {
    x: 0.8,
    y: 1.8,
    w: 7.2,
    h: 4.8,
    barDir: 'col',
    chartColors: [COLORS.primary],
    chartColorsOpacity: 90,
    showValue: true,
    dataLabelColor: COLORS.darkText,
    dataLabelFontSize: 11,
    dataLabelPosition: 'outEnd',
    valAxisMinVal: 0,
    catAxisLabelColor: COLORS.darkText,
    catAxisLabelFontSize: 10,
  });

  // Right Side: Conversion Cards
  const convCard1Y = 1.8;
  slide3.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 8.4,
    y: convCard1Y,
    w: 4.1,
    h: 2.2,
    fill: { color: COLORS.surfaceLight },
    line: { color: COLORS.grayBorder, width: 1.5 },
    rectRadius: 0.1,
  });

  slide3.addText('Lead Masuk → Deal (Win Rate)', {
    x: 8.7,
    y: convCard1Y + 0.3,
    w: 3.5,
    h: 0.3,
    fontSize: 13,
    color: COLORS.grayText,
    fontFace: 'Arial',
  });

  slide3.addText(`${winRate}%`, {
    x: 8.7,
    y: convCard1Y + 0.75,
    w: 3.5,
    h: 0.8,
    fontSize: 42,
    bold: true,
    color: COLORS.accentGold,
    fontFace: 'Georgia',
  });

  slide3.addText(`${dealLeads.length} dari ${totalCount} lead sukses mencapai closing.`, {
    x: 8.7,
    y: convCard1Y + 1.6,
    w: 3.5,
    h: 0.4,
    fontSize: 10,
    color: COLORS.darkText,
    fontFace: 'Arial',
  });

  const convCard2Y = 4.3;
  slide3.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 8.4,
    y: convCard2Y,
    w: 4.1,
    h: 2.3,
    fill: { color: COLORS.surfaceLight },
    line: { color: COLORS.grayBorder, width: 1.5 },
    rectRadius: 0.1,
  });

  slide3.addText('Negosiasi / Prospek → Deal', {
    x: 8.7,
    y: convCard2Y + 0.3,
    w: 3.5,
    h: 0.3,
    fontSize: 13,
    color: COLORS.grayText,
    fontFace: 'Arial',
  });

  slide3.addText(`${closingRate}%`, {
    x: 8.7,
    y: convCard2Y + 0.75,
    w: 3.5,
    h: 0.8,
    fontSize: 42,
    bold: true,
    color: COLORS.accentGold,
    fontFace: 'Georgia',
  });

  slide3.addText(`Tingkat konversi deal dari lead yang sudah tahap negosiasi/kualifikasi.`, {
    x: 8.7,
    y: convCard2Y + 1.6,
    w: 3.5,
    h: 0.4,
    fontSize: 10,
    color: COLORS.darkText,
    fontFace: 'Arial',
  });

  addFooter(slide3, 3);

  // ─────────────────────────────────────────────────────────────────────────────
  // SLIDE 4: DEAL PERIODE INI / TOP PROSPEK (TABEL)
  // ─────────────────────────────────────────────────────────────────────────────
  const slide4 = pptx.addSlide();
  slide4.background = { color: COLORS.white };

  slide4.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 0.5, w: 0.8, h: 0.08, fill: { color: COLORS.accentGold } });
  slide4.addText('Deal & Prospek Periode Ini', { x: 0.8, y: 0.7, w: 8.0, h: 0.6, fontSize: 26, bold: true, color: COLORS.darkText, fontFace: 'Georgia' });
  slide4.addText(`${dealLeads.length} deal dengan estimasi ${formatCurrency(dealTotal)}`, { x: 0.8, y: 1.3, w: 8.0, h: 0.3, fontSize: 13, bold: true, color: COLORS.primaryDark, fontFace: 'Arial' });

  // Table rows
  const tableData = [
    [
      { text: 'Tanggal', options: { bold: true, fill: COLORS.primary, color: COLORS.white, align: 'center' } },
      { text: 'Nama Lead & Kebutuhan', options: { bold: true, fill: COLORS.primary, color: COLORS.white } },
      { text: 'Customer', options: { bold: true, fill: COLORS.primary, color: COLORS.white } },
      { text: 'Sales PIC', options: { bold: true, fill: COLORS.primary, color: COLORS.white } },
      { text: 'Tahap', options: { bold: true, fill: COLORS.primary, color: COLORS.white, align: 'center' } },
      { text: 'Estimasi Nilai', options: { bold: true, fill: COLORS.primary, color: COLORS.white, align: 'right' } },
    ],
  ];

  // Prioritize deal leads first, then sort by estimated_value descending
  const sortedLeads = isLeadsMode
    ? [...leads].sort((a, b) => {
        const isADeal = effectiveDealKeys.includes(a.stage);
        const isBDeal = effectiveDealKeys.includes(b.stage);
        if (isADeal && !isBDeal) return -1;
        if (!isADeal && isBDeal) return 1;
        return (Number(b.estimated_value) || 0) - (Number(a.estimated_value) || 0);
      })
    : quotations;

  const maxRows = 10;
  const displayRows = sortedLeads.slice(0, maxRows);

  if (displayRows.length > 0) {
    displayRows.forEach((item, idx) => {
      const isEven = idx % 2 === 0;
      const rowBg = isEven ? COLORS.white : COLORS.surfaceTint;

      if (isLeadsMode) {
        const stageObj = stages.find((s) => s.key === item.stage);
        const stageLabel = stageObj?.name || item.stage || '-';
        tableData.push([
          { text: formatDate(item.converted_at || item.created_at), options: { fill: rowBg, color: COLORS.grayText, fontSize: 9, align: 'center' } },
          { text: item.title || item.lead_code || '-', options: { fill: rowBg, color: COLORS.darkText, bold: true, fontSize: 9 } },
          { text: item.customer_name || item.customer?.name || '-', options: { fill: rowBg, color: COLORS.darkText, fontSize: 9 } },
          { text: item.sales?.name || '-', options: { fill: rowBg, color: COLORS.grayText, fontSize: 9 } },
          { text: stageLabel, options: { fill: rowBg, color: COLORS.primaryDark, fontSize: 9, align: 'center', bold: true } },
          { text: formatCurrency(item.estimated_value), options: { fill: rowBg, color: COLORS.primaryDark, bold: true, fontSize: 9, align: 'right' } },
        ]);
      } else {
        tableData.push([
          { text: formatDate(item.date || item.created_at), options: { fill: rowBg, color: COLORS.grayText, fontSize: 9, align: 'center' } },
          { text: item.number || item.quotation_no || '-', options: { fill: rowBg, color: COLORS.darkText, bold: true, fontSize: 9 } },
          { text: item.customer?.name || '-', options: { fill: rowBg, color: COLORS.darkText, fontSize: 9 } },
          { text: item.sales?.name || '-', options: { fill: rowBg, color: COLORS.grayText, fontSize: 9 } },
          { text: item.status || '-', options: { fill: rowBg, color: COLORS.primaryDark, fontSize: 9, align: 'center', bold: true } },
          { text: formatCurrency(item.grand_total || item.total), options: { fill: rowBg, color: COLORS.primaryDark, bold: true, fontSize: 9, align: 'right' } },
        ]);
      }
    });
  } else {
    tableData.push([
      { text: '-', options: { align: 'center' } },
      { text: 'Belum ada data lead pada filter ini.' },
      { text: '-' },
      { text: '-' },
      { text: '-' },
      { text: 'Rp 0', options: { align: 'right' } },
    ]);
  }

  slide4.addTable(tableData, {
    x: 0.8,
    y: 1.8,
    w: 11.73,
    colW: [1.4, 3.2, 2.5, 1.8, 1.4, 1.43],
    rowH: 0.44,
    border: { pt: 0.5, color: COLORS.grayBorder },
    fontSize: 9,
    fontFace: 'Arial',
  });

  if (sortedLeads.length > maxRows) {
    slide4.addText(`* Menampilkan ${maxRows} lead teratas dari total ${sortedLeads.length} lead.`, {
      x: 0.8,
      y: 6.5,
      w: 8.0,
      h: 0.3,
      fontSize: 10,
      italic: true,
      color: COLORS.grayText,
    });
  }

  addFooter(slide4, 4);

  // ─────────────────────────────────────────────────────────────────────────────
  // SLIDE 5: PERBANDINGAN DAN LEAD KALAH / LOST
  // ─────────────────────────────────────────────────────────────────────────────
  const slide5 = pptx.addSlide();
  slide5.background = { color: COLORS.white };

  slide5.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 0.5, w: 0.8, h: 0.08, fill: { color: COLORS.accentGold } });
  slide5.addText('Perbandingan dan Lead Kalah', { x: 0.8, y: 0.7, w: 8.0, h: 0.6, fontSize: 26, bold: true, color: COLORS.darkText, fontFace: 'Georgia' });
  slide5.addText('Estimasi deal closing dibanding pipeline berjalan dan lead yang kalah/gugur.', { x: 0.8, y: 1.3, w: 8.0, h: 0.3, fontSize: 12, color: COLORS.grayText, fontFace: 'Arial' });

  // 3 Large Comparative Cards with safe font size to prevent line-wrapping on long currency
  const compareCards = [
    {
      title: 'Estimasi Deal (Won)',
      amount: formatCurrency(dealTotal),
      sub: `${dealLeads.length} lead closing`,
      desc: 'Prospek berhasil mencapai tahap menang (Deal)',
      bg: COLORS.primaryDark,
      titleColor: COLORS.surfaceLight,
      amountColor: COLORS.white,
      subColor: COLORS.accentGold,
      border: COLORS.primary,
    },
    {
      title: 'Pipeline Berjalan (In Progress)',
      amount: formatCurrency(activeTotal),
      sub: `${activeLeads.length} lead aktif`,
      desc: 'Tahap follow up, kualifikasi, atau negosiasi',
      bg: COLORS.surfaceLight,
      titleColor: COLORS.grayText,
      amountColor: COLORS.darkText,
      subColor: COLORS.primaryDark,
      border: COLORS.grayBorder,
    },
    {
      title: 'Lead Kalah / Batal (Lost)',
      amount: formatCurrency(lostTotal),
      sub: `${lostLeads.length} lead gugur/batal`,
      desc: 'Ditolak, expired, atau kalah kompetitor',
      bg: 'FFF5F5', // Soft Red
      titleColor: '991B1B',
      amountColor: COLORS.accentRed,
      subColor: 'B91C1C',
      border: 'FECACA',
    },
  ];

  compareCards.forEach((c, i) => {
    const cardX = 0.8 + i * 4.0;
    const cardY = 1.9;
    const cardW = 3.73;
    const cardH = 4.7;

    slide5.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: cardX,
      y: cardY,
      w: cardW,
      h: cardH,
      fill: { color: c.bg },
      line: { color: c.border, width: 1.5 },
      rectRadius: 0.12,
    });

    slide5.addText(c.title, {
      x: cardX + 0.25,
      y: cardY + 0.4,
      w: cardW - 0.5,
      h: 0.35,
      fontSize: 14,
      bold: true,
      color: c.titleColor,
      fontFace: 'Arial',
    });

    slide5.addText(c.amount, {
      x: cardX + 0.25,
      y: cardY + 1.0,
      w: cardW - 0.5,
      h: 0.9,
      fontSize: getCurrencyFontSize(c.amount, 24),
      bold: true,
      color: c.amountColor,
      fontFace: 'Georgia',
    });

    slide5.addText(c.sub, {
      x: cardX + 0.25,
      y: cardY + 2.1,
      w: cardW - 0.5,
      h: 0.4,
      fontSize: 13,
      bold: true,
      color: c.subColor,
      fontFace: 'Arial',
    });

    slide5.addText(c.desc, {
      x: cardX + 0.25,
      y: cardY + 2.7,
      w: cardW - 0.5,
      h: 0.8,
      fontSize: 11,
      color: c.titleColor,
      fontFace: 'Arial',
    });
  });

  addFooter(slide5, 5);

  // ─────────────────────────────────────────────────────────────────────────────
  // SAVE / DOWNLOAD
  // ─────────────────────────────────────────────────────────────────────────────
  const fileName = `Qsales-Pipeline-Report-${dateStamp}.pptx`;
  await pptx.writeFile({ fileName });
}
