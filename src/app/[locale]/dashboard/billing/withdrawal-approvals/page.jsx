'use client';

import React, { useState, useEffect } from 'react';
 import { getAllWithdrawals, approveWithdrawal, rejectWithdrawal, completeWithdrawal } from '@/services/api/billing.service';
  import { Loader, AlertCircle } from 'lucide-react';
import { useUser } from '../../../../../hooks/useUser';

export default function WithdrawalApprovalsPage() {
  const { role } = useUser();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [statusFilter, setStatusFilter] = useState('requested');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  useEffect(() => {
    const fetchWithdrawals = async () => {
      try {
        setLoading(true);
        const params = statusFilter ? { status: statusFilter } : {};
        const res = await getAllWithdrawals(params);
        setWithdrawals(res.data.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching withdrawals:', err);
        setError(err.response?.data?.message || 'حدث خطأ في تحميل طلبات السحب');
      } finally {
        setLoading(false);
      }
    };

    if (role === 'super_admin') {
      fetchWithdrawals();
    }
  }, [role, statusFilter]);

  const handleApprove = async (id) => {
    try {
      await approveWithdrawal(id);
      setWithdrawals(
        withdrawals.map((w) =>
          w.id === id ? { ...w, status: 'approved' } : w
        )
      );
      setSuccessMsg('تمت الموافقة على طلب السحب');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error approving withdrawal:', err);
      setError(err.response?.data?.message || 'حدث خطأ في الموافقة');
    }
  };

  const handleReject = async (id) => {
    if (!rejectionReason.trim()) {
      setError('يرجى إدخال سبب الرفض');
      return;
    }

    try {
      await rejectWithdrawal(id, rejectionReason);
      setWithdrawals(
        withdrawals.map((w) =>
          w.id === id
            ? { ...w, status: 'rejected', rejectionReason }
            : w
        )
      );
      setRejectingId(null);
      setRejectionReason('');
      setSuccessMsg('تم رفض طلب السحب');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error rejecting withdrawal:', err);
      setError(err.response?.data?.message || 'حدث خطأ في الرفض');
    }
  };

  const handleComplete = async (id) => {
    try {
      await completeWithdrawal(id);
      setWithdrawals(
        withdrawals.map((w) =>
          w.id === id ? { ...w, status: 'completed' } : w
        )
      );
      setSuccessMsg('تم إكمال طلب السحب');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error completing withdrawal:', err);
      setError(err.response?.data?.message || 'حدث خطأ في الإكمال');
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
          <h1 className="text-3xl font-bold text-gray-900">الموافقة على طلبات السحب</h1>
          <p className="text-gray-600 mt-2">مراجعة وإدارة جميع طلبات السحب</p>
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

        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">حالة الطلب</h2>
          <div className="flex gap-4 flex-wrap">
            {['requested', 'approved', 'processing', 'completed', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                {status === 'requested' && 'قيد الانتظار'}
                {status === 'approved' && 'معتمد'}
                {status === 'processing' && 'قيد المعالجة'}
                {status === 'completed' && 'مكتمل'}
                {status === 'rejected' && 'مرفوض'}
              </button>
            ))}
          </div>
        </div>

        {/* Withdrawals List */}
        {withdrawals.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 text-lg">لا توجد طلبات سحب</p>
          </div>
        ) : (
          <div className="space-y-6">
            {withdrawals.map((withdrawal) => (
              <div key={withdrawal.id}>
                {rejectingId === withdrawal.id ? (
                  // Rejection Form
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">سبب الرفض</h3>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="أدخل سبب الرفض"
                      rows="4"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReject(withdrawal.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded transition"
                      >
                        تأكيد الرفض
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setRejectionReason('');
                        }}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 rounded transition"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  // Withdrawal Card with Actions
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">طلب سحب</h3>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-2 ${
                            withdrawal.status === 'requested'
                              ? 'bg-yellow-100 text-yellow-800'
                              : withdrawal.status === 'approved'
                              ? 'bg-blue-100 text-blue-800'
                              : withdrawal.status === 'processing'
                              ? 'bg-purple-100 text-purple-800'
                              : withdrawal.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {withdrawal.status === 'requested'
                            ? 'قيد الانتظار'
                            : withdrawal.status === 'approved'
                            ? 'معتمد'
                            : withdrawal.status === 'processing'
                            ? 'قيد المعالجة'
                            : withdrawal.status === 'completed'
                            ? 'مكتمل'
                            : 'مرفوض'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-orange-600">
                          ${withdrawal.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(withdrawal.createdAt).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 bg-gray-50 p-4 rounded">
                      <p className="text-gray-700">
                        <span className="font-semibold">المسؤول:</span> {withdrawal.adminId}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-semibold">اسم صاحب الحساب:</span> {withdrawal.accountHolderName}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-semibold">البنك:</span> {withdrawal.bankName}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-semibold">رقم الحساب:</span> {withdrawal.bankAccountNumber}
                      </p>
                    </div>

                    {withdrawal.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                        <p className="text-sm text-red-800">
                          <span className="font-semibold">سبب الرفض:</span> {withdrawal.rejectionReason}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {withdrawal.status === 'requested' && (
                        <>
                          <button
                            onClick={() => handleApprove(withdrawal.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded transition"
                          >
                            موافقة
                          </button>
                          <button
                            onClick={() => setRejectingId(withdrawal.id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded transition"
                          >
                            رفض
                          </button>
                        </>
                      )}
                      {withdrawal.status === 'approved' && (
                        <button
                          onClick={() => handleComplete(withdrawal.id)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition"
                        >
                          تحديد كمكتمل
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
