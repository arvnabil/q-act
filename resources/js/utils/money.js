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
