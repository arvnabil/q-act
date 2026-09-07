import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const fmtRp = (val) =>
    new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);

const fmtPct = (val) => `${(val || 0).toFixed(2)}%`;

export function generateSimulasiSOHTML(q, adjustments = [], currentUser = null) {
    const customerName = q?.customer?.name || '-';
    const salesName = q?.sales?.name || currentUser?.name || 'Sales';
    const quotationId = q?.id || 'Q-SO-DRAFT';
    const soDateFormatted = q?.date
        ? format(new Date(q.date), 'EEEE, MMMM d, yyyy', { locale: idLocale })
        : format(new Date(), 'EEEE, MMMM d, yyyy', { locale: idLocale });
    const notes = q?.notes || customerName;

    // ── Auto-detect PPN & PPh ──────────────────────────────────────────────────
    const showPpn = q?.calc_tax !== false;
    const calcPph = q?.calc_pph === true;
    const pphRate = q?.pph_rate || 0.02;
    const pphRatePct = Math.round((pphRate || 0.02) * 100);

    const items = q?.items || [];
    // Which items have PPh applied?
    const pphItems = calcPph ? items.filter(i => Boolean(i.is_pph_applied)) : [];
    const hasPphItems = pphItems.length > 0;

    const colCount = showPpn ? 7 : 6;
    const labelColspan = showPpn ? 5 : 4;

    // Revenue items (Selling price)
    let totalRevenue = 0;
    let totalRevenuePPN = 0;
    let pphBasisRevenue = 0;

    const revenueRowsHTML = items.map((item, idx) => {
        const qty = item.qty || 1;
        const price = item.price || 0;
        const total = qty * price;
        const totalPpn = Math.round(total * 1.11);
        totalRevenue += total;
        totalRevenuePPN += totalPpn;

        if (calcPph && item.is_pph_applied) {
            pphBasisRevenue += total;
        }

        const brandStr = item.brand ? (typeof item.brand === 'object' ? item.brand.name : item.brand) : '';
        const pphTagHtml = (calcPph && item.is_pph_applied)
            ? ` <span style="font-size: 8px; color: #065f46; font-weight: bold; background: #d1fae5; border: 1px solid #6ee7b7; padding: 1px 4px; border-radius: 3px; margin-left: 4px; white-space: nowrap;">PPh ${pphRatePct}%</span>`
            : '';

        return `
            <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${item.name || item.sku || '-'}${brandStr ? ` (${brandStr})` : ''}${pphTagHtml}</td>
                <td style="text-align: center;">${qty}</td>
                <td style="text-align: center;">UNIT</td>
                <td style="text-align: right;">${fmtRp(price)}</td>
                <td style="text-align: right;">${fmtRp(total)}</td>
                ${showPpn ? `<td style="text-align: right;">${fmtRp(totalPpn)}</td>` : ''}
            </tr>
        `;
    }).join('');

    // COGS items (Modal/HPP price)
    let totalCogs = 0;
    let totalCogsPPN = 0;
    const cogsRowsHTML = items.map((item, idx) => {
        const qty = item.qty || 1;
        const hpp = item.hpp || item.modal || 0;
        const total = qty * hpp;
        const totalPpn = Math.round(total * 1.11);
        totalCogs += total;
        totalCogsPPN += totalPpn;
        const brandStr = item.brand ? (typeof item.brand === 'object' ? item.brand.name : item.brand) : '';
        return `
            <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${item.name || item.sku || '-'}${brandStr ? ` (${brandStr})` : ''}</td>
                <td style="text-align: center;">${qty}</td>
                <td style="text-align: center;">UNIT</td>
                <td style="text-align: right;">${fmtRp(hpp)}</td>
                <td style="text-align: right;">${fmtRp(total)}</td>
                ${showPpn ? `<td style="text-align: right;">${fmtRp(totalPpn)}</td>` : ''}
            </tr>
        `;
    }).join('');

    // Other COGS (Adjustments / Cashback / Biaya Tambahan)
    let totalOtherCogs = 0;
    const safeAdjs = Array.isArray(adjustments) ? adjustments : [];
    const otherCogsRows = [];

    const categoriesStructure = [
        { name: 'BOD Expenses', isHeader: false, indent: false },
        { name: 'OTHER EXPENSES :', isHeader: true, indent: false },
        { name: 'Entertainment', isHeader: false, indent: true },
        { name: 'Administration', isHeader: false, indent: true },
        { name: 'Transport & Accommodation', isHeader: false, indent: true },
        { name: 'Others / Shipping/ Import', isHeader: false, indent: true }
    ];

    // Group user adjustments by category
    const adjsByCategory = {};
    safeAdjs.forEach(adj => {
        const amt = Number(adj.amount) || 0;
        if (amt > 0 || adj.label || adj.category) {
            const catKey = adj.category || 'Others / Shipping/ Import';
            if (!adjsByCategory[catKey]) {
                adjsByCategory[catKey] = [];
            }
            adjsByCategory[catKey].push({
                label: adj.label || '',
                amount: amt
            });
            totalOtherCogs += amt;
        }
    });

    categoriesStructure.forEach(item => {
        if (item.isHeader) {
            otherCogsRows.push(`
                <tr>
                    <td></td>
                    <td style="font-weight: bold; padding-left: 0px;">${item.name}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td style="text-align: right;"></td>
                    ${showPpn ? `<td style="text-align: right;"></td>` : ''}
                </tr>
            `);
        } else {
            const itemsInCat = adjsByCategory[item.name] || [];
            if (itemsInCat.length > 0) {
                itemsInCat.forEach(adjItem => {
                    const descText = adjItem.label
                        ? `${item.name} (${adjItem.label})`
                        : item.name;
                    otherCogsRows.push(`
                        <tr>
                            <td></td>
                            <td style="padding-left: ${item.indent ? '15px' : '0px'};">${descText}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td style="text-align: right; color: #dc2626;">${adjItem.amount > 0 ? `- ${fmtRp(adjItem.amount)}` : '-'}</td>
                            ${showPpn ? `<td style="text-align: right; color: #dc2626;">${adjItem.amount > 0 ? `- ${fmtRp(adjItem.amount)}` : '-'}</td>` : ''}
                        </tr>
                    `);
                });
            } else {
                otherCogsRows.push(`
                    <tr>
                        <td></td>
                        <td style="padding-left: ${item.indent ? '15px' : '0px'};">${item.name}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td style="text-align: right;">-</td>
                        ${showPpn ? `<td style="text-align: right;">-</td>` : ''}
                    </tr>
                `);
            }
        }
    });

    // Handle any custom categories not in standard list
    Object.keys(adjsByCategory).forEach(catKey => {
        const isStandard = categoriesStructure.some(c => c.name === catKey);
        if (!isStandard) {
            adjsByCategory[catKey].forEach(adjItem => {
                const descText = adjItem.label ? `${catKey} (${adjItem.label})` : catKey;
                otherCogsRows.push(`
                    <tr>
                        <td></td>
                        <td style="padding-left: 15px;">${descText}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td style="text-align: right; color: #dc2626;">${adjItem.amount > 0 ? `- ${fmtRp(adjItem.amount)}` : '-'}</td>
                        ${showPpn ? `<td style="text-align: right; color: #dc2626;">${adjItem.amount > 0 ? `- ${fmtRp(adjItem.amount)}` : '-'}</td>` : ''}
                    </tr>
                `);
            });
        }
    });

    const grossProfitRp = totalRevenue - totalCogs - totalOtherCogs;
    const grossProfitPct = totalRevenue > 0 ? (grossProfitRp / totalRevenue) * 100 : 0;

    const grossProfitPpnRp = totalRevenuePPN - totalCogsPPN - totalOtherCogs;
    const grossProfitPpnPct = totalRevenuePPN > 0 ? (grossProfitPpnRp / totalRevenuePPN) * 100 : 0;

    const pphAmount = hasPphItems ? Math.round(pphBasisRevenue * pphRate) : 0;
    const netMarginPphRp = grossProfitRp - pphAmount;
    const netMarginPphPct = totalRevenue > 0 ? (netMarginPphRp / totalRevenue) * 100 : 0;
    const netMarginPphPpnRp = grossProfitPpnRp - pphAmount;
    const netMarginPphPpnPct = totalRevenuePPN > 0 ? (netMarginPphPpnRp / totalRevenuePPN) * 100 : 0;

    // ── PPh product summary block (only shown if hasPphItems) ──────────────────
    const pphProductSummaryHTML = hasPphItems ? `
        <div style="margin-top: 12px; page-break-inside: avoid; border: 1px solid #6ee7b7; border-radius: 4px; overflow: hidden;">
            <div style="background: #d1fae5; padding: 5px 8px; font-weight: bold; font-size: 9.5px; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px;">
                Produk Dikenakan PPh Pasal 23 (${pphRatePct}%)
            </div>
            <div style="padding: 5px 8px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
                    <thead>
                        <tr style="background: #ecfdf5;">
                            <th style="text-align: left; padding: 3px 5px; border-bottom: 1px solid #a7f3d0;">No.</th>
                            <th style="text-align: left; padding: 3px 5px; border-bottom: 1px solid #a7f3d0;">Nama Produk</th>
                            <th style="text-align: right; padding: 3px 5px; border-bottom: 1px solid #a7f3d0;">Qty</th>
                            <th style="text-align: right; padding: 3px 5px; border-bottom: 1px solid #a7f3d0;">Harga Satuan</th>
                            <th style="text-align: right; padding: 3px 5px; border-bottom: 1px solid #a7f3d0;">Total</th>
                            <th style="text-align: right; padding: 3px 5px; border-bottom: 1px solid #a7f3d0;">PPh ${pphRatePct}%</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pphItems.map((item, idx) => {
                            const qty = item.qty || 1;
                            const price = item.price || 0;
                            const total = qty * price;
                            const pphVal = Math.round(total * pphRate);
                            const brandStr = item.brand ? (typeof item.brand === 'object' ? item.brand.name : item.brand) : '';
                            return `
                                <tr>
                                    <td style="padding: 3px 5px; border-bottom: 1px solid #ecfdf5; color: #059669;">${idx + 1}</td>
                                    <td style="padding: 3px 5px; border-bottom: 1px solid #ecfdf5;">${item.name || item.sku || '-'}${brandStr ? ` (${brandStr})` : ''}</td>
                                    <td style="padding: 3px 5px; border-bottom: 1px solid #ecfdf5; text-align: right;">${qty}</td>
                                    <td style="padding: 3px 5px; border-bottom: 1px solid #ecfdf5; text-align: right;">${fmtRp(price)}</td>
                                    <td style="padding: 3px 5px; border-bottom: 1px solid #ecfdf5; text-align: right;">${fmtRp(total)}</td>
                                    <td style="padding: 3px 5px; border-bottom: 1px solid #ecfdf5; text-align: right; font-weight: bold; color: #065f46;">- ${fmtRp(pphVal)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: #d1fae5; font-weight: bold;">
                            <td colspan="4" style="padding: 4px 5px; font-size: 9px; color: #065f46;">Total Potongan PPh ${pphRatePct}%</td>
                            <td style="padding: 4px 5px; text-align: right; font-size: 9px;">${fmtRp(pphBasisRevenue)}</td>
                            <td style="padding: 4px 5px; text-align: right; font-size: 9px; color: #065f46;">- ${fmtRp(pphAmount)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    ` : '';

    return `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>SO - ${quotationId}</title>
    <style>
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        @page {
            size: A4 portrait;
            margin: 10mm;
        }
        html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            color: #000;
        }
        .container {
            width: 100%;
            margin: 0 auto;
            padding: 5px;
        }
        h2 {
            font-size: 12px;
            font-weight: bold;
            margin: 0 0 10px 0;
            text-transform: uppercase;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            table-layout: fixed;
        }
        .info-table td {
            padding: 4px 6px;
            border: 1px solid #000000 !important;
            font-size: 10px;
            word-wrap: break-word;
        }
        .info-table td.label {
            font-weight: bold;
            width: 180px;
            background-color: #ffffff;
        }
        .info-table .badge-ppn {
            display: inline-block;
            font-size: 8px;
            font-weight: bold;
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #93c5fd;
            border-radius: 3px;
            padding: 1px 5px;
            margin-left: 0;
        }
        .info-table .badge-pph {
            display: inline-block;
            font-size: 8px;
            font-weight: bold;
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #6ee7b7;
            border-radius: 3px;
            padding: 1px 5px;
            margin-left: 4px;
        }
        .pph-row {
            color: #065f46;
            font-weight: bold;
        }
        .main-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            table-layout: fixed;
        }
        .main-table th, .main-table td {
            border: 1px solid #000000 !important;
            padding: 4px 6px;
            word-wrap: break-word;
        }
        .main-table th {
            background-color: #ffffff;
            font-weight: bold;
            text-align: center;
        }
        .section-header {
            font-weight: bold;
            text-transform: uppercase;
            background-color: #ffffff;
        }
        .total-row {
            font-weight: bold;
            background-color: #ffffff;
        }
        .gross-profit-row {
            font-weight: bold;
            font-size: 10px;
        }
        .yellow-highlight {
            background-color: #ffff00 !important;
            font-weight: bold;
            text-align: right;
        }
        @media print {
            body { padding: 0; }
            .container { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>PT. ALFA CIPTA TEKNOLOGI VIRTUAL (ACTiV)</h2>

        <table class="info-table">
            <tr>
                <td class="label">Customer Name</td>
                <td>${customerName}</td>
            </tr>
            <tr>
                <td class="label">PIC Sales</td>
                <td>${salesName}</td>
            </tr>
            <tr>
                <td class="label">QUOTATION / INVOICE</td>
                <td>${quotationId}</td>
            </tr>
            <tr>
                <td class="label">SO Date</td>
                <td>${soDateFormatted}</td>
            </tr>
            <tr>
                <td class="label">Pengaturan Pajak</td>
                <td>
                    ${showPpn ? `<span class="badge-ppn">PPN 11%</span>` : '<span style="color:#9ca3af;font-size:9px;">Tanpa PPN</span>'}
                    ${hasPphItems ? `<span class="badge-pph">PPh Pasal 23 ${pphRatePct}%</span>` : ''}
                </td>
            </tr>
        </table>

        <table class="main-table">
            <colgroup>
                <col style="width: 30px;" />
                <col />
                <col style="width: 35px;" />
                <col style="width: 45px;" />
                <col style="width: 85px;" />
                <col style="width: 85px;" />
                ${showPpn ? `<col style="width: 95px;" />` : ''}
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="2">NO.</th>
                    <th rowspan="2">DESCRIPTION</th>
                    <th colspan="2">UNIT</th>
                    <th rowspan="2">Harga Satuan</th>
                    <th rowspan="2">Total</th>
                    ${showPpn ? `<th rowspan="2">Total (PPN 11%)</th>` : ''}
                </tr>
                <tr>
                    <th>QTY</th>
                    <th>UNIT</th>
                </tr>
            </thead>
            <tbody>
                <tr class="section-header">
                    <td colspan="${colCount}">REVENUE</td>
                </tr>
                ${revenueRowsHTML}
                <tr class="total-row">
                    <td colspan="${labelColspan}">Total Revenue</td>
                    <td style="text-align: right;">${fmtRp(totalRevenue)}</td>
                    ${showPpn ? `<td style="text-align: right;">${fmtRp(totalRevenuePPN)}</td>` : ''}
                </tr>

                <tr class="section-header">
                    <td colspan="${colCount}">COGS</td>
                </tr>
                ${cogsRowsHTML}
                <tr class="total-row">
                    <td colspan="${labelColspan}">Total COGS</td>
                    <td style="text-align: right;">${fmtRp(totalCogs)}</td>
                    ${showPpn ? `<td style="text-align: right;">${fmtRp(totalCogsPPN)}</td>` : ''}
                </tr>

                <tr class="section-header">
                    <td colspan="${colCount}">OTHER COGS</td>
                </tr>
                ${otherCogsRows.join('')}
                <tr class="total-row">
                    <td colspan="${labelColspan}">Total Other COGS</td>
                    <td style="text-align: right;">${totalOtherCogs > 0 ? `- ${fmtRp(totalOtherCogs)}` : '-'}</td>
                    ${showPpn ? `<td style="text-align: right;">${totalOtherCogs > 0 ? `- ${fmtRp(totalOtherCogs)}` : '-'}</td>` : ''}
                </tr>

                <tr class="gross-profit-row">
                    <td colspan="${labelColspan}" style="text-transform: uppercase;">GROSS MARGIN (RP)</td>
                    <td style="text-align: right;">${fmtRp(grossProfitRp)}</td>
                    ${showPpn ? `<td style="text-align: right;">${fmtRp(grossProfitPpnRp)}</td>` : ''}
                </tr>
                <tr class="gross-profit-row">
                    <td colspan="${labelColspan}" style="text-transform: uppercase;">GROSS MARGIN (%)</td>
                    <td class="yellow-highlight">${fmtPct(grossProfitPct)}</td>
                    ${showPpn ? `<td class="yellow-highlight">${fmtPct(grossProfitPpnPct)}</td>` : ''}
                </tr>

                ${hasPphItems ? `
                    <tr class="pph-row">
                        <td colspan="${labelColspan}">POTONGAN PPH PASAL 23 (${pphRatePct}%)</td>
                        <td style="text-align: right;">- ${fmtRp(pphAmount)}</td>
                        ${showPpn ? `<td style="text-align: right;">- ${fmtRp(pphAmount)}</td>` : ''}
                    </tr>
                    <tr class="gross-profit-row">
                        <td colspan="${labelColspan}" style="text-transform: uppercase;">NET MARGIN SETELAH PPH (RP)</td>
                        <td style="text-align: right;">${fmtRp(netMarginPphRp)}</td>
                        ${showPpn ? `<td style="text-align: right;">${fmtRp(netMarginPphPpnRp)}</td>` : ''}
                    </tr>
                    <tr class="gross-profit-row">
                        <td colspan="${labelColspan}" style="text-transform: uppercase;">NET MARGIN SETELAH PPH (%)</td>
                        <td class="yellow-highlight">${fmtPct(netMarginPphPct)}</td>
                        ${showPpn ? `<td class="yellow-highlight">${fmtPct(netMarginPphPpnPct)}</td>` : ''}
                    </tr>
                ` : ''}
            </tbody>
        </table>

        ${pphProductSummaryHTML}

        <div style="margin-top: 15px; page-break-inside: avoid;">
            <div style="font-weight: bold; font-size: 10px; margin-bottom: 4px; text-transform: uppercase;">
                Description of Project / Syarat &amp; Ketentuan:
            </div>
            <div style="font-size: 9.5px; line-height: 1.35; color: #222; border: 1px solid #000; padding: 6px 8px; background: #fff; white-space: pre-wrap;">${notes}</div>
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
        };
    </script>
</body>
</html>
    `;
}

export function printSimulasiSO(q, adjustments = [], currentUser = null) {
    const html = generateSimulasiSOHTML(q, adjustments, currentUser);
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (win) {
        win.document.write(html);
        win.document.close();
    }
}

const excelItemDesc = (item) => {
    const name = item.name || item.sku || '-';
    const brandStr = item.brand ? (typeof item.brand === 'object' ? item.brand.name : item.brand) : '';
    return brandStr ? `${name} (${brandStr})` : name;
};

const sanitizeSheetName = (name) =>
    String(name || 'SO').replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'SO';

const sanitizeFileName = (name) =>
    String(name || 'SO').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_');

const simCategoryOrder = [
    'BOD Expenses',
    'Entertainment',
    'Administration',
    'Transport & Accommodation',
    'Others / Shipping/ Import'
];

// ─── Excel export of the SO analysis document ────────────────────────────────
// Populates the styled template (resources/js/templates/SO_Analysis_Template.xlsx)
// with the same data & calculations used by the PDF analysis, preserving the
// template borders/widths/merges and cloning pre-formatted sample rows when
// more item rows are required.

function groupAdjustmentsByCategory(adjustments) {
    const adjsByCategory = {};
    let totalOtherCogs = 0;
    const safeAdjs = Array.isArray(adjustments) ? adjustments : [];
    safeAdjs.forEach(adj => {
        const amt = Number(adj.amount) || 0;
        if (amt > 0 || adj.label || adj.category) {
            const catKey = adj.category || 'Others / Shipping/ Import';
            if (!adjsByCategory[catKey]) {
                adjsByCategory[catKey] = [];
            }
            adjsByCategory[catKey].push({
                label: adj.label || '',
                amount: amt
            });
            totalOtherCogs += amt;
        }
    });
    return { adjsByCategory, totalOtherCogs };
}

function buildOtherCogsRows(adjsByCategory) {
    const rows = [];
    const emitted = new Set();
    const emitCategory = (catKey, list) => {
        emitted.add(catKey);
        list.forEach(entry => {
            rows.push({
                desc: entry.label ? `${catKey} (${entry.label})` : catKey,
                amount: entry.amount,
            });
        });
    };
    simCategoryOrder.forEach(cat => {
        const list = adjsByCategory[cat];
        if (list && list.length > 0) {
            emitCategory(cat, list);
        }
    });
    Object.keys(adjsByCategory).forEach(catKey => {
        if (!emitted.has(catKey)) {
            emitCategory(catKey, adjsByCategory[catKey]);
        }
    });
    return rows;
}

export function populateSimulasiSOTemplate(workbook, q, adjustments = [], currentUser = null) {
    const ws = workbook.worksheets[0];
    if (!ws) {
        throw new Error('Template tidak memiliki worksheet.');
    }

    const customerName = q?.customer?.name || '-';
    const salesName = q?.sales?.name || currentUser?.name || 'Sales';
    const quotationId = q?.id || 'Q-SO-DRAFT';
    const soDateFormatted = q?.date
        ? format(new Date(q.date), 'EEEE, MMMM d, yyyy', { locale: idLocale })
        : format(new Date(), 'EEEE, MMMM d, yyyy', { locale: idLocale });
    const notes = q?.notes || customerName;

    // ── Auto-detect PPN & PPh (same rules as the PDF) ────────────────────────
    const showPpn = q?.calc_tax !== false;
    const calcPph = q?.calc_pph === true;
    const pphRate = q?.pph_rate || 0.02;
    const pphRatePct = Math.round((pphRate || 0.02) * 100);

    const items = q?.items || [];
    const pphItems = calcPph ? items.filter(i => Boolean(i.is_pph_applied)) : [];
    const hasPphItems = pphItems.length > 0;

    // ── Revenue items ─────────────────────────────────────────────────────────
    let totalRevenue = 0;
    let totalRevenuePPN = 0;
    let pphBasisRevenue = 0;
    const revenueRows = items.map((item, idx) => {
        const qty = item.qty || 1;
        const price = item.price || 0;
        const total = qty * price;
        const totalPpn = Math.round(total * 1.11);
        totalRevenue += total;
        totalRevenuePPN += totalPpn;
        if (calcPph && item.is_pph_applied) {
            pphBasisRevenue += total;
        }
        return { no: idx + 1, desc: excelItemDesc(item), qty, price, total, totalPpn };
    });

    // ── COGS items ────────────────────────────────────────────────────────────
    let totalCogs = 0;
    let totalCogsPPN = 0;
    const cogsRows = items.map((item, idx) => {
        const qty = item.qty || 1;
        const hpp = item.hpp || item.modal || 0;
        const total = qty * hpp;
        const totalPpn = Math.round(total * 1.11);
        totalCogs += total;
        totalCogsPPN += totalPpn;
        return { no: idx + 1, desc: excelItemDesc(item), qty, price: hpp, total, totalPpn };
    });

    // ── Other COGS (adjustments grouped by category, same as the PDF) ─────────
    const { adjsByCategory, totalOtherCogs } = groupAdjustmentsByCategory(adjustments);
    const otherRows = buildOtherCogsRows(adjsByCategory);

    // ── Margin totals (identical formulas to the PDF) ─────────────────────────
    const grossProfitRp = totalRevenue - totalCogs - totalOtherCogs;
    const grossProfitPct = totalRevenue > 0 ? (grossProfitRp / totalRevenue) * 100 : 0;
    const grossProfitPpnRp = totalRevenuePPN - totalCogsPPN - totalOtherCogs;
    const grossProfitPpnPct = totalRevenuePPN > 0 ? (grossProfitPpnRp / totalRevenuePPN) * 100 : 0;

    const pphAmount = hasPphItems ? Math.round(pphBasisRevenue * pphRate) : 0;

    // ── Locate template anchors by label ──────────────────────────────────────
    // All anchors are (re)found by scanning the CURRENT worksheet state every
    // time a zone is grown, so positions never go stale after row insertions.
    const scanRow = (predicate, start = 1) => {
        const max = ws.actualRowCount + 50;
        for (let r = start; r <= max; r++) {
            const a = ws.getCell(r, 1).value;
            if (predicate(typeof a === 'string' || typeof a === 'number' ? String(a) : '')) {
                return r;
            }
        }
        return -1;
    };
    const exactInA = (text) => scanRow(v => v === text);
    const prefixInA = (text) => scanRow(v => v.startsWith(text));

    const SECTION_LABELS = ['REVENUE', 'COGS', 'OTHER COGS'];
    const SUMMARY_LABELS = ['Total Revenue', 'Total COGS', 'Total Other COGS', 'GROSS MARGIN (RP)', 'GROSS MARGIN (%)'];
    const PROTECTED_LABELS = new Set([...SECTION_LABELS, ...SUMMARY_LABELS, 'NO.']);

    const zoneAnchors = (sectionLabel, totalLabel) => {
        const sect = exactInA(sectionLabel);
        const tot = exactInA(totalLabel);
        if (sect < 0 || tot < 0) {
            throw new Error(`Template tidak memiliki baris "${sectionLabel}" / "${totalLabel}".`);
        }
        return { sect, tot };
    };

    const cellText = (rowNo, colNo) => {
        const v = ws.getCell(rowNo, colNo).value;
        return (typeof v === 'string' || typeof v === 'number') ? String(v) : '';
    };

    // Clone source must be an ITEM row of the zone: it must carry content in
    // DESCRIPTION (col B) and must never be a section/summary/protected row.
    const assertCloneableItemRow = (rowNo, zoneLabel) => {
        if (!cellText(rowNo, 2).trim()) {
            throw new Error(`Tidak dapat menyalin baris item "${zoneLabel}" dari baris ${rowNo}: kolom DESCRIPTION kosong.`);
        }
        for (let c = 1; c <= 7; c++) {
            const text = cellText(rowNo, c).trim();
            if (PROTECTED_LABELS.has(text) || text.startsWith('Description of Project')) {
                throw new Error(`Tidak dapat menyalin baris ringkasan "${zoneLabel}" (baris ${rowNo}, kolom ${c} = "${text}").`);
            }
        }
    };

    // Grow a zone by cloning its own pre-formatted ITEM row (the row directly
    // above the zone's summary row) - never a summary/section row. Anchors are
    // resolved against the live sheet right before cloning.
    const growZone = (sectionLabel, totalLabel, needed) => {
        const { sect, tot } = zoneAnchors(sectionLabel, totalLabel);
        const capacity = tot - sect - 1;
        const extra = needed - capacity;
        if (extra <= 0) return;
        const cloneSource = tot - 1;
        assertCloneableItemRow(cloneSource, sectionLabel);
        ws.duplicateRow(cloneSource, extra, true);
    };

    // Validate that every summary row exists exactly once and keeps its merged
    // A:E label region. Guards the export instead of cleaning up afterwards.
    const verifySummaryRows = () => {
        SUMMARY_LABELS.forEach(label => {
            const rows = [];
            for (let r = 1; r <= ws.actualRowCount + 50; r++) {
                const cell = ws.getCell(r, 1);
                if (cell.master === cell && typeof cell.value === 'string' && cell.value === label) {
                    rows.push(r);
                    // Summary label rows must stay merged across A:E.
                    if (ws.getCell(r, 5).master !== cell) {
                        throw new Error(`Template analisa gagal diverifikasi: baris "${label}" (${r}) kehilangan merged range A:E.`);
                    }
                }
            }
            if (rows.length !== 1) {
                throw new Error(`Template analisa gagal diverifikasi: "${label}" ditemukan ${rows.length} kali (baris ${rows.join(',') || '-'}).`);
            }
        });
    };

    // Sanity check: template must contain the anchors we depend on.
    zoneAnchors('REVENUE', 'Total Revenue');
    zoneAnchors('COGS', 'Total COGS');
    zoneAnchors('OTHER COGS', 'Total Other COGS');
    if (exactInA('NO.') < 0) {
        throw new Error('Template tidak memiliki baris header tabel analisa.');
    }

    // ── Insert extra rows, one zone at a time ─────────────────────────────────
    growZone('REVENUE', 'Total Revenue', revenueRows.length);
    growZone('COGS', 'Total COGS', cogsRows.length);
    growZone('OTHER COGS', 'Total Other COGS', otherRows.length);

    // Re-locate anchors (current state) after any row insertion
    const rHeaderF = exactInA('NO.');
    const rRevSecF = exactInA('REVENUE');
    const rRevTotF = exactInA('Total Revenue');
    const rCogsSecF = exactInA('COGS');
    const rCogsTotF = exactInA('Total COGS');
    const rOthSecF = exactInA('OTHER COGS');
    const rOthTotF = exactInA('Total Other COGS');
    const rGrossRpF = exactInA('GROSS MARGIN (RP)');
    const rGrossPctF = exactInA('GROSS MARGIN (%)');
    const rDescF = prefixInA('Description of Project');

    // ── Helper row/value writers ──────────────────────────────────────────────
    const clearCells = (row, fromCol = 1, toCol = 7) => {
        for (let c = fromCol; c <= toCol; c++) {
            const cell = row.getCell(c);
            if (cell.value !== null && cell.value !== undefined) {
                cell.value = null;
            }
        }
    };

    const writeItemRow = (rowNo, no, desc, qty, price, total, totalPpn) => {
        const row = ws.getRow(rowNo);
        row.hidden = false;
        row.getCell(1).value = no !== null ? no : null;
        row.getCell(2).value = desc;
        row.getCell(3).value = qty;
        row.getCell(4).value = 'UNIT';
        row.getCell(5).value = price;
        row.getCell(6).value = total;
        row.getCell(7).value = showPpn ? totalPpn : null;
    };

    const writeTotals = (rowNo, valueNonPpn, valuePpn) => {
        const row = ws.getRow(rowNo);
        row.getCell(6).value = valueNonPpn;
        row.getCell(7).value = showPpn ? valuePpn : null;
    };

    const fillZone = (sectionRowF, totalRowF, rows, isRevenueLike) => {
        const zoneRows = totalRowF - sectionRowF - 1;
        for (let slot = 0; slot < zoneRows; slot++) {
            const rowNo = sectionRowF + 1 + slot;
            const row = ws.getRow(rowNo);
            if (slot < rows.length) {
                const item = rows[slot];
                if (isRevenueLike) {
                    writeItemRow(rowNo, item.no, item.desc, item.qty, item.price, item.total, item.totalPpn);
                } else {
                    row.hidden = false;
                    clearCells(row, 1, 7);
                    row.getCell(2).value = item.desc;
                    row.getCell(6).value = -item.amount;
                    row.getCell(7).value = showPpn ? -item.amount : null;
                }
            } else {
                row.hidden = true;
                clearCells(row, 1, 7);
            }
        }
    };

    // ── Fill sections ─────────────────────────────────────────────────────────
    fillZone(rRevSecF, rRevTotF, revenueRows, true);
    fillZone(rCogsSecF, rCogsTotF, cogsRows, true);
    fillZone(rOthSecF, rOthTotF, otherRows, false);

    writeTotals(rRevTotF, totalRevenue, totalRevenuePPN);
    writeTotals(rCogsTotF, totalCogs, totalCogsPPN);
    writeTotals(rOthTotF, -totalOtherCogs, -totalOtherCogs);
    writeTotals(rGrossRpF, grossProfitRp, grossProfitPpnRp);
    writeTotals(rGrossPctF, grossProfitPct, grossProfitPpnPct);

    // ── Re-assert merged label rows at their FINAL positions ──────────────────
    // ExcelJS (browser build) does not reliably re-anchor existing merges when
    // rows are inserted above them, so after all insertions/fills we explicitly
    // rebuild the single-row merged ranges for every section/summary row. This
    // keeps each label stored only in the master cell (A) with the row merged
    // A:G (sections) or A:E (summaries), regardless of how many rows shifted.
    const ensureMergedRow = (rowNo, lastCol) => {
        if (rowNo <= 0) return;
        // Some ExcelJS builds clear the master cell value when unmerging, so the
        // label is captured first and restored on the rebuilt merged master.
        const label = ws.getCell(rowNo, 1).value;
        ws.unMergeCells(rowNo, 1, rowNo, lastCol);
        for (let c = 2; c <= lastCol; c++) {
            const cell = ws.getCell(rowNo, c);
            if (cell.value !== null && cell.value !== undefined) {
                cell.value = null;
            }
        }
        ws.mergeCells(rowNo, 1, rowNo, lastCol);
        if (label !== null && label !== undefined) {
            ws.getCell(rowNo, 1).value = label;
        }
    };
    ensureMergedRow(rRevSecF, 7);
    ensureMergedRow(rRevTotF, 5);
    ensureMergedRow(rCogsSecF, 7);
    ensureMergedRow(rCogsTotF, 5);
    ensureMergedRow(rOthSecF, 7);
    ensureMergedRow(rOthTotF, 5);
    ensureMergedRow(rGrossRpF, 5);
    ensureMergedRow(rGrossPctF, 5);

    // ── Header / info cells ───────────────────────────────────────────────────
    ws.getCell(3, 2).value = customerName;
    ws.getCell(4, 2).value = salesName;
    ws.getCell(5, 2).value = quotationId;
    ws.getCell(6, 2).value = soDateFormatted;
    ws.getCell(7, 2).value = `${showPpn ? 'PPN 11%' : 'Tanpa PPN'}${hasPphItems ? ` + PPh Pasal 23 ${pphRatePct}%` : ''}`;

    if (!showPpn) {
        // Template always has the PPN column; blank its values + header when tax is off
        ws.getCell(rHeaderF, 7).value = '';
    }

    // ── Description block (template row) ──────────────────────────────────────
    if (rDescF > 0) {
        ws.getCell(rDescF, 2).value = notes;
    }

    // ── PPh product summary sheet (only when applicable, mirrors the PDF block)
    if (hasPphItems) {
        const pphSheetName = sanitizeSheetName(`PPh ${pphRatePct}%`);
        const wsPph = workbook.getWorksheet(pphSheetName) || workbook.addWorksheet(pphSheetName);
        wsPph.columns = [
            { width: 6 }, { width: 44 }, { width: 8 }, { width: 14 }, { width: 16 }, { width: 16 },
        ];
        wsPph.addRow(['No.', 'Nama Produk', 'Qty', 'Harga Satuan', 'Total', `PPh ${pphRatePct}%`]);
        pphItems.forEach((item, idx) => {
            const qty = item.qty || 1;
            const price = item.price || 0;
            const total = qty * price;
            const pphVal = Math.round(total * pphRate);
            wsPph.addRow([idx + 1, excelItemDesc(item), qty, price, total, -pphVal]);
        });
        wsPph.addRow(['', 'Total Potongan PPh', '', '', pphBasisRevenue, -pphAmount]);
        const headerRow = wsPph.getRow(1);
        headerRow.eachCell(cell => {
            cell.font = { bold: true };
        });
    }

    // Sheet name matches the SO reference
    ws.name = sanitizeSheetName(`SO ${quotationId}`);

    // Internal invariant check: every summary row must exist exactly once.
    verifySummaryRows();

    return workbook;
}

// Template asset URL resolved at build/runtime. Kept inside the function so the
// PDF path (printSimulasiSO) never depends on ExcelJS or the template asset.
function templateFileUrl() {
    return new URL('../templates/SO_Analysis_Template.xlsx', import.meta.url);
}

export async function exportSimulasiSOExcel(q, adjustments = [], currentUser = null) {
    const exceljsModule = await import('exceljs');
    const ExcelJS = exceljsModule.default ?? exceljsModule;

    const templateUrl = templateFileUrl();
    const response = await fetch(templateUrl);
    if (!response.ok) {
        throw new Error(`Template Excel tidak dapat dimuat. HTTP ${response.status} untuk ${templateUrl.href}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await response.arrayBuffer());
    populateSimulasiSOTemplate(workbook, q, adjustments, currentUser);

    const buffer = await workbook.xlsx.writeBuffer();
    const { saveAs } = await import('file-saver');
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const dateStamp = new Date().toISOString().slice(0, 10);
    saveAs(blob, `SO_${sanitizeFileName(q?.id || 'Q-SO-DRAFT')}_Analysis_${dateStamp}.xlsx`);
}
