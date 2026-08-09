// Utility to generate printable PDF view for Quotations
import { format, parseISO, isValid } from 'date-fns';
import { id as idLocale, enUS as enLocale } from 'date-fns/locale';

import { getCompanyInfo } from './companyInfo.js';
import { PRODUCTS } from '../data.js';

const formatCurrencyDecimals = (val) => {
  const num = Number(val) || 0;
  const formattedStr = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return formattedStr;
};

const formatDateFull = (str, locale = idLocale) => {
  if (!str) return '-';
  try {
    const d = typeof str === 'string' ? parseISO(str) : new Date(str);
    return isValid(d) ? format(d, 'dd MMMM yyyy', { locale }) : str;
  } catch { return str; }
};

const formatDateSlash = (str) => {
  if (!str) return '-';
  try {
    const d = typeof str === 'string' ? parseISO(str) : new Date(str);
    return isValid(d) ? format(d, 'dd/MM/yyyy') : str;
  } catch { return str; }
};

const formatExpiredWithDay = (str, locale = idLocale, lang = 'id') => {
  if (!str) return '-';
  try {
    const d = typeof str === 'string' ? parseISO(str) : new Date(str);
    if (!isValid(d)) return str;
    const dayName = format(d, 'EEEE', { locale });
    const dateStr = format(d, 'dd MMMM yyyy', { locale });
    const expiredPrefix = lang === 'en' ? 'Valid until' : 'Expired';
    return `${expiredPrefix} ${dayName}, ${dateStr}`;
  } catch { return str; }
};

const translateTerm = (term, lang) => {
  if (!term || typeof term !== 'string') return term;
  if (lang !== 'en') return term;

  let t = term.trim();

  // Filter out if term is redundant section header like "1. Syarat & Ketentuan"
  if (/^\d+\.\s*Syarat\s*&\s*Ketentuan$/i.test(t) || /^Syarat\s*&\s*Ketentuan$/i.test(t)) {
    return null;
  }

  // Strip hardcoded list numbers like "2. ", "3. " so standard ordered list `<ol>` formats correctly
  t = t.replace(/^\d+\.\s*/, '');

  const map = [
    { from: /Harga sudah termasuk PPN 11%/gi, to: 'Prices include 11% VAT' },
    { from: /Harga belum termasuk PPN 11%/gi, to: 'Prices exclude 11% VAT' },
    { from: /Harga belum termasuk PPN 12%/gi, to: 'Prices exclude 12% VAT' },
    { from: /Harga sudah termasuk PPN (\d+)%/gi, to: 'Prices include $1% VAT' },
    { from: /Harga belum termasuk PPN (\d+)%/gi, to: 'Prices exclude $1% VAT' },
    { from: /Harga belum termasuk biaya instalasi by remote & onsite/gi, to: 'Prices exclude remote & onsite installation fees' },
    { from: /Harga belum termasuk biaya instalasi/gi, to: 'Prices exclude installation fees' },
    { from: /Pembayaran CBO \(Cash before delivery\)/gi, to: 'Payment terms: CBO (Cash before delivery)' },
    { from: /Pembayaran (\d+)%\s*DP,\s*pelunasan (\d+)%\s*setelah pengiriman\s*\(?([^)]*)\)?/gi, to: 'Payment $1% Down Payment, $2% balance after delivery ($3)' },
    { from: /Pembayaran (\d+)%\s*DP,\s*pelunasan (\d+)%\s*setelah pengiriman/gi, to: 'Payment $1% Down Payment, $2% balance after delivery' },
    { from: /Pembayaran (\d+)%\s*DP/gi, to: 'Payment $1% Down Payment' },
    { from: /pelunasan (\d+)%\s*setelah pengiriman/gi, to: '$1% balance payment after delivery' },
    { from: /Dikenakan biaya pembatalan (\d+)% dari nilai PO jika pembeli membatalkan PO/gi, to: 'A cancellation fee of $1% of the PO value applies if buyer cancels PO' },
    { from: /Dikenakan biaya pembatalan/gi, to: 'Cancellation fee applies' },
    { from: /Indent (\d+)-(\d+) minggu setelah PO/gi, to: 'Lead time $1-$2 weeks after PO' },
    { from: /Indent (\d+) hingga (\d+) minggu setelah PO/gi, to: 'Lead time $1-$2 weeks after PO' },
    { from: /Indent (\d+)-(\d+) minggu/gi, to: 'Lead time $1-$2 weeks' },
    { from: /Indent (\d+) minggu/gi, to: 'Lead time $1 weeks' },
    { from: /Garansi (\d+) tahun untuk (.*) produk/gi, to: '$1-year warranty for $2 products' },
    { from: /Garansi (\d+) tahun/gi, to: '$1-year warranty' },
    { from: /Garansi (\d+) bulan/gi, to: '$1-month warranty' },
    { from: /Harga FOB Jakarta Delivery/gi, to: 'FOB Jakarta Delivery Price' },
    { from: /Harga FOB Jakarta/gi, to: 'FOB Jakarta Price' },
    { from: /Ready stock \(limited stock\)/gi, to: 'Ready stock (limited stock)' },
  ];

  for (const r of map) {
    t = t.replace(r.from, r.to);
  }

  return t;
};

