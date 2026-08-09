import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Headset, Mail, Phone, MapPin, Send, ArrowLeft, CheckCircle, HelpCircle, MessageSquare, Clock, ShieldCheck } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { toast } from 'react-hot-toast';

export default function Support() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast.success('Pesan Anda telah dikirim ke Tim Support!');
    }, 1000);
  };

  const faqs = [
    {
      q: 'Bagaimana cara mereset password akun saya?',
      a: 'Anda dapat menghubungi Administrator sistem perusahaan Anda di menu User Management untuk dibuatkan password baru, atau menghubungi tim support kami via WhatsApp.'
    },
    {
      q: 'Apakah data quotation yang dihapus dapat dikembalikan?',
      a: 'Data quotation yang sudah dihapus secara permanen tidak dapat dikembalikan. Pastikan untuk memeriksa kembali sebelum menghapus data penawaran.'
    },
    {
      q: 'Mengapa status quotation berubah menjadi Expired?',
      a: 'Sistem secara otomatis akan mengubah status quotation menjadi Expired apabila tanggal hari ini melewati Expired Date yang ditentukan pada quotation tersebut.'
    },
    {
      q: 'Bagaimana cara menambahkan nomor rekening bank baru?',
      a: 'Khusus pengguna dengan role Administrator, Anda dapat mengelola daftar rekening bank resmi di menu Settings pada tab Rekening Bank.'
    }
  ];

  return (
    <div className="min-h-screen bg-surface-50 font-sans text-surface-800 pb-16">
      {/* Header Bar */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center border border-surface-200 shadow-sm shrink-0">
              <img src="/logo.png" alt="ACTiV" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-base font-extrabold text-brand-700 tracking-tight block">ACTiV</span>
              <span className="text-[10px] font-bold text-surface-400 tracking-wider uppercase block -mt-1">Pusat Bantuan</span>
            </div>
          </div>

          <button
            onClick={() => navigate(user ? '/' : '/login')}
            className="flex items-center gap-2 text-sm font-semibold text-surface-600 hover:text-brand-600 px-3.5 py-2 rounded-lg bg-surface-100 hover:bg-brand-50 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{user ? 'Kembali ke Dashboard' : 'Kembali ke Login'}</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 text-white py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-brand-100 backdrop-blur-sm border border-white/10 mb-4">
            <Headset className="w-3.5 h-3.5" />
            Layanan Pelanggan & Bantuan Teknis
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Butuh Bantuan Kendala Teknis?
          </h1>
          <p className="text-sm sm:text-base text-brand-100/90 max-w-2xl mx-auto">
            Tim dukungan teknis PT. Alfa Cipta Teknologi Virtual siap membantu kendala operasional portal quotation Anda.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 space-y-10">
        
        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <a
            href="https://wa.me/6287780116800"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-2xl p-6 border border-surface-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-surface-900 mb-1">Accommerce CS</h3>
            <p className="text-xs text-surface-500 mb-3">Respons cepat via WhatsApp Customer Service.</p>
            <span className="text-xs font-bold text-emerald-600 group-hover:underline flex items-center gap-1">
              +62 877-8011-6800 →
            </span>
          </a>

          <a
            href="mailto:support@activ.co.id"
            className="bg-white rounded-2xl p-6 border border-surface-200 shadow-sm hover:shadow-md hover:border-brand-400 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-surface-900 mb-1">Email Support</h3>
            <p className="text-xs text-surface-500 mb-3">Kirimkan kendala detail melalui email resmi.</p>
            <span className="text-xs font-bold text-brand-600 group-hover:underline flex items-center gap-1">
              support@activ.co.id →
            </span>
          </a>

          <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-surface-900 mb-1">Jam Operasional</h3>
            <p className="text-xs text-surface-500 mb-1">Senin - Jumat: 08:30 - 17:30 WIB</p>
            <p className="text-xs text-surface-500">Sabtu & Minggu: Sesuai piket tim</p>
          </div>
        </div>

        {/* Contact Form & FAQ Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* FAQ Accordion (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-surface-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-surface-900">Pertanyaan yang Sering Diajukan (FAQ)</h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="border border-surface-100 rounded-xl p-4 bg-surface-50/50 hover:bg-surface-50 transition-colors">
                  <h4 className="text-sm font-bold text-surface-900 mb-1.5 flex items-start gap-2">
                    <span className="text-brand-600">Q:</span>
                    <span>{faq.q}</span>
                  </h4>
                  <p className="text-xs text-surface-600 leading-relaxed pl-5">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500">
              <span>Ingin membaca dokumentasi fitur lengkap?</span>
              <Link to="/guide" className="font-bold text-brand-600 hover:underline">
                Buka Halaman Panduan →
              </Link>
            </div>
          </div>

          {/* Ticket / Support Form (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-surface-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-surface-900">Kirim Tiket Pesan</h2>
            </div>
            <p className="text-xs text-surface-500 mb-6">
              Isi formulir di bawah ini untuk mengirimkan laporan atau kendala teknis Anda.
            </p>

            {submitted ? (
              <div className="text-center py-8 bg-emerald-50 rounded-xl border border-emerald-100 p-6">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-emerald-900 mb-1">Pesan Berhasil Terkirim!</h3>
                <p className="text-xs text-emerald-700 mb-4">
                  Terima kasih. Tim support kami akan menghubungi Anda melalui email dalam kurun waktu maks 1x24 jam.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-xs font-bold text-emerald-800 bg-white px-4 py-2 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  Kirim Pesan Lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nama Anda"
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3.5 py-2.5 text-xs text-surface-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Email Kontak *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@perusahaan.com"
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3.5 py-2.5 text-xs text-surface-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Subjek / Perihal *</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Kendala cetak PDF / Reset kata sandi"
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3.5 py-2.5 text-xs text-surface-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Detail Kendala *</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Jelaskan secara singkat kronologi kendala yang Anda alami..."
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3.5 py-2.5 text-xs text-surface-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-3 rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Mengirim Pesan...' : 'Kirim Tiket Support'}</span>
                </button>
              </form>
            )}
          </div>

        </div>

        {/* Company Info Footer */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 text-center text-xs text-surface-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span className="font-semibold text-surface-700">PT. Alfa Cipta Teknologi Virtual</span>
          </div>
          <span>Hak Cipta © {new Date().getFullYear()} ACTiV Sales Portal. All rights reserved.</span>
        </div>

      </main>
    </div>
  );
}
