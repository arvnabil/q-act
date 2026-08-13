// ============================================
// ACTiV Quotation Dashboard — Mockup Data
// ============================================

export const COMPANY = {
  name: 'PT. Alfa Cipta Teknologi Virtual',
  brand: 'ACTiV',
  address: 'Infinity Office, Bellezza BSA 1st Floor Unit 106, Jl. Letjen Soepeno, Kebayoran Lama, Jakarta Selatan 12210',
  branch: 'Ruko Golden Boulevard Blok S No.28 Pahlawan Seribu, BSD Serpong',
  phone: '(021) 50110987',
  email: 'sales@activ.co.id',
  website: 'www.activ.co.id',
  bankAccounts: [
    { id: 'bca-1', bank: 'BCA', number: '6044447899', name: 'PT ALFA CIPTA TEKNOLOGI VIRTUAL', isDefault: true },
    { id: 'mandiri-1', bank: 'Mandiri', number: '1680004444789', name: 'PT ALFA CIPTA TEKNOLOGI VIRTUAL' }
  ],
};

export const SALES_TEAM = [
  { id: 'S001', name: 'Rifki Wicaksono', role: 'Sales Manager', mobile: '0812-8427-4887', email: 'rifki.dwi@activ.co.id', avatar: 'RW', target: 800000000, achieved: 725000000 },
  { id: 'S002', name: 'Anisa Putri', role: 'Account Executive', mobile: '0813-5567-2201', email: 'anisa.putri@activ.co.id', avatar: 'AP', target: 600000000, achieved: 580000000 },
  { id: 'S003', name: 'Budi Santoso', role: 'Account Executive', mobile: '0815-7892-3301', email: 'budi.santoso@activ.co.id', avatar: 'BS', target: 600000000, achieved: 492000000 },
  { id: 'S004', name: 'Dewi Lestari', role: 'Sales Representative', mobile: '0878-1234-5600', email: 'dewi.lestari@activ.co.id', avatar: 'DL', target: 500000000, achieved: 410000000 },
  { id: 'S005', name: 'Farhan Akbar', role: 'Sales Representative', mobile: '0821-5543-8800', email: 'farhan.akbar@activ.co.id', avatar: 'FA', target: 500000000, achieved: 355000000 },
];

export const CUSTOMERS = [
  { id: 'C001', name: 'PT. KPSG', pic: 'Gabriela', phone: '0878 8935 8600', email: 'gabriela.giovania@kpsg.com', totalSpend: 478500000 },
  { id: 'C002', name: 'PT. Bank Central Asia', pic: 'Hendro Salim', phone: '0812 3344 5566', email: 'hendro.salim@bca.co.id', totalSpend: 392000000 },
  { id: 'C003', name: 'PT. Telkom Indonesia', pic: 'Sari Rahmawati', phone: '0856 7788 9900', email: 'sari.rahmawati@telkom.co.id', totalSpend: 356000000 },
  { id: 'C004', name: 'PT. Astra International', pic: 'Daniel Lim', phone: '0811 2233 4455', email: 'daniel.lim@astra.co.id', totalSpend: 289000000 },
  { id: 'C005', name: 'PT. Pertamina', pic: 'Ratna Dewi', phone: '0813 9988 7766', email: 'ratna.dewi@pertamina.com', totalSpend: 245000000 },
  { id: 'C006', name: 'PT. Garuda Indonesia', pic: 'Andi Wijaya', phone: '0857 6655 4433', email: 'andi.wijaya@garuda.co.id', totalSpend: 198000000 },
  { id: 'C007', name: 'PT. Unilever Indonesia', pic: 'Lisa Mariana', phone: '0878 5544 3322', email: 'lisa.mariana@unilever.com', totalSpend: 167000000 },
  { id: 'C008', name: 'PT. XL Axiata', pic: 'Bagus Pratama', phone: '0821 1122 3344', email: 'bagus.pratama@xl.co.id', totalSpend: 145000000 },
];

export const BRANDS = [
  { name: 'Jabra', color: '#E6960E' },
  { name: 'Logitech', color: '#00A88F' },
  { name: 'Poly', color: '#7C3AED' },
  { name: 'Yealink', color: '#2563EB' },
  { name: 'Hikvision', color: '#DC2626' },
];

