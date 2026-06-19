import { useState } from 'react';
import { X, CreditCard, Smartphone, CheckCircle } from 'lucide-react';
import { invoicesAPI } from '../api/generalAPI';

export default function RazorpayCheckout({ invoice, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  };

  const handlePayment = async () => {
    try {
      setLoading(true);

      // Create Razorpay order
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
          try {
            // Verify payment on backend
            await invoicesAPI.verifyRazorpayPayment(invoiceId, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setSuccess(true);
            onSuccess?.();
          } catch (error) {
            console.error('Payment verification failed:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Razorpay payment error:', error);
      alert(error.response?.data?.message || 'Payment failed. Please try again.');
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
            Your payment of {formatCurrency(invoice.total)} has been processed successfully.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
          >
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
          <h3 className="text-lg font-bold text-neutral-900">Pay Invoice</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X size={20} />
          </button>
        </div>

        <div className="bg-neutral-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-neutral-600">Invoice ID</span>
            <span className="text-sm font-semibold">{invoice._id?.slice(-8).toUpperCase()}</span>
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
