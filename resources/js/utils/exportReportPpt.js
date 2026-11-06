import pptxgen from 'pptxgenjs';
import { format, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// Qsales Brand Colors
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
  accentRed: 'EF4444',    // Warning / kalah
};

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const formatDate = (str) => {
  if (!str) return '-';
  try {
    const d = parseISO(str);
    return isValid(d) ? format(d, 'd MMM yyyy', { locale: idLocale }) : str;
  } catch {
    return str;
  }
};

const calcGrandTotal = (q) => {
  if (q.grand_total !== undefined && q.grand_total !== null) {
    return Number(q.grand_total) || 0;
  }
  const sub = Number(q.subtotal) || 0;
  const tax = Number(q.tax_amount) || 0;
  return sub + tax;
};

/**
 * Generate and download a PowerPoint report (.pptx) styled with Qsales Green theme.
 */
export async function exportReportPpt({
  quotations = [],
  filterStatus = 'all',
  filterSalesName = 'Semua sales',
  filterBuName = 'Semua business unit',
  userName = 'Manager',
}) {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches (16:9)

  const dateNow = new Date();
  const dateFormatted = format(dateNow, 'd MMMM yyyy', { locale: idLocale });
  const monthYear = format(dateNow, 'MMMM yyyy', { locale: idLocale });
  const dateStamp = format(dateNow, 'yyyy-MM-dd');

  // Filter calculations
  const totalCount = quotations.length;
  const totalNilai = quotations.reduce((sum, q) => sum + calcGrandTotal(q), 0);

  const approvedList = quotations.filter((q) => q.status === 'approved');
  const approvedTotal = approvedList.reduce((sum, q) => sum + calcGrandTotal(q), 0);

  const sentList = quotations.filter((q) => q.status === 'sent');
  const sentTotal = sentList.reduce((sum, q) => sum + calcGrandTotal(q), 0);

  const hotProgressList = quotations.filter((q) => ['sent', 'revision_draft'].includes(q.status));
  const hotProgressTotal = hotProgressList.reduce((sum, q) => sum + calcGrandTotal(q), 0);

  const lostList = quotations.filter((q) => ['rejected', 'expired', 'cancelled'].includes(q.status));
  const lostTotal = lostList.reduce((sum, q) => sum + calcGrandTotal(q), 0);

  const dataMasukToDealRate = totalCount > 0 ? Math.round((approvedList.length / totalCount) * 100) : 0;
  const sphToDealRate = sentList.length > 0 ? Math.round((approvedList.length / sentList.length) * 100) : 0;

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

  // Decorative top-right curved badge / accent in Qsales Green
  slide1.addShape(pptx.shapes.RECTANGLE, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.15,
    fill: { color: COLORS.primary },
  });

  // Logo ACTiV placeholder / image
  try {
    slide1.addImage({ path: '/logo.png', x: 0.8, y: 0.8, w: 2.2, h: 0.75 });
  } catch {
    slide1.addText('ACTiV Qsales', {
      x: 0.8,
      y: 0.8,
      w: 3.0,
      h: 0.6,
      fontSize: 22,
      bold: true,
      color: COLORS.primary,
    });
  }

  // Accent bar (Orange/Gold)
  slide1.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8,
    y: 1.9,
    w: 1.0,
    h: 0.08,
    fill: { color: COLORS.accentGold },
  });

  // Eyebrow
  slide1.addText('REPORT PENJUALAN · MANAGER VIEW', {
    x: 0.8,
    y: 2.2,
    w: 8.0,
    h: 0.3,
    fontSize: 13,
    bold: true,
    color: COLORS.primaryDark,
    fontFace: 'Arial',
  });

  // Main Title
  slide1.addText('Laporan Kinerja Penjualan', {
    x: 0.8,
    y: 2.6,
    w: 11.0,
    h: 1.0,
    fontSize: 40,
    bold: true,
    color: COLORS.darkText,
    fontFace: 'Georgia',
  });

  // Subtitle
  slide1.addText(`PT. ACTiV Teknologi Solusi · Periode ${monthYear}`, {
    x: 0.8,
    y: 3.7,
    w: 10.0,
    h: 0.4,
    fontSize: 18,
    color: COLORS.grayText,
    fontFace: 'Arial',
  });

  // Scope info cards
  slide1.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.8,
    y: 4.5,
    w: 11.73,
    h: 1.5,
    fill: { color: COLORS.surfaceLight },
    line: { color: COLORS.grayBorder, width: 1 },
    rectRadius: 0.1,
  });

  slide1.addText(
    [
      { text: 'Cakupan Laporan:\n', options: { bold: true, color: COLORS.primaryDark, fontSize: 13 } },
      { text: `• Filter Sales: ${filterSalesName}\n`, options: { color: COLORS.darkText, fontSize: 11 } },
      { text: `• Business Unit: ${filterBuName}\n`, options: { color: COLORS.darkText, fontSize: 11 } },
      { text: `• Status Data: ${filterStatus.toUpperCase()} (${totalCount} dokumen quotation)\n`, options: { color: COLORS.darkText, fontSize: 11 } },
    ],
    { x: 1.1, y: 4.65, w: 10.0, h: 1.2 }
  );

  // Meta footer on cover
  slide1.addText(`Dibuat pada ${dateFormatted} · Pengguna: ${userName}`, {
    x: 0.8,
    y: 6.8,
    w: 10.0,
    h: 0.3,
    fontSize: 11,
    color: COLORS.grayText,
    fontFace: 'Arial',
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SLIDE 2: RINGKASAN BULAN INI (EXECUTIVE SUMMARY)
  // ─────────────────────────────────────────────────────────────────────────────
  const slide2 = pptx.addSlide();
  slide2.background = { color: COLORS.white };

  // Accent bar
  slide2.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 0.5, w: 0.8, h: 0.08, fill: { color: COLORS.accentGold } });
  slide2.addText('Ringkasan Periode Ini', { x: 0.8, y: 0.7, w: 8.0, h: 0.6, fontSize: 26, bold: true, color: COLORS.darkText, fontFace: 'Georgia' });
  slide2.addText('Omzet, pipeline, dan deal dibandingkan dengan target.', { x: 0.8, y: 1.3, w: 8.0, h: 0.3, fontSize: 12, color: COLORS.grayText, fontFace: 'Arial' });

  // Big OMZET Card (Hijau Qsales Solid)
  slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.8,
    y: 1.8,
    w: 5.2,
    h: 4.8,
    fill: { color: COLORS.primaryDark },
    line: { color: COLORS.primary, width: 1.5 },
    rectRadius: 0.12,
  });

  slide2.addText('OMZET / REALISASI DEAL', {
    x: 1.1,
    y: 2.2,
    w: 4.6,
    h: 0.3,
    fontSize: 13,
    bold: true,
    color: COLORS.surfaceLight,
    fontFace: 'Arial',
  });

  slide2.addText(formatCurrency(approvedTotal), {
    x: 1.1,
    y: 2.7,
    w: 4.6,
    h: 1.1,
    fontSize: 32,
    bold: true,
    color: COLORS.white,
    fontFace: 'Georgia',
  });

  slide2.addText(`${approvedList.length} deal / approved PO`, {
    x: 1.1,
    y: 4.0,
    w: 4.6,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: COLORS.accentGold,
    fontFace: 'Arial',
  });

  slide2.addText(
    `Total Penawaran Aktif:\n${formatCurrency(totalNilai)} dari ${totalCount} quotation.\n\nRealisasi deal mencapai ${dataMasukToDealRate}% dari seluruh quotation yang diproses.`,
    {
      x: 1.1,
      y: 4.7,
      w: 4.6,
      h: 1.5,
      fontSize: 11,
      color: COLORS.surfaceLight,
      fontFace: 'Arial',
    }
  );

  // 4 KPI Cards in a 2x2 grid on the right side
  const kpiCards = [
    { title: 'Data Masuk', value: `${totalCount}`, desc: `${totalCount} quotation dalam filter`, colorBar: COLORS.primary },
    { title: 'SPH Belum Diproses / Sent', value: `${sentList.length}`, desc: formatCurrency(sentTotal), colorBar: COLORS.accentGold },
    { title: 'Hot Progress', value: `${hotProgressList.length}`, desc: formatCurrency(hotProgressTotal), colorBar: COLORS.primary },
    { title: 'Deal / PO', value: `${approvedList.length}`, desc: formatCurrency(approvedTotal), colorBar: COLORS.primaryDark },
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
      y: cardY + 0.7,
      w: cardW - 0.4,
      h: 0.8,
      fontSize: 32,
      bold: true,
      color: COLORS.darkText,
      fontFace: 'Georgia',
    });

    slide2.addText(kpi.desc, {
      x: cardX + 0.3,
      y: cardY + 1.6,
      w: cardW - 0.4,
      h: 0.4,
      fontSize: 11,
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
  slide3.addText('Dari data masuk sampai deal periode ini.', { x: 0.8, y: 1.3, w: 8.0, h: 0.3, fontSize: 12, color: COLORS.grayText, fontFace: 'Arial' });

  // Funnel / Column Chart on Left
  const pipelineData = [
    { name: 'Pipeline', labels: ['Data Masuk', 'SPH Sent', 'Hot Progress', 'Deal PO'], values: [totalCount || 1, sentList.length, hotProgressList.length, approvedList.length] },
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
    catAxisLabelFontSize: 11,
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

  slide3.addText('Data masuk → Deal', {
    x: 8.7,
    y: convCard1Y + 0.3,
    w: 3.5,
    h: 0.3,
    fontSize: 13,
    color: COLORS.grayText,
    fontFace: 'Arial',
  });

  slide3.addText(`${dataMasukToDealRate}%`, {
    x: 8.7,
    y: convCard1Y + 0.75,
    w: 3.5,
    h: 0.8,
    fontSize: 42,
    bold: true,
    color: COLORS.accentGold,
    fontFace: 'Georgia',
  });

  slide3.addText(`${approvedList.length} dari ${totalCount} penawaran sukses menjadi PO.`, {
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

  slide3.addText('SPH / Penawaran → Deal', {
    x: 8.7,
    y: convCard2Y + 0.3,
    w: 3.5,
    h: 0.3,
    fontSize: 13,
    color: COLORS.grayText,
    fontFace: 'Arial',
  });

  slide3.addText(`${sphToDealRate}%`, {
    x: 8.7,
    y: convCard2Y + 0.75,
    w: 3.5,
    h: 0.8,
    fontSize: 42,
    bold: true,
    color: COLORS.accentGold,
    fontFace: 'Georgia',
  });

  slide3.addText(`Tingkat closing dari penawaran yang sudah terkirim ke customer.`, {
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
  // SLIDE 4: DEAL PERIODE INI (TABEL)
  // ─────────────────────────────────────────────────────────────────────────────
  const slide4 = pptx.addSlide();
  slide4.background = { color: COLORS.white };

  slide4.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 0.5, w: 0.8, h: 0.08, fill: { color: COLORS.accentGold } });
  slide4.addText('Deal Periode Ini', { x: 0.8, y: 0.7, w: 8.0, h: 0.6, fontSize: 26, bold: true, color: COLORS.darkText, fontFace: 'Georgia' });
  slide4.addText(`${approvedList.length} deal dengan total ${formatCurrency(approvedTotal)}`, { x: 0.8, y: 1.3, w: 8.0, h: 0.3, fontSize: 13, bold: true, color: COLORS.primaryDark, fontFace: 'Arial' });

  // Table rows
  const tableData = [
    [
      { text: 'Tanggal', options: { bold: true, fill: COLORS.primary, color: COLORS.white, align: 'center' } },
      { text: 'Nama Customer', options: { bold: true, fill: COLORS.primary, color: COLORS.white } },
      { text: 'Sales / Pembuat', options: { bold: true, fill: COLORS.primary, color: COLORS.white } },
      { text: 'No. Quotation / PO', options: { bold: true, fill: COLORS.primary, color: COLORS.white } },
      { text: 'Nilai Deal', options: { bold: true, fill: COLORS.primary, color: COLORS.white, align: 'right' } },
    ],
  ];

  const maxRows = 10;
  const displayDeals = approvedList.slice(0, maxRows);

  if (displayDeals.length > 0) {
    displayDeals.forEach((q, idx) => {
      const isEven = idx % 2 === 0;
      const rowBg = isEven ? COLORS.white : COLORS.surfaceTint;
      tableData.push([
        { text: formatDate(q.date || q.created_at), options: { fill: rowBg, color: COLORS.grayText, fontSize: 10, align: 'center' } },
        { text: q.customer?.name || '-', options: { fill: rowBg, color: COLORS.darkText, bold: true, fontSize: 10 } },
        { text: q.sales?.name || q.creator?.name || '-', options: { fill: rowBg, color: COLORS.grayText, fontSize: 10 } },
        { text: q.number || q.quotation_no || q.id || '-', options: { fill: rowBg, color: COLORS.grayText, fontSize: 10 } },
        { text: formatCurrency(calcGrandTotal(q)), options: { fill: rowBg, color: COLORS.primaryDark, bold: true, fontSize: 10, align: 'right' } },
      ]);
    });
  } else {
    tableData.push([
      { text: '-', options: { align: 'center' } },
      { text: 'Belum ada deal berstatus PO pada filter ini.' },
      { text: '-' },
      { text: '-' },
      { text: 'Rp 0', options: { align: 'right' } },
    ]);
  }

  slide4.addTable(tableData, {
    x: 0.8,
    y: 1.8,
    w: 11.73,
    colW: [1.6, 3.6, 2.2, 2.3, 2.03],
    rowH: 0.45,
    border: { pt: 0.5, color: COLORS.grayBorder },
    fontSize: 10,
    fontFace: 'Arial',
  });

  if (approvedList.length > maxRows) {
    slide4.addText(`* Menampilkan ${maxRows} deal teratas dari total ${approvedList.length} deal.`, {
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
  slide5.addText('Omzet berhasil dibanding penawaran kalah/batal pada periode ini.', { x: 0.8, y: 1.3, w: 8.0, h: 0.3, fontSize: 12, color: COLORS.grayText, fontFace: 'Arial' });

  // 3 Large Comparative Cards
  const compareCards = [
    {
      title: 'Omzet Deal Periode Ini',
      amount: formatCurrency(approvedTotal),
      sub: `${approvedList.length} deal berhasil`,
      desc: 'Quotation berhasil disetujui / PO terbit',
      bg: COLORS.primaryDark,
      titleColor: COLORS.surfaceLight,
      amountColor: COLORS.white,
      subColor: COLORS.accentGold,
      border: COLORS.primary,
    },
    {
      title: 'Dalam Negosiasi / Sent',
      amount: formatCurrency(sentTotal),
      sub: `${sentList.length} penawaran menunggu`,
      desc: 'Menunggu review / konfirmasi customer',
      bg: COLORS.surfaceLight,
      titleColor: COLORS.grayText,
      amountColor: COLORS.darkText,
      subColor: COLORS.primaryDark,
      border: COLORS.grayBorder,
    },
    {
      title: 'Lead Kalah / Batal (Lost)',
      amount: formatCurrency(lostTotal),
      sub: `${lostList.length} penawaran ditolak/expired`,
      desc: 'Rejected, expired, atau cancelled',
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
      x: cardX + 0.3,
      y: cardY + 0.4,
      w: cardW - 0.6,
      h: 0.35,
      fontSize: 14,
      bold: true,
      color: c.titleColor,
      fontFace: 'Arial',
    });

    slide5.addText(c.amount, {
      x: cardX + 0.3,
      y: cardY + 1.0,
      w: cardW - 0.6,
      h: 1.0,
      fontSize: 26,
      bold: true,
      color: c.amountColor,
      fontFace: 'Georgia',
    });

    slide5.addText(c.sub, {
      x: cardX + 0.3,
      y: cardY + 2.2,
      w: cardW - 0.6,
      h: 0.4,
      fontSize: 13,
      bold: true,
      color: c.subColor,
      fontFace: 'Arial',
    });

    slide5.addText(c.desc, {
      x: cardX + 0.3,
      y: cardY + 2.8,
      w: cardW - 0.6,
      h: 0.8,
      fontSize: 11,
      color: c.titleColor,
      fontFace: 'Arial',
    });
  });

  addFooter(slide5, 5);

  // Save the PPTX file
  const fileName = `Qsales-Manager-Report-${dateStamp}.pptx`;
  await pptx.writeFile({ fileName });
}
