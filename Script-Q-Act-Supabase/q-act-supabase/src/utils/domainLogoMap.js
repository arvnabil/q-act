/**
 * domainLogoMap.js
 * Persists a user-editable mapping of email-domain → logo file path + optional size overrides.
 * Stored in localStorage so it survives page refreshes without needing a DB.
 *
 * Shape stored:
 *   Array<{
 *     id: string,
 *     domain: string,
 *     logoPath: string,
 *     label?: string,
 *     maxHeight?: string,   // e.g. '70px'  — overrides default logo height in PDF
 *     maxWidth?: string,    // e.g. '240px' — overrides default logo width in PDF
 *   }>
 */

const LS_KEY = 'domain_logo_map';

/** Default seed – already works for accommerce.id out of the box */
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

/** Return the current mapping array */
export function getDomainLogoMap() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('domainLogoMap: failed to parse localStorage', e);
  }
  return DEFAULT_MAP;
}

/** Persist the full mapping array */
export function saveDomainLogoMap(map) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('domainLogoMap: failed to save to localStorage', e);
  }
}

/**
 * Resolve the full logo config for a given email address.
 * Returns { logoPath, maxHeight, maxWidth }.
 * Falls back to ACTiV defaults if no domain match is found.
 */
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

/** Legacy helper – kept for backward compat */
export function resolveLogoForEmail(email = '') {
  return resolveLogoConfigForEmail(email).logoPath;
}

/** Generate a simple unique id */
export function generateId() {
  return `dlm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
