// Utility for Managing Sales Custom Terms & Conditions Templates

export const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-std',
    name: 'Standard PPN 11% + CBO',
    terms: [
      'Harga belum termasuk PPN 11%',
      'Harga belum termasuk biaya instalasi by remote & onsite',
      'Pembayaran CBO (Cash before delivery)',
      'Ready stock (limited stock)',
      'Dikenakan biaya pembatalan 50% dari nilai PO jika pembeli membatalkan PO',
      'Garansi 2 tahun untuk produk Logitech',
      'Harga FOB Jakarta'
    ]
  },
  {
    id: 'tpl-indent',
    name: 'Indent Project (DP 50% + Indent 8-10 Wks)',
    terms: [
      'Harga belum termasuk PPN 11%',
      'Harga belum termasuk biaya instalasi by remote & onsite',
      'Pembayaran 50% DP, pelunasan 50% setelah pengiriman (14 hari)',
      'Indent 8-10 minggu setelah PO',
      'Dikenakan biaya pembatalan 50% jika pembeli membatalkan PO',
      'Garansi Resmi 2 Tahun',
      'Harga FOB Jakarta'
    ]
  },
  {
    id: 'tpl-corp',
    name: 'Corporate (Net 14 Days + PPh 23)',
    terms: [
      'Harga belum termasuk PPN 11%',
      'Harga belum termasuk PPH 23',
      'Harga belum termasuk biaya instalasi by remote & onsite',
      'Pembayaran 100% setelah pengiriman (14 hari)',
      'Garansi Resmi 2 Tahun',
      'Harga FOB Jakarta Delivery'
    ]
  }
];

const STORAGE_KEY_PREFIX = 'qact_terms_templates_';

export function getCustomTemplates(userId) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId || 'guest'}`;
    const stored = localStorage.getItem(key);
    if (!stored) return DEFAULT_TEMPLATES;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export function saveCustomTemplate(userId, name, termsArray) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId || 'guest'}`;
    const current = getCustomTemplates(userId);
    const newTpl = {
      id: `tpl-user-${Date.now()}`,
      name: name || 'Template Custom',
      terms: Array.isArray(termsArray) ? termsArray : termsArray.split('\n').map(t => t.trim()).filter(Boolean)
    };
    const updated = [...current, newTpl];
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save terms template:', err);
    return getCustomTemplates(userId);
  }
}

export function deleteCustomTemplate(userId, templateId) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId || 'guest'}`;
    const current = getCustomTemplates(userId);
    const updated = current.filter(t => t.id !== templateId);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated.length > 0 ? updated : DEFAULT_TEMPLATES;
  } catch (err) {
    console.error('Failed to delete terms template:', err);
    return getCustomTemplates(userId);
  }
}
