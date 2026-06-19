import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <div className="text-center max-w-lg">
        <div className="relative mb-8">
          <p className="text-[120px] font-display font-bold text-primary-100 leading-none select-none">404</p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-lg border border-neutral-100 flex items-center justify-center">
              <Search size={32} className="text-primary-700" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-display font-bold text-neutral-900 mb-3">Page Not Found</h1>
        <p className="text-neutral-500 mb-8 text-lg">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/" className="btn-primary flex items-center gap-2">
            <Home size={18} /> Go to Homepage
          </Link>
          <button onClick={() => window.history.back()} className="btn-outline flex items-center gap-2">
            <ArrowLeft size={18} /> Go Back
          </button>
        </div>

        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Services', path: '/services' },
            { label: 'Doctors', path: '/doctors' },
            { label: 'Book Appointment', path: '/appointments/book' },
            { label: 'Contact Us', path: '/contact' },
          ].map((link) => (
            <Link
              key={link.label}
              to={link.path}
              className="bg-white rounded-xl p-3 border border-neutral-100 text-sm font-medium text-neutral-700 hover:text-primary-700 hover:border-primary-200 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
