// Utility to generate printable PDF view for Quotations
import { format, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const COMPANY = {
  name: 'PT. Alfa Cipta Teknologi Virtual',
  brand: 'ACTIV',
  address: 'Infinity Office, Bellezza BSA 1st Floor Unit 106,',
  address2: 'Jl. Letjen Soepeno, Kebayoran Lama Jakarta Selatan 12210',
  branch: 'Rep off: Ruko Golden Boulevard Blok S No.26 Pahlawan Seribu, BSD',
  branch2: 'Serpong, Kota Tangerang Selatan, Serpong - Banten, 15315',
  phone: '(021) 50110987',
  email: 'sales@activ.co.id',
  website: 'www.activ.co.id',
};

const formatCurrencyDecimals = (val) => {
  const num = Number(val) || 0;
  const formattedStr = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return formattedStr;
};

const formatDateFull = (str) => {
  if (!str) return '-';
  try {
    const d = typeof str === 'string' ? parseISO(str) : new Date(str);
    return isValid(d) ? format(d, 'dd MMMM yyyy', { locale: idLocale }) : str;
  } catch { return str; }
};

const formatDateSlash = (str) => {
  if (!str) return '-';
  try {
    const d = typeof str === 'string' ? parseISO(str) : new Date(str);
    return isValid(d) ? format(d, 'dd/MM/yyyy') : str;
  } catch { return str; }
};

const formatExpiredWithDay = (str) => {
  if (!str) return '-';
  try {
    const d = typeof str === 'string' ? parseISO(str) : new Date(str);
    if (!isValid(d)) return str;
    const dayName = format(d, 'EEEE', { locale: idLocale });
    const dateStr = format(d, 'dd MMMM yyyy', { locale: idLocale });
    return `Expired ${dayName}, ${dateStr}`;
  } catch { return str; }
};

export function printQuotation(q, withImage = true, bankAccount = null) {
  const calcTax = q.calc_tax !== false;
  const showTax = q.show_tax !== false;
  const ppnRate = q.ppn_rate || 0.11;

  const bakeTaxIntoItems = calcTax && !showTax;
  const taxMultiplier = bakeTaxIntoItems ? (1 + ppnRate) : 1;

  const items = q.items || [];
  const baseSubtotal = items.reduce((sum, i) => sum + ((i.qty || 0) * (i.price || 0)), 0);
  const subtotal = bakeTaxIntoItems ? baseSubtotal * taxMultiplier : baseSubtotal;
  const ppn = (calcTax && showTax) ? subtotal * ppnRate : 0;
  const grand = subtotal + ppn;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Mohon izinkan pop-up browser untuk mencetak / mendownload PDF Quotation.');
    return;
  }

  // Render item rows directly without brand category header rows
  let itemRows = '';
  items.forEach((item, idx) => {
    const prod = item.product;
    const brandName = item.brand
      || prod?.brand?.name
      || prod?.brands?.name
      || (typeof prod?.brand_id === 'string' ? prod.brand_id : null)
      || 'ACTIV';
    const imageUrl = prod?.image_url || item.image_url || null;
    const productName = prod?.name || item.name || item.product_name || '-';
    const sku = prod?.sku || item.sku || '-';
    const desc = prod?.description || item.description || '';

    const imageHtml = imageUrl
      ? `<img src="${imageUrl}" style="max-width: 90px; max-height: 55px; object-fit: contain; display: block; margin: 0 auto;" alt="${productName}" />`
      : `<div style="width: 70px; height: 40px; background: #f3f4f6; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 8px;">No Image</div>`;

    const displayedPrice = (item.price || 0) * taxMultiplier;
    const itemTotal = (item.qty || 0) * displayedPrice;

    itemRows += `
      <tr>
        <td style="text-align: center; border: 1px solid #9ca3af; padding: 6px 4px; font-size: 10px; vertical-align: top;">${idx + 1}</td>
        <td style="text-align: center; border: 1px solid #9ca3af; padding: 6px 4px; font-size: 9px; vertical-align: top; word-break: break-all;">${sku}</td>
        <td style="text-align: center; border: 1px solid #9ca3af; padding: 6px 4px; font-size: 9px; vertical-align: top;">${brandName}</td>
        <td style="border: 1px solid #9ca3af; padding: 6px 6px; font-size: 9px; vertical-align: top; text-align: left; line-height: 1.3;">
          <strong style="font-size: 10px; display: block; margin-bottom: 2px;">${productName}</strong>
          ${desc ? `<div style="color: #4b5563; white-space: pre-wrap;">${desc}</div>` : ''}
        </td>
        ${withImage ? `
          <td style="border: 1px solid #9ca3af; padding: 4px; text-align: center; vertical-align: middle;">
            ${imageHtml}
          </td>
        ` : ''}
        <td style="text-align: center; border: 1px solid #9ca3af; padding: 6px 4px; font-size: 10px; vertical-align: top;">${item.qty || 1}</td>
        <td style="border: 1px solid #9ca3af; padding: 6px 6px; font-size: 9px; vertical-align: top;">
          <div style="display: flex; justify-content: space-between;"><span>Rp</span><span>${formatCurrencyDecimals(displayedPrice)}</span></div>
        </td>
        <td style="border: 1px solid #9ca3af; padding: 6px 6px; font-size: 9px; vertical-align: top;">
          <div style="display: flex; justify-content: space-between;"><span>Rp</span><span>${formatCurrencyDecimals(itemTotal)}</span></div>
        </td>
      </tr>
    `;
  });

  // Terms list
  const defaultTerms = [
    'Harga sudah termasuk PPN 11%',
    'Harga belum termasuk biaya instalasi by remote & onsite',
    'Pembayaran CBO (Cash before delivery)',
    'Ready stock (limited stock)',
    'Dikenakan biaya pembatalan 50% dari nilai PO jika pembeli membatalkan PO',
    'Garansi 2 tahun untuk Logitech produk',
    'Harga FOB Jakarta',
  ];
  const termsList = q.terms && Array.isArray(q.terms) && q.terms.length > 0 ? q.terms : defaultTerms;

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
        <title>Quotation ${q.id} - ${q.customer?.name || 'Customer'}</title>
        <style>
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 25px; font-size: 10px; line-height: 1.3; }
          @page { margin: 20px; size: A4; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .header-left { vertical-align: top; text-align: left; width: 55%; }
          .header-right { vertical-align: top; text-align: right; width: 45%; font-size: 8.5px; color: #333; line-height: 1.3; }
          .meta-table { font-size: 9.5px; margin-top: 8px; margin-bottom: 12px; }
          .meta-table td { padding: 1px 0; }
          .sender-box { font-size: 9px; margin-top: 10px; line-height: 1.3; }
          .table-items { width: 100%; border-collapse: collapse; margin-bottom: 0px; }
          .table-items th { border: 1px solid #9ca3af; background: #ffffff; padding: 5px 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; text-align: center; }
          .summary-table { width: 320px; margin-left: auto; border-collapse: collapse; margin-top: -1px; }
          .summary-table td { border: 1px solid #9ca3af; padding: 4px 6px; font-size: 9px; font-weight: bold; }
          .terms { font-size: 8.5px; margin-top: 20px; line-height: 1.4; color: #222; }
          .terms ol { margin: 3px 0 0 14px; padding: 0; }
          .signature-area { margin-top: 25px; font-size: 9.5px; }
        </style>
      </head>
      <body>
        <!-- Header -->
        <table class="header-table">
          <tr>
            <td class="header-left">
              <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: 0.5px; color: #000;">QUOTATION</h1>
              
              <div style="font-size: 9.5px; line-height: 1.4; margin-bottom: 12px;">
                <div style="font-weight: bold;">QUOTATION NO ${q.id}</div>
                <div>${formatDateSlash(q.date || q.created_at)}</div>
                <div style="color: #ef4444; font-weight: bold;">${formatExpiredWithDay(q.expired || q.expired_at)}</div>
              </div>

              <!-- Destination Block (To :) -->
              <div style="font-size: 9.5px; line-height: 1.35; margin-bottom: 12px;">
                <div style="font-weight: bold; margin-bottom: 1px;">To :</div>
                ${picObj?.name ? `<div style="font-weight: bold;">${picObj.name}</div>` : ''}
                <div style="font-weight: bold; text-transform: uppercase;">${q.customer?.name || '—'}</div>
                ${q.customer?.address ? `<div>${q.customer.address}</div>` : ''}
                ${picObj?.phone ? `<div>Mobile : ${picObj.phone}</div>` : ''}
                ${picObj?.email ? `<div><a href="mailto:${picObj.email}" style="color: #2563eb; text-decoration: underline;">${picObj.email}</a></div>` : ''}
              </div>

              <!-- Sender Block (Sender :) -->
              <div style="font-size: 9.5px; line-height: 1.35;">
                <div style="font-weight: bold; margin-bottom: 1px;">Sender :</div>
                <div style="font-weight: bold;">${creatorObj?.name || 'Meyke'}</div>
                <div style="font-weight: bold; text-transform: uppercase;">${COMPANY.name} (${COMPANY.brand})</div>
                <div>Mobile : ${creatorObj?.mobile || '0811-1010-576'}</div>
                <div>Office : ${COMPANY.phone}</div>
                <div><a href="mailto:${creatorObj?.email || COMPANY.email}" style="color: #2563eb; text-decoration: underline;">${creatorObj?.email || COMPANY.email}</a></div>
              </div>
            </td>

            <td class="header-right">
              <img src="/logo_quot.png" alt="ACTIV" style="height: 45px; display: block; margin-left: auto; margin-bottom: 6px; object-fit: contain;" onError="this.src='https://placehold.co/180x45/00a88f/ffffff?text=ACTIV'" />
              <div style="font-weight: bold; font-size: 9.5px; margin-bottom: 2px;">${COMPANY.name}</div>
              <div>${COMPANY.address}</div>
              <div>${COMPANY.address2}</div>
              <div>${COMPANY.branch}</div>
              <div>${COMPANY.branch2}</div>
              <div style="margin-top: 3px;">T : ${COMPANY.phone} | E: ${COMPANY.email} | W: ${COMPANY.website}</div>
            </td>
          </tr>
        </table>

        <!-- Price label -->
        <div style="font-size: 9px; color: #4b5563; margin-bottom: 4px;">Price in IDR</div>

        <!-- Products Table -->
        <table class="table-items">
          <thead>
            <tr>
              <th style="width: 30px;">NO</th>
              <th style="width: 80px;">SKU</th>
              <th style="width: 75px;">BRAND NAME</th>
              <th>Description Product</th>
              ${withImage ? '<th style="width: 100px;">Product Display</th>' : ''}
              <th style="width: 35px;">QTY</th>
              <th style="width: 110px;">PRICE</th>
              <th style="width: 115px;">TOTAL PRICE</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows || `<tr><td colspan="${withImage ? 8 : 7}" style="text-align: center; padding: 15px;">Belum ada item produk.</td></tr>`}
          </tbody>
        </table>

        <!-- Totals Table -->
        <table class="summary-table">
          <tr>
            <td style="text-align: right; width: 140px;">TOTAL</td>
            <td style="text-align: right; width: 35px; border-right: none;">Rp</td>
            <td style="text-align: right; border-left: none;">${formatCurrencyDecimals(subtotal)}</td>
          </tr>
          ${(calcTax && showTax) ? `
            <tr>
              <td style="text-align: right;">PPN (VAT) 11%</td>
              <td style="text-align: right; border-right: none;">Rp</td>
              <td style="text-align: right; border-left: none;">${formatCurrencyDecimals(ppn)}</td>
            </tr>
          ` : ''}
          <tr>
            <td style="text-align: right;">GRAND TOTAL</td>
            <td style="text-align: right; border-right: none;">Rp</td>
            <td style="text-align: right; border-left: none;">${formatCurrencyDecimals(grand)}</td>
          </tr>
        </table>

        <!-- Render Dynamic Footer (Syarat & Signature / Approval) -->
        <!-- Standardized Terms & Dual Signature Footer -->
        <div class="terms" style="margin-top: 15px; page-break-inside: avoid;">
          <div style="font-weight: bold; margin-bottom: 2px;">Syarat & Ketentuan</div>
          <ol style="list-style-type: decimal; margin: 3px 0 0 14px; padding: 0; line-height: 1.45;">
            ${termsList.map((t) => `<li>${t}</li>`).join('')}
            <li>Nomor Rekening :<br/>${bankName} : ${bankNum} - ${bankHolder}<br/>Kantor Cabang Utama Alam Sutera ( Tangerang Selatan )</li>
          </ol>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 25px; page-break-inside: avoid;">
          <div style="width: 45%; text-align: right;">
            <div style="margin-bottom: 4px; font-weight: bold;">Approval by :</div>
            <div style="height: 50px;"></div>
            <div style="font-weight: bold; margin-top: 4px;">[ .................... ]</div>
            <div style="font-size: 8px; color: #6b7280; font-style: italic;">Customer Signature & Stamp</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
