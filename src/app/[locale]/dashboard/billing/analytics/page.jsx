'use client';

import React, { useState, useEffect } from 'react';
 import { getSystemAnalytics, getAllWallets } from '@/services/api/billing.service';
import { Loader, AlertCircle, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { useUser } from '../../../../../hooks/useUser';

export default function SystemAnalyticsPage() {
  const { role } = useUser();
  const [analytics, setAnalytics] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [analyticsRes, walletsRes] = await Promise.all([
          getSystemAnalytics(),
          getAllWallets(page, limit),
        ]);
        setAnalytics(analyticsRes.data.data);
        setWallets(walletsRes.data.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err.response?.data?.message || 'حدث خطأ في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    if (role === 'super_admin') {
      fetchData();
    }
  }, [role, page]);

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
          <h1 className="text-3xl font-bold text-gray-900">تحليلات النظام</h1>
          <p className="text-gray-600 mt-2">عرض إحصائيات الفواتير الشاملة للنظام</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Key Metrics */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Admins */}
            <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-600">إجمالي المسؤولين</h3>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{analytics.totalAdmins || 0}</p>
              <p className="text-xs text-gray-600 mt-2">عدد حسابات المسؤولين النشطة</p>
            </div>

            {/* Total Balance */}
            <div className="bg-white rounded-lg shadow p-6 border-t-4 border-green-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-600">إجمالي الأرصدة</h3>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">${analytics.totalBalance?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-gray-600 mt-2">إجمالي في جميع المحافظ</p>
            </div>

            {/* Total Transactions */}
            <div className="bg-white rounded-lg shadow p-6 border-t-4 border-orange-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-600">إجمالي العمليات</h3>
                <TrendingDown className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{analytics.totalTransactions || 0}</p>
              <p className="text-xs text-gray-600 mt-2">عدد المعاملات المالية</p>
            </div>

            {/* Total Revenue */}
            <div className="bg-white rounded-lg shadow p-6 border-t-4 border-purple-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-600">إجمالي الإيرادات</h3>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">${analytics.totalRevenue?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-gray-600 mt-2">من رسوم الاشتراك والعمولات</p>
            </div>
          </div>
        )}

        {/* Additional Metrics */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Active Subscriptions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">الاشتراكات النشطة</h3>
              <p className="text-4xl font-bold text-blue-600">{analytics.activeSubscriptions || 0}</p>
              <p className="text-sm text-gray-600 mt-2">اشتراكات سارية المفعول</p>
            </div>

            {/* Pending Withdrawals */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">طلبات السحب المعلقة</h3>
              <p className="text-4xl font-bold text-orange-600">{analytics.pendingWithdrawals || 0}</p>
              <p className="text-sm text-gray-600 mt-2">بانتظار الموافقة والمعالجة</p>
            </div>

            {/* Average Wallet Balance */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">متوسط رصيد المحفظة</h3>
              <p className="text-4xl font-bold text-green-600">${analytics.averageWalletBalance?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-gray-600 mt-2">متوسط لكل مسؤول</p>
            </div>
          </div>
        )}

        {/* Admin Wallets Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">محافظ المسؤولين</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">معرّف المسؤول</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الرصيد الحالي</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">إجمالي الأرباح</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">إجمالي المسحوب</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">العملة</th>
                </tr>
              </thead>
              <tbody>
                {wallets.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-600">
                      لا توجد محافظ
                    </td>
                  </tr>
                ) : (
                  wallets.map((wallet) => (
                    <tr key={wallet.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{wallet.adminId}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-blue-600">${wallet.balance.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-green-600">${wallet.totalEarned.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-orange-600">${wallet.totalWithdrawn.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{wallet.currency}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {wallets.length > 0 && (
            <div className="flex justify-center gap-3 p-6 border-t">
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
          )}
        </div>
      </div>
    </div>
  );
}
