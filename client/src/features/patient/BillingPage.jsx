import { useState, useMemo } from 'react';
import { CreditCard, CheckCircle, Clock, FileText, Download, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { invoicesAPI } from '../../api/generalAPI';
import LoadingSpinner from '../../components/LoadingSpinner';
import PaymentCheckout from '../../components/PaymentCheckout';

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['patient_invoices'],
    queryFn: async () => {
      const { data } = await invoicesAPI.getAll();
      return data.data?.invoices || data.data || [];
    },
  });

  const { totalOutstanding, paidCount, pendingCount } = useMemo(() => {
    let outstanding = 0;
    let paid = 0;
    let pending = 0;
    invoices.forEach((inv) => {
      if (inv.status === 'PAID') {
        paid++;
      } else if (inv.status === 'CANCELLED') {
        // skip
      } else {
        pending++;
        outstanding += inv.total || 0;
      }
    });
    return { totalOutstanding: outstanding, paidCount: paid, pendingCount: pending };
  }, [invoices]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handlePayNow = (invoice) => {
    setPayingInvoice(invoice);
    setShowCheckout(true);
  };

  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries(['patient_invoices']);
  };

  const handleDownloadPDF = async (invoiceId) => {
    try {
      const { data } = await invoicesAPI.downloadInvoicePDF(invoiceId);
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoiceId.slice(-8)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF download failed:', error);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-display font-bold text-neutral-900">Billing & Payments</h1>
        <p className="text-neutral-500 mt-1">View your statements and make payments.</p>
      </div>

      {/* Balance Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-lg shadow-red-500/20">
        <div>
          <p className="text-red-100 font-medium mb-1">Total Outstanding Balance</p>
          <h2 className="text-4xl font-display font-bold">{formatCurrency(totalOutstanding)}</h2>
          <p className="text-sm mt-2 text-white/80">{pendingCount} pending invoice{pendingCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Invoice History */}
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900">Recent Statements</h2>
              <span className="text-sm text-neutral-500">{invoices.length} total</span>
            </div>
            <div className="divide-y divide-neutral-100">
              {invoices.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  <FileText className="mx-auto text-neutral-300 mb-2" size={32} />
                  <p className="font-medium">No invoices found</p>
                </div>
              ) : (
                invoices.map((inv) => {
                  const isPaid = inv.status === 'PAID';
                  const isCancelled = inv.status === 'CANCELLED';
                  return (
                    <div key={inv._id} className="p-5 hover:bg-neutral-50 transition-colors group flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isPaid ? 'bg-green-50 text-green-600' : isCancelled ? 'bg-neutral-100 text-neutral-400' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {isPaid ? <CheckCircle size={20} /> : isCancelled ? <X size={20} /> : <Clock size={20} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-neutral-900">
                            {inv.appointmentId?.serviceId?.name || 'Medical Service'}
                          </h3>
                          <p className="text-sm text-neutral-500 mt-0.5">
                            Invoice #{inv._id?.slice(-8).toUpperCase()} • {formatDate(inv.createdAt)}
                          </p>
                          {inv.payments?.length > 0 && (
                            <p className="text-xs text-neutral-400 mt-1">
                              Paid via {inv.payments[inv.payments.length - 1].method}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                        <span className="text-lg font-bold text-neutral-900">{formatCurrency(inv.total)}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            isPaid ? 'bg-green-100 text-green-700' : isCancelled ? 'bg-neutral-100 text-neutral-500' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {inv.status}
                          </span>
                          {isPaid && (
                            <button
                              onClick={() => handleDownloadPDF(inv._id)}
                              className="text-neutral-400 hover:text-emerald-600 transition-colors"
                              title="Download PDF"
                            >
                              <Download size={16} />
                            </button>
                          )}
                        </div>
                        {!isPaid && !isCancelled && (
                          <button
                            onClick={() => handlePayNow(inv)}
                            className="text-xs font-semibold px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
            <h3 className="font-bold text-neutral-900 flex items-center gap-2 mb-4">
              <CreditCard size={18} /> Payment Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                <span className="text-sm text-neutral-700">Paid Invoices</span>
                <span className="text-lg font-bold text-green-600">{paidCount}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-xl">
                <span className="text-sm text-neutral-700">Pending</span>
                <span className="text-lg font-bold text-orange-600">{pendingCount}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-xl">
                <span className="text-sm text-neutral-700">Total Paid</span>
                <span className="text-lg font-bold text-neutral-900">
                  {formatCurrency(invoices.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + (i.total || 0), 0))}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
            <h3 className="font-bold mb-2">Payment Methods</h3>
            <p className="text-sm text-emerald-100 mb-3">Pay securely via UPI, Cards, or Net Banking</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">UPI</span>
              <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">Cards</span>
              <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">Net Banking</span>
              <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">Wallets</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Checkout Modal */}
      {showCheckout && payingInvoice && (
        <PaymentCheckout
          invoice={payingInvoice}
          onClose={() => { setShowCheckout(false); setPayingInvoice(null); }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