export const PRODUCTS = [
  { sku: 'JBR-EV265FL390', brand: 'Jabra', name: 'Evolve2 65 Flex Link390', price: 5124900, description: 'Headset nirkabel profesional yang dirancang untuk kebutuhan komunikasi dan kolaborasi modern, dilengkapi dengan Jabra Link 390 Bluetooth USB Adapter. Mendukung Bluetooth 5.2, ANC, ClearVoice, baterai hingga 20 jam.' },
  { sku: 'JBR-EV275SFLK', brand: 'Jabra', name: 'Evolve2 75 Stereo Link380', price: 6850000, description: 'Headset stereo nirkabel premium dengan ANC dan 8-microphone technology untuk panggilan ultra-jelas.' },
  { sku: 'JBR-SP750', brand: 'Jabra', name: 'Speak 750 MS', price: 4200000, description: 'Portable speakerphone untuk ruang meeting kecil-menengah, tersertifikasi Microsoft Teams.' },
  { sku: 'LOG-RLYBAR', brand: 'Logitech', name: 'Rally Bar', price: 28500000, description: 'Video conferencing bar all-in-one untuk ruang meeting besar, 4K Ultra-HD, AI-powered framing.' },
  { sku: 'LOG-BRIOSTRM', brand: 'Logitech', name: 'Brio Stream 4K', price: 3200000, description: 'Webcam 4K Ultra HD untuk streaming dan video conference profesional.' },
  { sku: 'LOG-ZONE950', brand: 'Logitech', name: 'Zone Wireless 2', price: 4500000, description: 'Headset wireless noise-cancelling untuk profesional hybrid, Bluetooth + USB receiver.' },
  { sku: 'PLY-STVCAM', brand: 'Poly', name: 'Studio V52 Camera', price: 18900000, description: 'Kamera conferencing AI-powered untuk meeting room, 20MP sensor, auto-framing.' },
  { sku: 'PLY-VYG5200', brand: 'Poly', name: 'Voyager 5200 UC', price: 2750000, description: 'Bluetooth headset mono dengan WindSmart technology dan 4 noise-cancelling microphone.' },
  { sku: 'YLK-T58W', brand: 'Yealink', name: 'SIP-T58W Pro', price: 7800000, description: 'IP Video Phone dengan layar 7-inch touch, kamera 2MP built-in, Android 9.0.' },
  { sku: 'YLK-MVC940', brand: 'Yealink', name: 'MVC940 Teams Room', price: 45000000, description: 'Sistem video conferencing all-in-one untuk ruang besar, dual-screen, tersertifikasi Microsoft Teams Rooms.' },
  { sku: 'HIK-DS2CD', brand: 'Hikvision', name: 'DS-2CD2T47G2 4MP', price: 3100000, description: 'Kamera IP bullet 4MP AcuSense dengan built-in microphone dan human/vehicle detection.' },
  { sku: 'HIK-NVR32', brand: 'Hikvision', name: 'DS-7732NI-K4 32CH NVR', price: 8500000, description: 'NVR 32 channel 4K, 4 SATA, bandwidth up to 256 Mbps.' },
];

