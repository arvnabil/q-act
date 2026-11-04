export const roundMoney = (value) =>
    Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const formatMoney = (value) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(roundMoney(value || 0));

export const formatNumberMoney = (value) =>
    new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(roundMoney(value || 0));

/**
 * Format full Indonesian Rupiah currency.
 * e.g. 50000000 -> "Rp 50.000.000" (or with decimals: "Rp 50.000.000,00")
 */
export const formatRupiah = (value, withDecimals = false) => {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: withDecimals ? 2 : 0,
        maximumFractionDigits: withDecimals ? 2 : 0,
    }).format(num);
};

/**
 * Format compact Indonesian Rupiah abbreviation for badges, cards, and stat headers.
 * e.g.
 * 2_000_000_000_000 -> "Rp 2 T"
 * 2_500_000_000 -> "Rp 2,5 M"
 * 50_000_000 -> "Rp 50 jt"
 * 750_000 -> "Rp 750 rb"
 */
export const formatCompactRupiah = (value) => {
    const n = Number(value) || 0;
    if (n === 0) return 'Rp 0';
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';

    const formatNumber = (val) =>
        new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
        }).format(val);

    if (abs >= 1_000_000_000_000) {
        return `${sign}Rp ${formatNumber(abs / 1_000_000_000_000)} T`;
    }
    if (abs >= 1_000_000_000) {
        return `${sign}Rp ${formatNumber(abs / 1_000_000_000)} M`;
    }
    if (abs >= 1_000_000) {
        return `${sign}Rp ${formatNumber(abs / 1_000_000)} jt`;
    }
    if (abs >= 1_000) {
        return `${sign}Rp ${formatNumber(abs / 1_000)} rb`;
    }
    return `${sign}Rp ${abs.toLocaleString('id-ID')}`;
};
