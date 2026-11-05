import { Toaster } from 'react-hot-toast';
import { Info } from 'lucide-react';

// One presentation for every toast, including API feedback and server flash messages.
export default function AppToaster() {
    return (
        <Toaster
            position="top-center"
            gutter={10}
            containerStyle={{ zIndex: 100001, top: 'max(80px, env(safe-area-inset-top))' }}
            toastOptions={{
                duration: 4000,
                style: {
                    background: '#ffffff',
                    color: '#1e293b',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
                    borderRadius: '0.75rem',
                    padding: '10px 16px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    lineHeight: '1.5',
                    maxWidth: 'min(480px, calc(100vw - 32px))',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'pre-line',
                },
                success: { iconTheme: { primary: '#009680', secondary: '#ffffff' } },
                error: {
                    duration: 6000,
                    iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
                    ariaProps: { role: 'alert', 'aria-live': 'assertive' },
                },
                loading: { duration: Infinity, iconTheme: { primary: '#009680', secondary: '#e2e8f0' } },
                blank: { icon: <Info aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-600" /> },
            }}
        />
    );
}