export const QUOTATIONS = [
  { id: 'QO5.0726.036', customer: 'PT. KPSG', pic: 'Gabriela', brand: 'Jabra', items: [{ sku: 'JBR-EV265FL390', qty: 7, price: 5124900 }], sales: 'Rifki Wicaksono', date: '2026-07-20', expired: '2026-07-26', status: 'sent', ppnRate: 0.11 },
  { id: 'QO5.0726.035', customer: 'PT. Bank Central Asia', pic: 'Hendro Salim', brand: 'Logitech', items: [{ sku: 'LOG-RLYBAR', qty: 3, price: 28500000 }, { sku: 'LOG-BRIOSTRM', qty: 10, price: 3200000 }], sales: 'Anisa Putri', date: '2026-07-19', expired: '2026-07-26', status: 'approved', ppnRate: 0.11 },
  { id: 'QO5.0726.034', customer: 'PT. Telkom Indonesia', pic: 'Sari Rahmawati', brand: 'Yealink', items: [{ sku: 'YLK-MVC940', qty: 2, price: 45000000 }], sales: 'Rifki Wicaksono', date: '2026-07-18', expired: '2026-07-25', status: 'approved', ppnRate: 0.11 },
  { id: 'QO5.0726.033', customer: 'PT. Astra International', pic: 'Daniel Lim', brand: 'Poly', items: [{ sku: 'PLY-STVCAM', qty: 5, price: 18900000 }, { sku: 'PLY-VYG5200', qty: 15, price: 2750000 }], sales: 'Budi Santoso', date: '2026-07-17', expired: '2026-07-24', status: 'sent', ppnRate: 0.11 },
  { id: 'QO5.0726.032', customer: 'PT. Pertamina', pic: 'Ratna Dewi', brand: 'Hikvision', items: [{ sku: 'HIK-DS2CD', qty: 50, price: 3100000 }, { sku: 'HIK-NVR32', qty: 4, price: 8500000 }], sales: 'Dewi Lestari', date: '2026-07-16', expired: '2026-07-23', status: 'created', ppnRate: 0.11 },
  { id: 'QO5.0726.031', customer: 'PT. Garuda Indonesia', pic: 'Andi Wijaya', brand: 'Jabra', items: [{ sku: 'JBR-SP750', qty: 12, price: 4200000 }], sales: 'Farhan Akbar', date: '2026-07-15', expired: '2026-07-22', status: 'expired', ppnRate: 0.11 },
  { id: 'QO5.0726.030', customer: 'PT. Unilever Indonesia', pic: 'Lisa Mariana', brand: 'Logitech', items: [{ sku: 'LOG-ZONE950', qty: 25, price: 4500000 }], sales: 'Anisa Putri', date: '2026-07-14', expired: '2026-07-21', status: 'approved', ppnRate: 0.11 },
  { id: 'QO5.0726.029', customer: 'PT. XL Axiata', pic: 'Bagus Pratama', brand: 'Yealink', items: [{ sku: 'YLK-T58W', qty: 20, price: 7800000 }], sales: 'Budi Santoso', date: '2026-07-13', expired: '2026-07-20', status: 'rejected', ppnRate: 0.11 },
  { id: 'QO5.0726.028', customer: 'PT. KPSG', pic: 'Gabriela', brand: 'Logitech', items: [{ sku: 'LOG-RLYBAR', qty: 2, price: 28500000 }, { sku: 'LOG-BRIOSTRM', qty: 5, price: 3200000 }], sales: 'Rifki Wicaksono', date: '2026-07-12', expired: '2026-07-19', status: 'approved', ppnRate: 0.11 },
  { id: 'QO5.0725.027', customer: 'PT. Bank Central Asia', pic: 'Hendro Salim', brand: 'Jabra', items: [{ sku: 'JBR-EV275SFLK', qty: 30, price: 6850000 }], sales: 'Anisa Putri', date: '2026-07-11', expired: '2026-07-18', status: 'approved', ppnRate: 0.11 },
  { id: 'QO5.0725.026', customer: 'PT. Telkom Indonesia', pic: 'Sari Rahmawati', brand: 'Poly', items: [{ sku: 'PLY-VYG5200', qty: 40, price: 2750000 }], sales: 'Dewi Lestari', date: '2026-07-10', expired: '2026-07-17', status: 'sent', ppnRate: 0.11 },
  { id: 'QO5.0725.025', customer: 'PT. Astra International', pic: 'Daniel Lim', brand: 'Hikvision', items: [{ sku: 'HIK-DS2CD', qty: 100, price: 3100000 }], sales: 'Farhan Akbar', date: '2026-07-09', expired: '2026-07-16', status: 'approved', ppnRate: 0.11 },
  { id: 'QO5.0725.024', customer: 'PT. Pertamina', pic: 'Ratna Dewi', brand: 'Jabra', items: [{ sku: 'JBR-EV265FL390', qty: 15, price: 5124900 }], sales: 'Rifki Wicaksono', date: '2026-07-08', expired: '2026-07-15', status: 'expired', ppnRate: 0.11 },
  { id: 'QO5.0725.023', customer: 'PT. Garuda Indonesia', pic: 'Andi Wijaya', brand: 'Logitech', items: [{ sku: 'LOG-RLYBAR', qty: 1, price: 28500000 }], sales: 'Budi Santoso', date: '2026-07-07', expired: '2026-07-14', status: 'approved', ppnRate: 0.11 },
  { id: 'QO5.0725.022', customer: 'PT. Unilever Indonesia', pic: 'Lisa Mariana', brand: 'Poly', items: [{ sku: 'PLY-STVCAM', qty: 3, price: 18900000 }], sales: 'Dewi Lestari', date: '2026-07-06', expired: '2026-07-29', status: 'sent', ppnRate: 0.11 },
  { id: 'QO5.0725.021', customer: 'PT. XL Axiata', pic: 'Bagus Pratama', brand: 'Hikvision', items: [{ sku: 'HIK-NVR32', qty: 6, price: 8500000 }], sales: 'Farhan Akbar', date: '2026-07-05', expired: '2026-07-30', status: 'created', ppnRate: 0.11 },
  { id: 'QO5.0724.020', customer: 'PT. KPSG', pic: 'Gabriela', brand: 'Yealink', items: [{ sku: 'YLK-T58W', qty: 10, price: 7800000 }], sales: 'Anisa Putri', date: '2026-07-04', expired: '2026-07-31', status: 'sent', ppnRate: 0.11 },
  { id: 'QO5.0724.019', customer: 'PT. Bank Central Asia', pic: 'Hendro Salim', brand: 'Logitech', items: [{ sku: 'LOG-ZONE950', qty: 50, price: 4500000 }], sales: 'Rifki Wicaksono', date: '2026-07-03', expired: '2026-08-01', status: 'created', ppnRate: 0.11 },
  { id: 'QO5.0724.018', customer: 'PT. Telkom Indonesia', pic: 'Sari Rahmawati', brand: 'Jabra', items: [{ sku: 'JBR-SP750', qty: 8, price: 4200000 }], sales: 'Budi Santoso', date: '2026-07-02', expired: '2026-07-31', status: 'approved', ppnRate: 0.11 },
  { id: 'QO5.0724.017', customer: 'PT. Astra International', pic: 'Daniel Lim', brand: 'Jabra', items: [{ sku: 'JBR-EV275SFLK', qty: 20, price: 6850000 }], sales: 'Dewi Lestari', date: '2026-07-01', expired: '2026-07-29', status: 'sent', ppnRate: 0.11 },
  { id: 'QO5.0724.016', customer: 'PT. Pertamina', pic: 'Ratna Dewi', brand: 'Yealink', items: [{ sku: 'YLK-MVC940', qty: 1, price: 45000000 }, { sku: 'YLK-T58W', qty: 5, price: 7800000 }], sales: 'Farhan Akbar', date: '2026-06-30', expired: '2026-07-30', status: 'approved', ppnRate: 0.11 },
  { id: 'QO5.0724.015', customer: 'PT. Garuda Indonesia', pic: 'Andi Wijaya', brand: 'Poly', items: [{ sku: 'PLY-STVCAM', qty: 2, price: 18900000 }], sales: 'Anisa Putri', date: '2026-06-29', expired: '2026-07-28', status: 'sent', ppnRate: 0.11 },
  { id: 'QO5.0724.014', customer: 'PT. Unilever Indonesia', pic: 'Lisa Mariana', brand: 'Hikvision', items: [{ sku: 'HIK-DS2CD', qty: 30, price: 3100000 }, { sku: 'HIK-NVR32', qty: 2, price: 8500000 }], sales: 'Budi Santoso', date: '2026-06-28', expired: '2026-07-28', status: 'approved', ppnRate: 0.11 },
  { id: 'QO5.0724.013', customer: 'PT. XL Axiata', pic: 'Bagus Pratama', brand: 'Logitech', items: [{ sku: 'LOG-BRIOSTRM', qty: 15, price: 3200000 }], sales: 'Rifki Wicaksono', date: '2026-06-27', expired: '2026-07-04', status: 'expired', ppnRate: 0.11 },
];

// Monthly revenue data for chart
export const MONTHLY_REVENUE = [
  { month: 'Feb', quotations: 18, revenue: 380000000, approved: 12 },
  { month: 'Mar', quotations: 22, revenue: 520000000, approved: 16 },
  { month: 'Apr', quotations: 19, revenue: 410000000, approved: 13 },
  { month: 'Mei', quotations: 25, revenue: 580000000, approved: 18 },
  { month: 'Jun', quotations: 28, revenue: 640000000, approved: 21 },
  { month: 'Jul', quotations: 24, revenue: 497500000, approved: 15 },
];

// Helper functions
export function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function formatCurrencyShort(amount) {
  if (amount >= 1000000000) return `Rp ${(amount / 1000000000).toFixed(1)}M`;
  if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(0)}jt`;
  return formatCurrency(amount);
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function calcQuotationTotal(items) {
  return items.reduce((sum, item) => sum + item.qty * item.price, 0);
}

export function calcGrandTotal(items, ppnRate) {
  const subtotal = calcQuotationTotal(items);
  return subtotal + subtotal * ppnRate;
}

export function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}
