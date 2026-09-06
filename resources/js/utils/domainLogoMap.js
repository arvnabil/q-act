/**
 * domainLogoMap.js
 * Persists a user-editable mapping of email-domain → logo file path + optional size overrides.
 */

const LS_KEY = 'domain_logo_map';

const DEFAULT_MAP = [
  {
    id: 'accommerce',
    domain: 'accommerce.id',
    logoPath: '/logo_accommerce.png',
    label: 'Accommerce',
    maxHeight: '70px',
    maxWidth: '240px',
  },
];

export function getDomainLogoMap() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('domainLogoMap: failed to parse localStorage', e);
  }
  return DEFAULT_MAP;
}

export function saveDomainLogoMap(map) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('domainLogoMap: failed to save to localStorage', e);
  }
}

export function resolveLogoConfigForEmail(email = '', isPdfMode = false) {
  const defaultHeight = isPdfMode ? '50px' : '45px';
  const defaultWidth  = isPdfMode ? '180px' : '160px';

  if (!email || !email.includes('@')) {
    return { logoPath: '/logo_quot.png', maxHeight: defaultHeight, maxWidth: defaultWidth };
  }

  const domain = email.split('@')[1].toLowerCase().trim();
  const map = getDomainLogoMap();
  const entry = map.find(e => e.domain.toLowerCase() === domain);

  if (!entry) {
    return { logoPath: '/logo_quot.png', maxHeight: defaultHeight, maxWidth: defaultWidth };
  }

  return {
    logoPath:  entry.logoPath,
    maxHeight: entry.maxHeight || defaultHeight,
    maxWidth:  entry.maxWidth  || defaultWidth,
  };
}

export function resolveLogoForEmail(email = '') {
  return resolveLogoConfigForEmail(email).logoPath;
}

export function generateId() {
  return `dlm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
