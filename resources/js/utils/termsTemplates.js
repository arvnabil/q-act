// Utility for Managing Syarat & Ketentuan Templates (Global Master & Sales Personal)

export const DEFAULT_MASTER_TEMPLATES = [
  {
    id: 'master_std_ppn11',
    name: 'Standard Project (PPN 11%)',
    type: 'master',
    terms: [
      'Harga belum termasuk PPN 11%',
      'Pembayaran CBO (Cash Before Delivery) atau sesuai persetujuan',
      'Penawaran berlaku 14 hari sejak tanggal diterbitkan',
      'Garansi resmi distributor berlaku sesuai ketentuan produk',
    ]
  },
  {
    id: 'master_inc_ppn11',
    name: 'Harga Termasuk PPN (Inc. PPN 11%)',
    type: 'master',
    terms: [
      'Harga sudah termasuk PPN 11%',
      'Pembayaran CBO (Cash Before Delivery) atau sesuai persetujuan',
      'Penawaran berlaku 14 hari sejak tanggal diterbitkan',
      'Garansi resmi distributor berlaku sesuai ketentuan produk',
    ]
  }
];

export function getAllTemplatesForUser(userId, serverMasterTerms = [], serverPersonalTerms = []) {
  const serverMasters = (Array.isArray(serverMasterTerms) && serverMasterTerms.length > 0)
    ? serverMasterTerms.map(t => ({ ...t, type: 'master' }))
    : [];

  let masters = [];
  if (serverMasters.length > 0) {
    masters = [...serverMasters];
  } else {
    masters = [...DEFAULT_MASTER_TEMPLATES];
  }

  // Personal templates are server-owned and scoped to the authenticated user.
  // localStorage is intentionally not used here so templates work across devices.
  const personal = (Array.isArray(serverPersonalTerms) ? serverPersonalTerms : [])
    .map(t => ({ ...t, type: 'personal' }));
  return [...masters, ...personal];
}

export function getLegacyPersonalTemplates(userId) {
  try {
    const key = `qact_personal_terms_templates_${userId || 'guest'}`;
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return { key, templates: Array.isArray(parsed) ? parsed : [] };
  } catch {
    return { key: `qact_personal_terms_templates_${userId || 'guest'}`, templates: [] };
  }
}
