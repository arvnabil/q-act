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

const MASTER_KEY = 'qact_global_master_terms_templates';
const PERSONAL_KEY_PREFIX = 'qact_personal_terms_templates_';

export function getMasterTemplates() {
  try {
    const stored = localStorage.getItem(MASTER_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMasterTemplate(name, termsArray, idToEdit = null) {
  try {
    const current = getMasterTemplates();
    const terms = Array.isArray(termsArray) ? termsArray : termsArray.split('\n').map(t => t.trim()).filter(Boolean);
    let updated;
    if (idToEdit) {
      updated = current.map(t => t.id === idToEdit ? { ...t, name, terms } : t);
    } else {
      const newTpl = { id: `master-${Date.now()}`, name: name || 'Master Template', type: 'master', terms };
      updated = [...current, newTpl];
    }
    localStorage.setItem(MASTER_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save master template:', err);
    return getMasterTemplates();
  }
}

export function deleteMasterTemplate(id) {
  try {
    const current = getMasterTemplates();
    const updated = current.filter(t => t.id !== id);
    localStorage.setItem(MASTER_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete master template:', err);
    return getMasterTemplates();
  }
}

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

export function savePersonalTemplate(userId, name, termsArray) {
  try {
    const key = `${PERSONAL_KEY_PREFIX}${userId || 'guest'}`;
    const current = getPersonalTemplates(userId);
    const terms = Array.isArray(termsArray) ? termsArray : termsArray.split('\n').map(t => t.trim()).filter(Boolean);
    const newTpl = { id: `personal-${Date.now()}`, name: name || 'Template Saya', type: 'personal', terms };
    const updated = [...current, newTpl];
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save personal template:', err);
    return getPersonalTemplates(userId);
  }
}

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

export function getAllTemplatesForUser(userId, serverMasterTerms = []) {
  const localMaster = getMasterTemplates();
  const serverMasters = (Array.isArray(serverMasterTerms) && serverMasterTerms.length > 0)
    ? serverMasterTerms.map(t => ({ ...t, type: 'master' }))
    : [];

  let masters = [];
  if (serverMasters.length > 0) {
    masters = [...serverMasters];
  } else if (localMaster.length > 0) {
    masters = [...localMaster];
  } else {
    masters = [...DEFAULT_MASTER_TEMPLATES];
  }

  // Also include any local master templates if not present
  localMaster.forEach(lm => {
    if (!masters.some(m => m.id === lm.id)) {
      masters.push({ ...lm, type: 'master' });
    }
  });

  const personal = getPersonalTemplates(userId).map(t => ({ ...t, type: 'personal' }));
  return [...masters, ...personal];
}