const translateDynamicText = (text, lang) => {
  if (!text || typeof text !== 'string' || lang !== 'en') return text;
  let s = text;
  const replacements = [
    { from: /\bGaransi Resmi\b/gi, to: 'Official Warranty' },
    { from: /\bGaransi\b/gi, to: 'Warranty' },
    { from: /\bTahun\b/gi, to: 'Years' },
    { from: /\bBulan\b/gi, to: 'Months' },
    { from: /\bHari\b/gi, to: 'Days' },
    { from: /\bSudah Termasuk\b/gi, to: 'Includes' },
    { from: /\bBelum Termasuk\b/gi, to: 'Excludes' },
    { from: /\bTermasuk\b/gi, to: 'Includes' },
  ];
  for (const r of replacements) {
    s = s.replace(r.from, r.to);
  }
  return s;
};

const TRANSLATIONS = {
  id: {
    quotationNo: 'QUOTATION NO',
    to: 'Kepada :',
    sender: 'Pengirim :',
    priceInIdr: 'Harga dalam IDR',
    no: 'NO',
    sku: 'SKU',
    brandName: 'NAMA BRAND',
    descProduct: 'Deskripsi Produk',
    productDisplay: 'Tampilan Produk',
    qty: 'JML',
    price: 'HARGA',
    totalPrice: 'TOTAL HARGA',
    emptyItem: 'Belum ada item produk.',
    totalAllProduct: 'TOTAL',
    ppn: 'PPN (VAT) 11%',
    grandTotal: 'GRAND TOTAL',
    termsTitle: 'Syarat & Ketentuan',
    bankAcc: 'Nomor Rekening :',
    branchOffice: 'Kantor Cabang Utama Alam Sutera ( Tangerang Selatan )',
    approvalBy: 'Disetujui oleh :',
    signatureStamp: 'Tanda Tangan & Cap Pelanggan',
    noImage: 'Tidak Ada Gambar',
    defaultTerms: [
      'Harga sudah termasuk PPN 11%',
      'Harga belum termasuk biaya instalasi by remote & onsite',
      'Pembayaran CBO (Cash before delivery)',
      'Ready stock (limited stock)',
      'Dikenakan biaya pembatalan 50% dari nilai PO jika pembeli membatalkan PO',
      'Garansi 2 tahun untuk produk Logitech',
      'Harga FOB Jakarta',
    ]
  },
  en: {
    quotationNo: 'QUOTATION NO',
    to: 'To :',
    sender: 'Sender :',
    priceInIdr: 'Price in IDR',
    no: 'NO',
    sku: 'SKU',
    brandName: 'BRAND NAME',
    descProduct: 'Product Description',
    productDisplay: 'Product Display',
    qty: 'QTY',
    price: 'PRICE',
    totalPrice: 'TOTAL PRICE',
    emptyItem: 'No product items available.',
    totalAllProduct: 'TOTAL ALL PRODUCTS',
    ppn: 'VAT 11%',
    grandTotal: 'GRAND TOTAL',
    termsTitle: 'Terms & Conditions',
    bankAcc: 'Bank Account :',
    branchOffice: 'Alam Sutera Main Branch ( South Tangerang )',
    approvalBy: 'Approved by :',
    signatureStamp: 'Customer Signature & Stamp',
    noImage: 'No Image',
    defaultTerms: [
      'Prices include 11% VAT',
      'Prices exclude remote & onsite installation fees',
      'Payment terms: CBO (Cash before delivery)',
      'Ready stock (limited stock)',
      'A cancellation fee of 50% of the PO value applies if buyer cancels PO',
      '2-year warranty for Logitech products',
      'FOB Jakarta Price',
    ]
  }
};

