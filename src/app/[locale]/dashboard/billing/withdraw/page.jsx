'use client';

import React, { useState, useEffect } from 'react';
 import { getWallet, getWithdrawals, requestWithdrawal } from '@/services/api/billing.service';
import { WithdrawalCard } from '@/components/billing/BillingCards';
import { Loader, AlertCircle } from 'lucide-react';
import { useUser } from '../../../../../hooks/useUser';

export default function WithdrawalPage() {
 
		const {role, id: userId} = useUser()
   const [wallet, setWallet] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    bankName: '',
    bankAccountNumber: '',
    accountHolderName: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [walletRes, withdrawalsRes] = await Promise.all([
          getWallet(),
          getWithdrawals(),
        ]);
        setWallet(walletRes.data.data);
        setWithdrawals(withdrawalsRes.data.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.message || 'حدث خطأ في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    if (role === 'admin' || role === 'super_admin') {
      fetchData();
    }
  }, [role]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || !formData.bankName || !formData.bankAccountNumber || !formData.accountHolderName) {
      setError('يرجى ملء جميع الحقول');
      return;
    }

    if (parseFloat(formData.amount) > wallet?.balance) {
      setError('المبلغ المطلوب أكبر من رصيد المحفظة');
      return;
    }

    try {
      setSubmitting(true);
      const res = await requestWithdrawal({
        adminId: userId,
        amount: parseFloat(formData.amount),
        bankName: formData.bankName,
        bankAccountNumber: formData.bankAccountNumber,
        accountHolderName: formData.accountHolderName,
      });

      setWithdrawals([res.data.data, ...withdrawals]);
      setFormData({ amount: '', bankName: '', bankAccountNumber: '', accountHolderName: '' });
      setSuccessMsg('تم إرسال طلب السحب بنجاح');
      setError(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error requesting withdrawal:', err);
      setError(err.response?.data?.message || 'حدث خطأ في إرسال طلب السحب');
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="text-3xl font-bold text-gray-900">طلب سحب أموال</h1>
          <p className="text-gray-600 mt-2">اطلب سحب الأموال من محفظتك</p>
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

        {/* Wallet Balance */}
        {wallet && (
          <div className="bg-white rounded-lg shadow p-6 mb-8 border-l-4 border-blue-500">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">رصيد المحفظة</h2>
            <p className="text-4xl font-bold text-blue-600">{wallet.balance.toFixed(2)} $</p>
            <p className="text-gray-600 mt-2">الحد الأدنى للسحب: $10</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Withdrawal Request Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">نموذج طلب السحب</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">المبلغ ($)</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="أدخل المبلغ"
                  min="10"
                  max={wallet?.balance || 0}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">اسم البنك</label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  placeholder="مثل: البنك الأهلي"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الحساب</label>
                <input
                  type="text"
                  name="bankAccountNumber"
                  value={formData.bankAccountNumber}
                  onChange={handleInputChange}
                  placeholder="أدخل رقم الحساب"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">اسم صاحب الحساب</label>
                <input
                  type="text"
                  name="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={handleInputChange}
                  placeholder="أدخل اسم صاحب الحساب"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 mt-6"
              >
                {submitting ? 'جاري الإرسال...' : 'إرسال طلب السحب'}
              </button>
            </form>
          </div>

          {/* Withdrawal Requests History */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">سجل طلبات السحب</h2>

            {withdrawals.length === 0 ? (
              <p className="text-gray-600 text-center py-8">لا توجد طلبات سحب</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {withdrawals.map((request) => (
                  <WithdrawalCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
