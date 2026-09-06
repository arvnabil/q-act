/**
 * salesMargin.js
 * Pure calculation utilities for Sales Zone.
 * IMPORTANT: price is stored BEFORE PPN in quotation_items.
 * Margin is always calculated on pre-tax revenue.
 */

export function generateAdjId() {
    return 'adj-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

function isHppKnown(hpp) {
    return typeof hpp === 'number' && hpp > 0 && isFinite(hpp);
}

/**
 * @param {Array} items - { name, sku, qty, price, hpp, brand }
 * @param {Array} adjustments - { id, label, amount }
 */
export function calculateSalesMargin(items = [], adjustments = []) {
    const itemMargins = items.map((item) => {
        const qty = Number(item.qty) || 1;
        const price = Number(item.price) || 0;
        const hpp = Number(item.hpp);
        const revenue = price * qty;
        const hppKnown = isHppKnown(hpp);

        if (!hppKnown) {
            return {
                name: item.name || item.sku || '-',
                brand: item.brand || '',
                qty, price, revenue,
                hpp: null, cost: null, margin: null, marginPct: null,
                hppKnown: false,
            };
        }

        const cost = hpp * qty;
        const margin = revenue - cost;
        const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;

        return {
            name: item.name || item.sku || '-',
            brand: item.brand || '',
            qty, price, revenue, hpp, cost, margin, marginPct,
            hppKnown: true,
        };
    });

    const knownItems = itemMargins.filter((i) => i.hppKnown);
    const unknownItems = itemMargins.filter((i) => !i.hppKnown);

    const totalRevenue = itemMargins.reduce((s, i) => s + i.revenue, 0);
    const knownRevenue = knownItems.reduce((s, i) => s + i.revenue, 0);
    const totalHpp = knownItems.reduce((s, i) => s + i.cost, 0);

    const grossMargin = knownRevenue - totalHpp;
    const grossMarginPct = knownRevenue > 0 ? (grossMargin / knownRevenue) * 100 : 0;

    const totalAdjustments = adjustments.reduce((s, a) => s + (Number(a.amount) || 0), 0);

    const netMargin = grossMargin - totalAdjustments;
    const netMarginPct = knownRevenue > 0 ? (netMargin / knownRevenue) * 100 : 0;

    return {
        itemMargins,
        knownCount: knownItems.length,
        unknownCount: unknownItems.length,
        totalRevenue,
        knownRevenue,
        totalHpp,
        grossMargin,
        grossMarginPct,
        totalAdjustments,
        netMargin,
        netMarginPct,
        isNegative: netMargin < 0,
        hasUnknownHpp: unknownItems.length > 0,
    };
}
