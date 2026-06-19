import { useState } from 'react';
import { X, CreditCard, Smartphone, CheckCircle } from 'lucide-react';
import { invoicesAPI } from '../api/generalAPI';
import RazorpayCheckout from './RazorpayCheckout';
import StripeCheckout from './StripeCheckout';

export default function PaymentCheckout({ invoice, onClose, onSuccess }) {
  const [method, setMethod] = useState(null);
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  if (method === 'razorpay') {
    return (
      <RazorpayCheckout
        invoice={invoice}
        onClose={() => setMethod(null)}
        onSuccess={onSuccess}
      />
    );
  }

  if (method === 'stripe') {
    return (
      <StripeCheckout
        invoice={invoice}
        onClose={() => setMethod(null)}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-neutral-900">Choose Payment Method</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X size={20} />
          </button>
        </div>

        <div className="bg-neutral-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between">
            <span className="text-sm text-neutral-600">Amount Due</span>
            <span className="text-lg font-bold text-neutral-900">{formatCurrency(invoice.total)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setMethod('razorpay')}
            className="w-full flex items-center gap-3 p-4 border-2 border-neutral-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
          >
            <Smartphone className="text-emerald-600 shrink-0" size={22} />
            <div>
              <p className="font-semibold text-neutral-900">Razorpay</p>
              <p className="text-xs text-neutral-500">UPI, Cards, Net Banking, Wallets</p>
            </div>
          </button>

          {stripeKey && (
            <button
              onClick={() => setMethod('stripe')}
              className="w-full flex items-center gap-3 p-4 border-2 border-neutral-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
            >
              <CreditCard className="text-indigo-600 shrink-0" size={22} />
              <div>
                <p className="font-semibold text-neutral-900">Stripe</p>
                <p className="text-xs text-neutral-500">International cards & digital wallets</p>
              </div>
            </button>
          )}
        </div>

        <p className="text-xs text-neutral-500 text-center mt-4 flex items-center justify-center gap-1">
          <CheckCircle size={12} className="text-emerald-500" /> All payments are encrypted and secure
        </p>
      </div>
    </div>
  );
}
