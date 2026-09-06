import re

with open('c:/development/quote/q-act/q-act-supabase/src/pages/Products.jsx', 'r', encoding='utf-8') as f:
    sup_content = f.read()

with open('c:/development/quote/q-act/q-act-laravel/resources/js/Pages/Products.jsx', 'r', encoding='utf-8') as f:
    lar_content = f.read()

# 1. Imports
imports_to_add = '''import { toast } from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { UploadCloud, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Download, AlertTriangle } from 'lucide-react';
'''
# We can just inject after lucide-react if not there
if 'react-hot-toast' not in lar_content:
    lar_content = re.sub(r'(import \{.*?\} from \'lucide-react\';)', r'\1\n' + imports_to_add, lar_content, flags=re.DOTALL)

# 2. States
states_to_add = '''
    const [showImportModal, setShowImportModal] = useState(false);
    const [importStep, setImportStep] = useState('upload'); // 'upload' | 'preview' | 'result'
    const [importRows, setImportRows] = useState([]);
    const [importErrors, setImportErrors] = useState([]);
    const [importResult, setImportResult] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const importFileInputRef = React.useRef(null);
'''
if 'showImportModal' not in lar_content:
    lar_content = re.sub(r'(const \[deleteModal.*?\] = useState.*?;\n)', r'\1' + states_to_add, lar_content)

# 3. Functions
funcs_match = re.search(r'(const COLUMN_MAP.*?const resetImportModal = \(\) => \{.*?\}\;)', sup_content, re.DOTALL)
if funcs_match and 'resetImportModal' not in lar_content:
    funcs = funcs_match.group(1)
    # Extract the export function as well
    export_match = re.search(r'(const handleExportProducts = \(\) => \{.*?\n\s*\};)', sup_content, re.DOTALL)
    if export_match:
        funcs = export_match.group(1) + '\n\n' + funcs
    else:
        # It's called handleExportExcel?
        export_match2 = re.search(r'(const handleExportExcel = \(\) => \{.*?\n\s*\};)', sup_content, re.DOTALL)
        if export_match2:
            funcs = export_match2.group(1) + '\n\n' + funcs

    execute_logic = '''
  const handleExecuteImport = () => {
    if (importErrors.length > 0) {
      toast.error('Perbaiki error validasi sebelum melanjutkan.');
      return;
    }
    setIsImporting(true);
    
    const toUpsert = importRows.map(r => {
        const { _rowNum, brand, ...rest } = r;
        return {
          sku: String(rest.sku || '').trim().toUpperCase(),
          name: String(rest.name || '').trim(),
          description: String(rest.description || '').trim() || null,
          price: Math.round(Number(rest.price) || 0),
          pricelist_distributor: Math.round(Number(rest.pricelist_distributor) || 0),
          diskon_distributor: Number(rest.diskon_distributor) || 0,
          modal: Math.round(Number(rest.modal) || 0),
          brand: (brand || '').trim(),
        };
    });

    router.post(route('products.import'), { products: toUpsert }, {
        preserveScroll: true,
        onSuccess: (page) => {
            setIsImporting(false);
            setImportResult({ inserted: toUpsert.length, updated: 0, errors: [] }); // Simulating result
            setImportStep('result');
            toast.success(page.props.flash?.message || 'Import berhasil!');
        },
        onError: (err) => {
            setIsImporting(false);
            toast.error(err.message || 'Gagal melakukan import');
        }
    });
  };
'''
    funcs = re.sub(r'const handleExecuteImport = async \(\) => \{.*?(?=\n\s*const resetImportModal)', execute_logic, funcs, flags=re.DOTALL)
    lar_content = re.sub(r'(?=\n\s*return \()', lambda m: '\n' + funcs + '\n', lar_content)

# 4. Buttons
buttons_to_add = '''
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-surface-600 bg-white hover:bg-surface-50 border border-surface-200 rounded-lg shadow-sm transition-colors"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-surface-600 bg-white hover:bg-surface-50 border border-surface-200 rounded-lg shadow-sm transition-colors"
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Import Excel
                    </button>
'''
if 'setShowImportModal(true)' not in lar_content:
    lar_content = re.sub(r'(<button\s+onClick=\{openCreate\}\s+className="flex items-center gap-1\.5 px-3 py-2)', lambda m: buttons_to_add + m.group(1), lar_content)

# 5. Modal
modal_match = re.search(r'(\{\/\* === IMPORT PRODUCTS MODAL === \*\/\}.*?document\.body\s*\))', sup_content, re.DOTALL)
if modal_match and 'IMPORT PRODUCTS MODAL' not in lar_content:
    modal = modal_match.group(1)
    # the modal in supabase uses `products?.some(p => p.sku...`
    # and in Laravel we also have `products` array prop.
    lar_content = re.sub(r'(\{deleteModal\.open && \(\s*<div)', lambda m: '\n      ' + modal + '\n\n      ' + m.group(1), lar_content, flags=re.DOTALL)

with open('c:/development/quote/q-act/q-act-laravel/resources/js/Pages/Products.jsx', 'w', encoding='utf-8') as f:
    f.write(lar_content)