import html2pdf from 'html2pdf.js';

export function generateQuotationHTML(q, withImage = true, bankAccount = null, lang = 'id', includePrintScript = true, isPdfMode = false) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.id;
  const dateLocale = lang === 'en' ? enLocale : idLocale;
  const COMPANY = getCompanyInfo();
  const calcTax = q.calc_tax !== false;
  const showTax = q.show_tax !== false;
  const ppnRate = q.ppn_rate || 0.11;

  const bakeTaxIntoItems = calcTax && !showTax;
  const taxMultiplier = bakeTaxIntoItems ? (1 + ppnRate) : 1;

  // Dedicated styling configurations for PDF Download vs Web Print
  const baseFontSize = isPdfMode ? '9px' : '8px';
  const descFontSize = isPdfMode ? '8px' : '7px';
  const prodNameFontSize = isPdfMode ? '9.5px' : '8.5px';
  const headerRightWidth = isPdfMode ? '250px' : '220px';
  const logoMaxHeight = isPdfMode ? '50px' : '45px';
  const logoMaxWidth = isPdfMode ? '180px' : '160px';
  const tableBorderColor = isPdfMode ? '#6b7280' : '#9ca3af';
  const pageMargin = isPdfMode ? '10mm' : '25mm 20mm';
  const tdFontSize = isPdfMode ? '8.5px' : '7.5px';
  const tdPadding = isPdfMode ? '4px 5px' : '3px 4px';
  const thPadding = isPdfMode ? '4px 3px' : '3px 2px';
  const termsFontSize = isPdfMode ? '8.5px' : '7.5px';

  const items = q.items || [];
  const baseSubtotal = items.reduce((sum, i) => sum + ((i.qty || 0) * (i.price || 0)), 0);
  const subtotal = bakeTaxIntoItems ? baseSubtotal * taxMultiplier : baseSubtotal;
  const ppn = (calcTax && showTax) ? subtotal * ppnRate : 0;
  const grand = subtotal + ppn;

  let itemRows = '';
  const colSpanTotal = withImage ? 8 : 7;

  items.forEach((item, idx) => {
    const prod = item.product;
    const rawProductName = prod?.name || item.name || item.product_name || '-';
    const sku = prod?.sku || item.sku || '-';

    const catalogProd = PRODUCTS.find(p => 
      (p.sku && sku && p.sku.toLowerCase() === sku.toLowerCase()) || 
      (p.name && rawProductName && p.name.toLowerCase() === rawProductName.toLowerCase())
    );

    const brandName = item.brand
      || prod?.brand?.name
      || prod?.brands?.name
      || catalogProd?.brand
      || (typeof prod?.brand_id === 'string' ? prod.brand_id : null)
      || 'ACTIV';

    let imageUrl = 
      item.image_url || 
      item.image || 
      prod?.image_url || 
      prod?.image || 
      prod?.image_path ||
      catalogProd?.image_url || 
      null;

    if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('/')) {
      imageUrl = `${window.location.origin}${imageUrl}`;
    }

    const productName = translateDynamicText(rawProductName, lang);
    const rawDesc = item.description || prod?.description || catalogProd?.description || '';
    const desc = translateDynamicText(rawDesc, lang);

    const price = (item.price || 0) * taxMultiplier;
    const qty = item.qty || 1;
    const itemTotal = qty * price;

    const imageHtml = imageUrl
      ? `<img src="${imageUrl}" style="max-width: 75px; max-height: 42px; object-fit: contain; display: block; margin: 0 auto;" alt="${productName}" />`
      : `<div style="width: 55px; height: 30px; background: #f3f4f6; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 7px;">${t.noImage}</div>`;

    itemRows += `
      <tr>
        <td style="text-align: center; font-size: ${prodNameFontSize}; vertical-align: top;">${idx + 1}</td>
        <td style="text-align: center; font-size: ${tdFontSize}; vertical-align: top; word-break: break-all;">${sku}</td>
        <td style="text-align: center; font-size: ${tdFontSize}; font-style: italic; vertical-align: top;">${brandName}</td>
        <td style="font-size: ${tdFontSize}; vertical-align: top; text-align: left; line-height: 1.25;">
          <strong style="font-size: ${prodNameFontSize}; display: block; margin-bottom: 1.5px;">${productName}</strong>
          ${desc ? `<div style="color: #333; font-size: ${descFontSize}; line-height: 1.25; white-space: pre-wrap;">${desc}</div>` : ''}
        </td>
        ${withImage ? `
          <td style="padding: 2px; text-align: center; vertical-align: middle;">
            ${imageHtml}
          </td>
        ` : ''}
        <td style="text-align: center; font-size: ${prodNameFontSize}; vertical-align: top;">${qty}</td>
        <td style="font-size: ${tdFontSize}; vertical-align: top; padding: ${tdPadding};">
          <table style="width: 100%; border: none !important; border-collapse: collapse; margin: 0; padding: 0; background: transparent !important;">
            <tr>
              <td style="border: none !important; padding: 0; text-align: left; font-size: inherit; font-weight: inherit; background: transparent !important; width: 20px;">Rp</td>
              <td style="border: none !important; padding: 0; text-align: right; font-size: inherit; font-weight: inherit; background: transparent !important;">${formatCurrencyDecimals(price)}</td>
            </tr>
          </table>
        </td>
        <td style="font-size: ${tdFontSize}; vertical-align: top; padding: ${tdPadding};">
          <table style="width: 100%; border: none !important; border-collapse: collapse; margin: 0; padding: 0; background: transparent !important;">
            <tr>
              <td style="border: none !important; padding: 0; text-align: left; font-size: inherit; font-weight: inherit; background: transparent !important; width: 20px;">Rp</td>
              <td style="border: none !important; padding: 0; text-align: right; font-size: inherit; font-weight: inherit; background: transparent !important;">${formatCurrencyDecimals(itemTotal)}</td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  });

  // Terms list
  const rawTerms = q.terms && Array.isArray(q.terms) && q.terms.length > 0 ? q.terms : t.defaultTerms;
  const termsList = rawTerms
    .map(term => translateTerm(term, lang))
    .filter(Boolean);

  const picObj = q.pic || q.customer?.pics?.find(p => p.is_primary) || q.customer?.pics?.[0] || null;
  const creatorObj = q.creator || q.sales || null;

  // Bank Info
  const bankName = bankAccount?.bank_name || 'BCA';
  const bankNum = bankAccount?.account_number || '6044447899';
  const bankHolder = bankAccount?.account_name || 'PT ALFA CIPTA TEKNOLOGI VIRTUAL';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <base href="${window.location.origin}/" />
        <title>Quotation ${q.id} - ${q.customer?.name || 'Customer'}</title>
        <style>
          *, html, body, div, table, tr, th, td {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-sizing: border-box;
          }
          @page { margin: ${isPdfMode ? '0' : pageMargin}; size: A4 portrait; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111;
            margin: 0;
            padding: ${isPdfMode ? '25px 35px' : '0'};
            font-size: ${baseFontSize};
            line-height: 1.2;
            width: ${isPdfMode ? '794px' : '100%'};
            box-sizing: border-box;
            overflow: hidden;
            background: #ffffff;
          }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed; }
          .header-left { vertical-align: top; text-align: left; width: 50%; font-size: ${baseFontSize}; }
          .header-right { vertical-align: top; text-align: left; width: 50%; font-size: ${tdFontSize}; color: #333; line-height: 1.25; }
          
          .table-container {
            width: 100%;
            box-sizing: border-box;
          }
          .table-items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0px;
            table-layout: fixed;
          }
          .table-items th, .table-items td {
            border: 1px solid ${tableBorderColor} !important;
            padding: ${tdPadding};
            box-sizing: border-box;
          }
          .table-items th {
            background-color: #f1f5f9 !important;
            color: #000000 !important;
            padding: ${thPadding};
            font-size: ${tdFontSize};
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
          }
          .terms { font-size: ${termsFontSize}; margin-top: 8px; line-height: 1.35; color: #222; }
          .terms ol { margin: 2px 0 0 12px; padding: 0; }
        </style>
      </head>
      <body>
        <div style="width: 100%; box-sizing: border-box; overflow: hidden;">
          <!-- Header -->
          <table class="header-table">
            <tr>
              <td class="header-left">
                <h1 style="font-size: 20px; font-weight: bold; margin: 0 0 8px 0; color: #000; letter-spacing: 0.5px;">QUOTATION</h1>
                
                <div style="font-size: 8.5px; line-height: 1.35; margin-bottom: 10px;">
                  <div style="font-weight: bold;">${t.quotationNo} ${q.id}</div>
                  <div>${formatDateSlash(q.date || q.created_at)}</div>
                  <div style="color: #ef4444; font-weight: bold;">${formatExpiredWithDay(q.expired || q.expired_at, dateLocale, lang)}</div>
                </div>

                <!-- Destination Block (To :) -->
                <div style="font-size: 8.5px; line-height: 1.35; margin-bottom: 10px;">
                  <div style="font-weight: bold; margin-bottom: 2px;">${t.to}</div>
                  ${picObj?.name ? `<div style="font-weight: bold;">${picObj.name}</div>` : ''}
                  <div style="font-weight: bold; text-transform: uppercase;">${q.customer?.name || '—'}</div>
                  ${q.customer?.address ? `<div>${q.customer.address}</div>` : ''}
                  ${picObj?.phone ? `<div>Mobile : ${picObj.phone}</div>` : ''}
                  ${picObj?.email ? `<div><a href="mailto:${picObj.email}" style="color: #2563eb; text-decoration: underline;">${picObj.email}</a></div>` : ''}
                </div>

                <!-- Sender Block (Sender :) -->
                <div style="font-size: 8.5px; line-height: 1.35;">
                  <div style="font-weight: bold; margin-bottom: 2px;">${t.sender}</div>
                  <div style="font-weight: bold;">${creatorObj?.name || 'Meyke'}</div>
                  <div style="font-weight: bold; text-transform: uppercase;">${COMPANY.name} (${COMPANY.brand})</div>
                  <div>Mobile : ${creatorObj?.mobile || '0811-1010-576'}</div>
                  <div>Office : ${COMPANY.phone}</div>
                  <div><a href="mailto:${creatorObj?.email || COMPANY.email}" style="color: #2563eb; text-decoration: underline;">${creatorObj?.email || COMPANY.email}</a></div>
                </div>
              </td>

              <td class="header-right">
                <div style="width: ${headerRightWidth}; margin-left: auto; text-align: left;">
                  <img src="/logo_quot.png" alt="ACTIV" style="max-height: ${logoMaxHeight}; max-width: ${logoMaxWidth}; display: block; margin-bottom: 4px; object-fit: contain;" onError="this.src='https://placehold.co/180x45/00a88f/ffffff?text=ACTIV'" />
                  <div style="font-weight: bold; font-size: 8.5px; margin-bottom: 2px;">${COMPANY.name}</div>
                  <div style="font-size: 7.5px; line-height: 1.25; color: #333;">${COMPANY.address}</div>
                  ${COMPANY.address2 ? `<div style="font-size: 7.5px; line-height: 1.25; color: #333;">${COMPANY.address2}</div>` : ''}
                  ${COMPANY.branch ? `<div style="font-size: 7.5px; line-height: 1.25; color: #333;">${COMPANY.branch}</div>` : ''}
                  ${COMPANY.branch2 ? `<div style="font-size: 7.5px; line-height: 1.25; color: #333;">${COMPANY.branch2}</div>` : ''}
                  <div style="font-size: 7.5px; margin-top: 3px; color: #333;">T : ${COMPANY.phone} | E: ${creatorObj?.email || COMPANY.email} | W: ${COMPANY.website}</div>
                </div>
              </td>
            </tr>
          </table>

          <!-- Price label -->
          <div style="font-size: 8px; color: #4b5563; margin-bottom: 3px;">${t.priceInIdr}</div>

          <!-- Products Table with Totals integrated inside container to prevent right border clipping -->
          <div class="table-container">
            <table class="table-items">
              <thead>
                <tr>
                  <th style="width: 4%;">${t.no}</th>
                  <th style="width: 11%;">${t.sku}</th>
                  <th style="width: 10%;">${t.brandName}</th>
                  <th style="width: ${withImage ? '35%' : '47%'};">${t.descProduct}</th>
                  ${withImage ? `<th style="width: 12%;">${t.productDisplay}</th>` : ''}
                  <th style="width: 4%;">${t.qty}</th>
                  <th style="width: 12%;">${t.price}</th>
                  <th style="width: 12%;">${t.totalPrice}</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows || `<tr><td colspan="${colSpanTotal}" style="text-align: center; padding: 10px;">${t.emptyItem}</td></tr>`}
                
                <!-- Summary Totals Rows matching Image 2 -->
                <tr style="font-weight: bold;">
                  <td colspan="${withImage ? 5 : 4}" style="border: none !important; border-top: 1px solid transparent !important; background: transparent !important;"></td>
                  <td colspan="2" style="text-align: right; font-size: ${tdFontSize}; padding-right: 8px; border-left: 1px solid ${tableBorderColor} !important; border-top: 1px solid ${tableBorderColor} !important;">${t.totalAllProduct}</td>
                  <td style="font-size: ${tdFontSize}; vertical-align: middle; border-top: 1px solid ${tableBorderColor} !important; padding: ${tdPadding};">
                    <table style="width: 100%; border: none !important; border-collapse: collapse; margin: 0; padding: 0; background: transparent !important;">
                      <tr>
                        <td style="border: none !important; padding: 0; text-align: left; font-size: inherit; font-weight: inherit; background: transparent !important; width: 20px;">Rp</td>
                        <td style="border: none !important; padding: 0; text-align: right; font-size: inherit; font-weight: inherit; background: transparent !important;">${formatCurrencyDecimals(subtotal)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${(calcTax && showTax) ? `
                  <tr style="font-weight: bold;">
                    <td colspan="${withImage ? 5 : 4}" style="border: none !important; border-top: 1px solid transparent !important; background: transparent !important;"></td>
                    <td colspan="2" style="text-align: right; font-size: ${tdFontSize}; padding-right: 8px; border-left: 1px solid ${tableBorderColor} !important;">${t.ppn}</td>
                    <td style="font-size: ${tdFontSize}; vertical-align: middle; padding: ${tdPadding};">
                      <table style="width: 100%; border: none !important; border-collapse: collapse; margin: 0; padding: 0; background: transparent !important;">
                        <tr>
                          <td style="border: none !important; padding: 0; text-align: left; font-size: inherit; font-weight: inherit; background: transparent !important; width: 20px;">Rp</td>
                          <td style="border: none !important; padding: 0; text-align: right; font-size: inherit; font-weight: inherit; background: transparent !important;">${formatCurrencyDecimals(ppn)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                ` : ''}
                <tr style="font-weight: bold;">
                  <td colspan="${withImage ? 5 : 4}" style="border: none !important; border-top: 1px solid transparent !important; background: transparent !important;"></td>
                  <td colspan="2" style="text-align: right; font-size: ${tdFontSize}; padding-right: 8px; border-left: 1px solid ${tableBorderColor} !important;">${t.grandTotal}</td>
                  <td style="font-size: ${tdFontSize}; vertical-align: middle; padding: ${tdPadding};">
                    <table style="width: 100%; border: none !important; border-collapse: collapse; margin: 0; padding: 0; background: transparent !important;">
                      <tr>
                        <td style="border: none !important; padding: 0; text-align: left; font-size: inherit; font-weight: inherit; background: transparent !important; width: 20px;">Rp</td>
                        <td style="border: none !important; padding: 0; text-align: right; font-size: inherit; font-weight: inherit; background: transparent !important;">${formatCurrencyDecimals(grand)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Terms & Signature Section -->
          <div class="terms" style="margin-top: 8px; page-break-inside: avoid;">
            <div style="font-weight: bold; margin-bottom: 2px;">${t.termsTitle}</div>
            <div style="margin-top: 2px; font-size: ${termsFontSize}; line-height: 1.35; color: #222;">
              ${termsList.map((term, idx) => `
                <div style="display: flex; gap: 4px; align-items: flex-start; margin-bottom: 1.5px;">
                  <span style="font-weight: bold; min-width: 14px;">${idx + 1}.</span>
                  <div style="flex: 1;">${term}</div>
                </div>
              `).join('')}
              <div style="display: flex; gap: 4px; align-items: flex-start; margin-bottom: 1.5px;">
                <span style="font-weight: bold; min-width: 14px;">${termsList.length + 1}.</span>
                <div style="flex: 1;">${t.bankAcc}<br/><strong>${bankName} : ${bankNum} - ${bankHolder}<br/>${t.branchOffice}</strong></div>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 10px; page-break-inside: avoid;">
            <div style="font-size: 8.5px; line-height: 1.2; text-align: right;">
              <strong>${t.approvalBy}</strong>
              <div style="height: 32px;"></div>
              <div style="font-weight: bold;">[ .................... ]</div>
              <div style="font-size: 7px; color: #666; font-style: italic;">${t.signatureStamp}</div>
            </div>
          </div>
        </div>

        ${includePrintScript ? `
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        ` : ''}
      </body>
    </html>
  `;

  return html;
}

// Option 1: Web Print (Browser Print Preview)
export function printQuotation(q, withImage = true, bankAccount = null, lang = 'id') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Mohon izinkan pop-up browser untuk mencetak / mendownload PDF Quotation.');
    return;
  }
  const html = generateQuotationHTML(q, withImage, bankAccount, lang, true, false);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

