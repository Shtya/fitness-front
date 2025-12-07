'use client';

import React, { useState, useEffect } from 'react';
 import { getSubscription, renewSubscription } from '@/services/api/billing.service';
import { SubscriptionCard } from '@/components/billing/BillingCards';
import { Loader, AlertCircle } from 'lucide-react';
import { useUser } from '../../../../../hooks/useUser';

export default function SubscriptionsPage() {
	const user = useUser()
  const { role } = user 
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setLoading(true);
        const res = await getSubscription();
        setSubscription(res.data.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError(err.response?.data?.message || 'حدث خطأ في تحميل الاشتراك');
      } finally {
        setLoading(false);
      }
    };

    if (role === 'admin' || role === 'super_admin') {
      fetchSubscription();
    }
  }, [role]);

  const handleRenew = async () => {
    if (!subscription) return;

    try {
      setRenewing(true);
      const res = await renewSubscription(subscription.id);
      setSubscription(res.data.data);
      setError(null);
      alert('تم تجديد الاشتراك بنجاح');
    } catch (err) {
      console.error('Error renewing subscription:', err);
      setError(err.response?.data?.message || 'حدث خطأ في تجديد الاشتراك');
    } finally {
      setRenewing(false);
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
          <h1 className="text-3xl font-bold text-gray-900">الاشتراكات</h1>
          <p className="text-gray-600 mt-2">إدارة اشتراكك وتجديده</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Subscription Cards */}
        {subscription && (
          <div className="space-y-6">
            <SubscriptionCard {...subscription} />

            {/* Subscription Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">تفاصيل الاشتراك</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">الميزات المتضمنة</h3>
                  {subscription.features && subscription.features.length > 0 ? (
                    <ul className="space-y-2">
                      {subscription.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-gray-700">
                          <span className="text-green-500">✓</span> {feature}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600">لا توجد ميزات</p>
                  )}
                </div>

                <div className="bg-gray-50 rounded p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">معلومات الفترة</h3>
                  <div className="space-y-2 text-gray-700">
                    <p>
                      <span className="font-semibold">تاريخ البداية:</span>{' '}
                      {new Date(subscription.createdAt).toLocaleDateString('ar-EG')}
                    </p>
                    {subscription.expiresAt && (
                      <p>
                        <span className="font-semibold">تاريخ الانتهاء:</span>{' '}
                        {new Date(subscription.expiresAt).toLocaleDateString('ar-EG')}
                      </p>
                    )}
                    <p>
                      <span className="font-semibold">التجديد التلقائي:</span>{' '}
                      {subscription.autoRenew ? 'مفعل ✓' : 'معطل'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleRenew}
                  disabled={renewing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
                >
                  {renewing ? 'جاري التجديد...' : 'تجديد الاشتراك الآن'}
                </button>
                <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg transition">
                  إلغاء الاشتراك
                </button>
              </div>
            </div>

            {/* Subscription Plans */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">خطط الاشتراك المتاحة</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Free Plan */}
                <div className={`rounded-lg p-4 border-2 ${subscription.tier === 'free' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <h3 className="font-bold text-lg text-gray-900">مجاني</h3>
                  <p className="text-gray-600 text-sm mt-1">للمبتدئين</p>
                  <p className="text-2xl font-bold text-gray-900 mt-3">$0</p>
                  <p className="text-sm text-gray-600">شهري</p>
                </div>

                {/* Basic Plan */}
                <div className={`rounded-lg p-4 border-2 ${subscription.tier === 'basic' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <h3 className="font-bold text-lg text-gray-900">أساسي</h3>
                  <p className="text-gray-600 text-sm mt-1">الخطة المشهورة</p>
                  <p className="text-2xl font-bold text-blue-600 mt-3">$9.99</p>
                  <p className="text-sm text-gray-600">شهري</p>
                </div>

                {/* Professional Plan */}
                <div className={`rounded-lg p-4 border-2 ${subscription.tier === 'professional' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <h3 className="font-bold text-lg text-gray-900">احترافي</h3>
                  <p className="text-gray-600 text-sm mt-1">للمحترفين</p>
                  <p className="text-2xl font-bold text-purple-600 mt-3">$29.99</p>
                  <p className="text-sm text-gray-600">شهري</p>
                </div>

                {/* Enterprise Plan */}
                <div className={`rounded-lg p-4 border-2 ${subscription.tier === 'enterprise' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <h3 className="font-bold text-lg text-gray-900">مؤسسة</h3>
                  <p className="text-gray-600 text-sm mt-1">للمؤسسات</p>
                  <p className="text-2xl font-bold text-green-600 mt-3">$99.99</p>
                  <p className="text-sm text-gray-600">شهري</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!subscription && !loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 text-lg">لم يتم العثور على اشتراك</p>
          </div>
        )}
      </div>
    </div>
  );
}
