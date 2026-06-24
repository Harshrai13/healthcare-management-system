import { useState } from 'react';
import { X, CreditCard, Smartphone, CheckCircle, XCircle, Download, RefreshCw, Copy } from 'lucide-react';
import { invoicesAPI } from '../api/generalAPI';

export default function RazorpayCheckout({ invoice, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setFailed(false);
      setErrorMessage('');

      const { data: orderData } = await invoicesAPI.createRazorpayOrder(invoice._id);
      const { orderId, amount, currency, keyId, invoiceId, patientName, patientEmail, patientPhone } = orderData.data;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'VerdantCare Medical Center',
        description: `Invoice Payment - ${invoiceId.slice(-8).toUpperCase()}`,
        order_id: orderId,
        prefill: {
          name: patientName,
          email: patientEmail,
          contact: patientPhone,
        },
        theme: {
          color: '#059669',
        },
        handler: async (response) => {
          setLoading(false);
          setVerifying(true);
          try {
            await invoicesAPI.verifyRazorpayPayment(invoiceId, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setPaymentId(response.razorpay_payment_id);
            setPaymentMethod(response.method || 'UPI');
            setVerifying(false);
            setSuccess(true);
            onSuccess?.();
          } catch (error) {
            console.error('Payment verification failed:', error);
            setVerifying(false);
            setFailed(true);
            setErrorMessage(
              error?.response?.data?.message || 'Payment verification failed. Please contact support.'
            );
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setVerifying(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response) => {
        console.error('Razorpay payment failed:', response.error);
        setFailed(true);
        setErrorMessage(response.error?.description || 'Payment failed. Please try again.');
        setLoading(false);
        setVerifying(false);
      });
      razorpay.open();
    } catch (error) {
      console.error('Razorpay payment error:', error);
      setFailed(true);
      setErrorMessage(error?.response?.data?.message || 'Payment failed. Please try again.');
      setLoading(false);
      setVerifying(false);
    }
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

  const handleCopyPaymentId = () => {
    if (paymentId) {
      navigator.clipboard.writeText(paymentId);
    }
  };

  const handleRetry = () => {
    setFailed(false);
    setErrorMessage('');
    setSuccess(false);
    setPaymentId('');
    handlePayment();
  };

  // Razorpay-style green success screen
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
                <span className="text-neutral-500">Payment ID</span>
                <button
                  onClick={handleCopyPaymentId}
                  className="flex items-center gap-1 font-mono text-neutral-900 hover:text-emerald-600"
                >
                  {paymentId.slice(-12)} <Copy size={12} />
                </button>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Paid via</span>
                <span className="font-semibold text-neutral-900 uppercase">{paymentMethod || 'UPI'}</span>
              </div>
            </div>
          </div>

          <p className="text-emerald-100 text-xs mt-6 flex items-center gap-1">
            Visit razorpay.com/support for queries
          </p>
          <p className="text-white/80 text-xs mt-1 font-medium">Secured by Razorpay</p>
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

  // Processing / confirming overlay
  if (verifying) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50 p-6 text-center">
        <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <div className="w-16 h-16 bg-yellow-400 rounded-full" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Confirming Payment</h2>
        <p className="text-neutral-500">This will only take a few seconds.</p>
        <p className="text-neutral-400 text-sm mt-4 flex items-center gap-1">
          Secured by Razorpay
        </p>
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
          <p className="text-neutral-600 mb-4">{errorMessage || 'Your payment could not be processed.'}</p>
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
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
          <h3 className="text-lg font-bold text-neutral-900">Pay Invoice</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X size={20} />
          </button>
        </div>

        <div className="bg-neutral-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-neutral-600">Invoice ID</span>
            <span className="text-sm font-semibold">#{invoice._id?.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-neutral-600">Amount Due</span>
            <span className="text-lg font-bold text-neutral-900">{formatCurrency(invoice.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-neutral-600">Due Date</span>
            <span className="text-sm font-semibold">
              {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '-'}
            </span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-3 border border-neutral-200 rounded-xl">
            <Smartphone className="text-emerald-600" size={20} />
            <div>
              <p className="text-sm font-medium text-neutral-900">UPI</p>
              <p className="text-xs text-neutral-500">Google Pay, PhonePe, Paytm</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 border border-neutral-200 rounded-xl">
            <CreditCard className="text-emerald-600" size={20} />
            <div>
              <p className="text-sm font-medium text-neutral-900">Cards</p>
              <p className="text-xs text-neutral-500">Credit & Debit Cards</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 border border-neutral-200 rounded-xl">
            <CreditCard className="text-emerald-600" size={20} />
            <div>
              <p className="text-sm font-medium text-neutral-900">Net Banking</p>
              <p className="text-xs text-neutral-500">All major banks</p>
            </div>
          </div>
        </div>

        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : `Pay ${formatCurrency(invoice.total)}`}
        </button>

        <p className="text-xs text-neutral-500 text-center mt-4">
          Secured by Razorpay
        </p>
      </div>
    </div>
  );
}