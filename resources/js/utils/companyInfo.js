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

export const getCompanyInfo = () => {
  try {
    const saved = localStorage.getItem('company_info');
    if (saved) {
      return { ...DEFAULT_COMPANY, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load company info from localStorage', e);
  }
  return DEFAULT_COMPANY;
};

export const saveCompanyInfo = (info) => {
  try {
    localStorage.setItem('company_info', JSON.stringify(info));
  } catch (e) {
    console.error('Failed to save company info to localStorage', e);
  }
};
