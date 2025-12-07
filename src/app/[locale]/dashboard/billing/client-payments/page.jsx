'use client';

import React, { useState, useEffect } from 'react';
 import { getClientPayments, recordClientPayment, markPaymentAsPaid } from '@/services/api/billing.service';
import { Loader, AlertCircle } from 'lucide-react';
import { useUser } from '../../../../../hooks/useUser';

export default function ClientPaymentsPage() {
  const { role, id: userId } = useUser();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    clientId: '',
    amount: '',
    description: '',
    invoiceId: '',
  });

  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const res = await getClientPayments({ page, limit });
        setPayments(res.data.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching payments:', err);
        setError(err.response?.data?.message || 'حدث خطأ في تحميل الدفعات');
      } finally {
        setLoading(false);
      }
    };

    if (role === 'admin') {
      fetchPayments();
    }
  }, [role, page]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.clientId || !formData.amount || !formData.description) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setSubmitting(true);
      const res = await recordClientPayment({
        adminId: userId,
        clientId: formData.clientId,
        amount: parseFloat(formData.amount),
        description: formData.description,
        invoiceId: formData.invoiceId || `INV-${Date.now()}`,
      });

      setPayments([res.data.data, ...payments]);
      setFormData({ clientId: '', amount: '', description: '', invoiceId: '' });
      setSuccessMsg('تم تسجيل الدفعة بنجاح');
      setError(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error recording payment:', err);
      setError(err.response?.data?.message || 'حدث خطأ في تسجيل الدفعة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (id) => {
    try {
      await markPaymentAsPaid(id);
      setPayments(payments.map((p) => (p.id === id ? { ...p, status: 'paid' } : p)));
      setSuccessMsg('تم تحديث حالة الدفعة');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error marking payment as paid:', err);
      setError(err.response?.data?.message || 'حدث خطأ في تحديث الدفعة');
    }
  };

  const statusLabels = {
    pending: 'قيد الانتظار',
    paid: 'مدفوع',
    failed: 'فشل',
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">دفعات العملاء</h1>
          <p className="text-gray-600 mt-2">تسجيل وإدارة دفعات العملاء</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800">{successMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Record Payment Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">تسجيل دفعة جديدة</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client ID */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">معرّف العميل</label>
                <input
                  type="text"
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleInputChange}
                  placeholder="أدخل معرّف العميل"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">المبلغ ($)</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="أدخل المبلغ"
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الوصف</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="أدخل وصف الدفعة"
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Invoice ID */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الفاتورة (اختياري)</label>
                <input
                  type="text"
                  name="invoiceId"
                  value={formData.invoiceId}
                  onChange={handleInputChange}
                  placeholder="أدخل رقم الفاتورة"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 mt-6"
              >
                {submitting ? 'جاري التسجيل...' : 'تسجيل الدفعة'}
              </button>
            </form>
          </div>

          {/* Payments History */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">سجل الدفعات</h2>

            {payments.length === 0 ? (
              <p className="text-gray-600 text-center py-8">لا توجد دفعات</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {payments.map((payment) => (
                  <div key={payment.id} className="bg-gray-50 rounded-lg p-4 border-r-4 border-blue-500">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">العميل: {payment.clientId}</h3>
                        <p className="text-sm text-gray-600 mt-1">{payment.description}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[payment.status] || 'bg-gray-100'}`}>
                        {statusLabels[payment.status] || payment.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mb-3">
                      <p className="text-lg font-bold text-green-600">${payment.amount.toFixed(2)}</p>
                      <p className="text-xs text-gray-600">{new Date(payment.createdAt).toLocaleDateString('ar-EG')}</p>
                    </div>

                    {payment.status === 'pending' && (
                      <button
                        onClick={() => handleMarkAsPaid(payment.id)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded transition"
                      >
                        تحديث إلى مدفوع
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="flex justify-center gap-3 mt-4 border-t pt-4">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                السابق
              </button>
              <span className="px-4 py-2 text-gray-900">{page}</span>
              <button
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg"
              >
                التالي
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
