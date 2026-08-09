// Utility for Managing Syarat & Ketentuan Templates (Global Master & Sales Personal)

export const DEFAULT_MASTER_TEMPLATES = [
  {
    id: 'master-std',
    name: 'Standard PPN 11% + CBO',
    type: 'master',
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
    id: 'master-indent',
    name: 'Indent Project (DP 50% + Indent 8-10 Wks)',
    type: 'master',
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
    id: 'master-corp',
    name: 'Corporate (Net 14 Days + PPh 23)',
    type: 'master',
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

const MASTER_KEY = 'qact_global_master_terms_templates';
const PERSONAL_KEY_PREFIX = 'qact_personal_terms_templates_';

// 1. Get Global Master Templates (Managed by Admin)
export function getMasterTemplates() {
  try {
    const stored = localStorage.getItem(MASTER_KEY);
    if (!stored) return DEFAULT_MASTER_TEMPLATES;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MASTER_TEMPLATES;
  } catch {
    return DEFAULT_MASTER_TEMPLATES;
  }
}

// 2. Save Global Master Template (Admin Only)
export function saveMasterTemplate(name, termsArray, idToEdit = null) {
  try {
    const current = getMasterTemplates();
    const terms = Array.isArray(termsArray) ? termsArray : termsArray.split('\n').map(t => t.trim()).filter(Boolean);

    let updated;
    if (idToEdit) {
      updated = current.map(t => t.id === idToEdit ? { ...t, name, terms } : t);
    } else {
      const newTpl = {
        id: `master-${Date.now()}`,
        name: name || 'Master Template',
        type: 'master',
        terms
      };
      updated = [...current, newTpl];
    }
    localStorage.setItem(MASTER_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save master template:', err);
    return getMasterTemplates();
  }
}

// 3. Delete Global Master Template (Admin Only)
export function deleteMasterTemplate(id) {
  try {
    const current = getMasterTemplates();
    const updated = current.filter(t => t.id !== id);
    localStorage.setItem(MASTER_KEY, JSON.stringify(updated));
    return updated.length > 0 ? updated : DEFAULT_MASTER_TEMPLATES;
  } catch (err) {
    console.error('Failed to delete master template:', err);
    return getMasterTemplates();
  }
}

// 4. Get Sales Personal Templates
export function getPersonalTemplates(userId) {
  try {
    const key = `${PERSONAL_KEY_PREFIX}${userId || 'guest'}`;
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 5. Save Sales Personal Template
export function savePersonalTemplate(userId, name, termsArray) {
  try {
    const key = `${PERSONAL_KEY_PREFIX}${userId || 'guest'}`;
    const current = getPersonalTemplates(userId);
    const terms = Array.isArray(termsArray) ? termsArray : termsArray.split('\n').map(t => t.trim()).filter(Boolean);
    const newTpl = {
      id: `personal-${Date.now()}`,
      name: name || 'Template Saya',
      type: 'personal',
      terms
    };
    const updated = [...current, newTpl];
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save personal template:', err);
    return getPersonalTemplates(userId);
  }
}

// 6. Delete Sales Personal Template
export function deletePersonalTemplate(userId, id) {
  try {
    const key = `${PERSONAL_KEY_PREFIX}${userId || 'guest'}`;
    const current = getPersonalTemplates(userId);
    const updated = current.filter(t => t.id !== id);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete personal template:', err);
    return getPersonalTemplates(userId);
  }
}

// 7. Combined templates for quotation selector (Master + Sales Personal)
export function getAllTemplatesForUser(userId) {
  const master = getMasterTemplates();
  const personal = getPersonalTemplates(userId);
  return [...master, ...personal];
}
