// Utility for Managing Syarat & Ketentuan Templates (Global Master & Sales Personal)

export const DEFAULT_MASTER_TEMPLATES = [];

const MASTER_KEY = 'qact_global_master_terms_templates';
const PERSONAL_KEY_PREFIX = 'qact_personal_terms_templates_';

// 1. Get Global Master Templates (Managed by Admin)
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
    return updated;
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
