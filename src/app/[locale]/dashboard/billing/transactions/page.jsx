'use client';

import React, { useState, useEffect } from 'react';
 import { getTransactions, getAllTransactions } from '@/services/api/billing.service';
import { TransactionTable } from '@/components/billing/BillingCards';
import { Loader, AlertCircle, Filter } from 'lucide-react';
import { useUser } from '../../../../../hooks/useUser';

export default function TransactionsPage() {
	const user = useUser()
	const { role } = user 
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const params = {
          page,
          limit,
          ...(typeFilter && { type: typeFilter }),
          ...(statusFilter && { status: statusFilter }),
        };

        const isSuperAdmin = role === 'super_admin';
        const res = isSuperAdmin ? await getAllTransactions(params) : await getTransactions(params);
        
        setTransactions(res.data.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(err.response?.data?.message || 'حدث خطأ في تحميل العمليات');
      } finally {
        setLoading(false);
      }
    };

    if (role === 'admin' || role === 'super_admin') {
      fetchTransactions();
    }
  }, [role, typeFilter, statusFilter, page]);

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">سجل العمليات</h1>
          <p className="text-gray-600 mt-2">عرض جميع معاملاتك المالية</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">الفلاتر</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">جميع الأنواع</option>
              <option value="deposit">إيداع</option>
              <option value="withdrawal">سحب</option>
              <option value="client_payment">دفع عميل</option>
              <option value="subscription_charge">رسوم الاشتراك</option>
              <option value="refund">استرجاع</option>
              <option value="commission">عمولة</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">جميع الحالات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="completed">مكتمل</option>
              <option value="failed">فشل</option>
              <option value="cancelled">ملغاة</option>
            </select>

            {/* Reset Button */}
            <button
              onClick={() => {
                setTypeFilter('');
                setStatusFilter('');
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition"
            >
              إعادة تعيين
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="flex items-center justify-center min-h-screen">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <TransactionTable transactions={transactions} loading={loading} />

              {/* Pagination */}
              <div className="flex justify-center gap-4 p-6 border-t">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                >
                  السابق
                </button>
                <span className="px-4 py-2 text-gray-900">{page}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  التالي
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
