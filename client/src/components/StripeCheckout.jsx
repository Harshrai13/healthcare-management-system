import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, XCircle, CreditCard, Download, RefreshCw, Copy } from 'lucide-react';
import { invoicesAPI, settingsAPI } from '../api/generalAPI';

function loadStripeScript(publishableKey) {
  return new Promise((resolve, reject) => {
    if (window.Stripe) {
      resolve(window.Stripe(publishableKey));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => resolve(window.Stripe(publishableKey));
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function StripeCheckout({ invoice, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const cardRef = useRef(null);
  const stripeRef = useRef(null);
  const cardElementRef = useRef(null);
  const clientSecretRef = useRef(null);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  const formatDateTime = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        let publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        try {
          const { data } = await settingsAPI.getPaymentConfig();
          if (data?.data?.stripe?.enabled && data?.data?.stripe?.publishableKey) {
            publishableKey = data.data.stripe.publishableKey;
          }
        } catch {
          // Fallback to env var
        }

        const stripe = await loadStripeScript(publishableKey);
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
    setFailed(false);

    try {
      const { error: stripeError, paymentIntent } = await stripeRef.current.confirmCardPayment(
        clientSecretRef.current,
        { payment_method: { card: cardElementRef.current } }
      );

      if (stripeError) {
        setError(stripeError.message || 'Payment failed.');
        setFailed(true);
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
        setPaymentIntentId(paymentIntent.id);
        setSuccess(true);
        onSuccess?.();
      } else if (paymentIntent?.status === 'requires_payment_method') {
        setError('Payment failed. Please try a different card.');
        setFailed(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed. Please try again.');
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setFailed(false);
    setError('');
    setSuccess(false);
  };

  const handleDownloadReceipt = async () => {
    try {
      const { data } = await invoicesAPI.downloadInvoicePDF(invoice._id);
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoice._id.slice(-8)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Receipt download failed:', error);
    }
  };

  const handleCopyTransaction = () => {
    if (paymentIntentId) {
      navigator.clipboard.writeText(paymentIntentId);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-emerald-600 flex flex-col z-50">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
              <CheckCircle className="text-emerald-600" size={32} />
            </div>
          </div>

          <p className="text-emerald-100 text-sm mb-1">Payment Successful</p>
          <h2 className="text-3xl font-bold text-white mb-6">{formatCurrency(invoice.total)}</h2>

          <div className="bg-white rounded-2xl p-5 w-full max-w-sm text-left shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-semibold text-neutral-900">VerdantCare Medical Center</p>
                <p className="text-xs text-neutral-500">{formatDateTime(new Date())}</p>
              </div>
              <span className="text-sm font-bold text-neutral-900">{formatCurrency(invoice.total)}</span>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Invoice ID</span>
                <span className="font-semibold text-neutral-900">#{invoice._id?.slice(-8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Transaction</span>
                <button
                  onClick={handleCopyTransaction}
                  className="flex items-center gap-1 font-mono text-neutral-900 hover:text-emerald-600"
                >
                  {paymentIntentId.slice(-12)} <Copy size={12} />
                </button>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Paid via</span>
                <span className="font-semibold text-neutral-900">CARD</span>
              </div>
            </div>
          </div>

          <p className="text-white/80 text-xs mt-6 font-medium">Secured by Stripe</p>
        </div>

        <div className="p-4 bg-emerald-700">
          <button
            onClick={handleDownloadReceipt}
            className="w-full py-3 bg-white text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-colors"
          >
            View Receipt
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 mt-2 text-white font-medium rounded-xl hover:bg-emerald-500/20 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="text-red-600" size={32} />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 mb-2">Payment Failed</h3>
          <p className="text-neutral-600 mb-4">{error || 'Your card payment could not be processed.'}</p>
          <div className="bg-red-50 rounded-xl p-3 mb-6 text-left">
            <div className="flex justify-between text-xs">
              <span className="text-red-700">Invoice ID</span>
              <span className="font-semibold text-red-900">
                #{invoice._id?.slice(-8).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-red-700">Amount</span>
              <span className="font-bold text-red-900">{formatCurrency(invoice.total)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-neutral-200 text-neutral-700 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleRetry}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw size={16} /> Try Again
            </button>
          </div>
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
          <div className="flex justify-between mb-2">
            <span className="text-sm text-neutral-600">Invoice ID</span>
            <span className="text-sm font-semibold">#{invoice._id?.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-neutral-600">Amount Due</span>
            <span className="text-lg font-bold">{formatCurrency(invoice.total)}</span>
          </div>
        </div>

        <label className="block text-sm font-medium text-neutral-700 mb-2">Card Details</label>
        <div ref={cardRef} className="p-3 border border-neutral-200 rounded-xl mb-4 min-h-[44px]" />

        {error && !failed && <p className="text-sm text-red-600 mb-4">{error}</p>}

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