// Option 2: Direct PDF Download – uses native browser print (same quality as Web Print)
// Opens a dedicated popup with the quotation title set to the desired PDF filename.
// The user sees the browser print dialog; selecting "Save as PDF" downloads with proper filename.
export function downloadQuotationPDF(q, withImage = true, bankAccount = null, lang = 'id') {
  // Build the desired filename for the PDF
  const qId = q.id || 'document';
  const custName = q.customer?.name || q.customer_name || '';
  const rawFilename = custName
    ? `Quotation ${qId} - ${custName}`
    : `Quotation ${qId}`;
  // Remove chars illegal in filenames; browser uses <title> as default save name
  const safeTitle = rawFilename.replace(/[/\\?%*:|"<>]/g, '');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Mohon izinkan pop-up browser untuk mencetak / mendownload PDF Quotation.');
    return Promise.resolve();
  }

  // isPdfMode = false so same clean web-print CSS is used (proven to render correctly)
  const html = generateQuotationHTML(q, withImage, bankAccount, lang, false, false);

  // Inject a print script and override the document title to set the PDF save filename
  const htmlWithPrint = html.replace(
    /<title>.*?<\/title>/,
    `<title>${safeTitle}</title>`
  ).replace(
    '</body>',
    `<script>
      window.onload = function() {
        setTimeout(function() {
          window.print();
          // Close the popup shortly after print dialog is dismissed
          setTimeout(function() { window.close(); }, 1000);
        }, 500);
      };
    </script></body>`
  );

  printWindow.document.open();
  printWindow.document.write(htmlWithPrint);
  printWindow.document.close();

  return Promise.resolve();
}
