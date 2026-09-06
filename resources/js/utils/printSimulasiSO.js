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
    <title>Simulasi SO - ${quotationId}</title>
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

