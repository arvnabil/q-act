export const DEFAULT_COMPANY = {
  name: 'PT. Alfa Cipta Teknologi Virtual',
  brand: 'ACTiV',
  address: 'Infinity Office, Bellezza BSA 1st Floor Unit 106, Jl. Letjen Soepeno, Kebayoran Lama, Jakarta Selatan 12210',
  address2: '',
  branch: 'Ruko Golden Boulevard Blok S No.28 Pahlawan Seribu, BSD Serpong',
  branch2: 'Kota Tangerang Selatan, 15315',
  phone: '(021) 50110987',
  email: 'sales@activ.co.id',
  website: 'www.activ.co.id',
};

export const getCompanyInfo = (serverInfo = {}) => ({ ...DEFAULT_COMPANY, ...(serverInfo || {}) });
