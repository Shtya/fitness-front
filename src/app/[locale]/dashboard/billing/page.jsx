'use client';

import React, { useState, useEffect } from 'react';
 import { getWallet, getAdminAnalytics } from '@/services/api/billing.service';
import { WalletCard, SubscriptionCard } from '@/components/billing/BillingCards';
import { AlertCircle, Loader } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';

export default function BillingOverviewPage() {
 	const user = useUser()
	const role = user?.role
  const [wallet, setWallet] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [walletRes, analyticsRes] = await Promise.all([
          getWallet(),
          getAdminAnalytics(),
        ]);
        setWallet(walletRes.data.data);
        setAnalytics(analyticsRes.data.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching billing data:', err);
        setError(err.response?.data?.message || 'حدث خطأ في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    if (role === 'admin' || role === 'super_admin') {
      fetchData();
    }
  }, [role]);

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
          <h1 className="text-3xl font-bold text-gray-900">الفواتير والمحفظة</h1>
          <p className="text-gray-600 mt-2">إدارة محفظتك والاشتراكات والسحب</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Wallet Cards */}
        {wallet && <WalletCard {...wallet} />}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/ar/dashboard/billing/transactions">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer text-center">
              <p className="text-4xl font-bold text-blue-600">📊</p>
              <h3 className="font-semibold text-gray-900 mt-2">العمليات</h3>
              <p className="text-sm text-gray-600 mt-1">عرض سجل العمليات</p>
            </div>
          </Link>

          <Link href="/ar/dashboard/billing/subscriptions">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer text-center">
              <p className="text-4xl font-bold text-purple-600">📱</p>
              <h3 className="font-semibold text-gray-900 mt-2">الاشتراكات</h3>
              <p className="text-sm text-gray-600 mt-1">إدارة الاشتراكات</p>
            </div>
          </Link>

          <Link href="/ar/dashboard/billing/withdraw">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer text-center">
              <p className="text-4xl font-bold text-orange-600">💸</p>
              <h3 className="font-semibold text-gray-900 mt-2">السحب</h3>
              <p className="text-sm text-gray-600 mt-1">طلب سحب أموال</p>
            </div>
          </Link>

          <Link href="/ar/dashboard/billing/client-payments">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer text-center">
              <p className="text-4xl font-bold text-green-600">👥</p>
              <h3 className="font-semibold text-gray-900 mt-2">دفعات العملاء</h3>
              <p className="text-sm text-gray-600 mt-1">سجل دفعات العملاء</p>
            </div>
          </Link>
        </div>

        {/* Analytics Summary */}
        {analytics && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">عدد المشتركين النشطين</h3>
              <p className="text-3xl font-bold text-blue-600">{analytics.activeSubscriptions || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">الاشتراكات المنتهية</h3>
              <p className="text-3xl font-bold text-red-600">{analytics.expiredSubscriptions || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">طلبات السحب المعلقة</h3>
              <p className="text-3xl font-bold text-orange-600">{analytics.pendingWithdrawals || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">متوسط المعاملات</h3>
              <p className="text-3xl font-bold text-green-600">${analytics.averageTransactionAmount?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
