import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, CreditCard } from 'lucide-react';
import { invoicesAPI } from '../api/generalAPI';

function loadStripeScript() {
  return new Promise((resolve, reject) => {
    if (window.Stripe) {
      resolve(window.Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => resolve(window.Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY));
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function StripeCheckout({ invoice, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const cardRef = useRef(null);
  const stripeRef = useRef(null);
  const cardElementRef = useRef(null);
  const clientSecretRef = useRef(null);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const stripe = await loadStripeScript();
        if (!mounted) return;

        const { data } = await invoicesAPI.createPaymentIntent(invoice._id);
        clientSecretRef.current = data.data.clientSecret;

        const elements = stripe.elements();
        const card = elements.create('card', {
          style: {
            base: { fontSize: '16px', color: '#374151', '::placeholder': { color: '#9CA3AF' } },
          },
        });

        stripeRef.current = stripe;
        cardElementRef.current = card;

        if (cardRef.current) {
          card.mount(cardRef.current);
          setReady(true);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to initialize Stripe payment.');
      }
    }

    init();

    return () => {
      mounted = false;
      cardElementRef.current?.destroy();
    };
  }, [invoice._id]);

  const handlePay = async () => {
    if (!stripeRef.current || !cardElementRef.current || !clientSecretRef.current) return;

    setLoading(true);
    setError('');

    try {
      const { error: stripeError, paymentIntent } = await stripeRef.current.confirmCardPayment(
        clientSecretRef.current,
        { payment_method: { card: cardElementRef.current } }
      );

      if (stripeError) {
        setError(stripeError.message || 'Payment failed.');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        await invoicesAPI.processPayment(invoice._id, {
          amount: invoice.total,
          method: 'CARD',
          gateway: 'stripe',
          paymentIntentId: paymentIntent.id,
          transactionId: paymentIntent.id,
        });
        setSuccess(true);
        onSuccess?.();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-emerald-600" size={32} />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 mb-2">Payment Successful!</h3>
          <p className="text-neutral-600 mb-6">
            Your payment of {formatCurrency(invoice.total)} has been processed via Stripe.
          </p>
          <button onClick={onClose} className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <CreditCard size={20} className="text-indigo-600" /> Pay with Stripe
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X size={20} />
          </button>
        </div>

        <div className="bg-neutral-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between">
            <span className="text-sm text-neutral-600">Amount Due</span>
            <span className="text-lg font-bold">{formatCurrency(invoice.total)}</span>
          </div>
        </div>

        <label className="block text-sm font-medium text-neutral-700 mb-2">Card Details</label>
        <div ref={cardRef} className="p-3 border border-neutral-200 rounded-xl mb-4 min-h-[44px]" />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          onClick={handlePay}
          disabled={loading || !ready}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : `Pay ${formatCurrency(invoice.total)}`}
        </button>

        <p className="text-xs text-neutral-500 text-center mt-4">Secured by Stripe</p>
      </div>
    </div>
  );
}
