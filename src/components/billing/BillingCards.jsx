import React from 'react';
import { CreditCard, TrendingUp, Wallet } from 'lucide-react';

export const WalletCard = ({ balance = 0, totalEarned = 0, totalWithdrawn = 0, currency = 'USD' }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Main Balance */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold opacity-90">محفظتك</h3>
          <Wallet className="w-5 h-5" />
        </div>
        <div className="text-3xl font-bold">{balance.toFixed(2)}</div>
        <p className="text-sm opacity-75 mt-2">{currency}</p>
      </div>

      {/* Total Earned */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold opacity-90">إجمالي الأرباح</h3>
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="text-3xl font-bold">{totalEarned.toFixed(2)}</div>
        <p className="text-sm opacity-75 mt-2">{currency}</p>
      </div>

      {/* Total Withdrawn */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold opacity-90">إجمالي المسحوب</h3>
          <CreditCard className="w-5 h-5" />
        </div>
        <div className="text-3xl font-bold">{totalWithdrawn.toFixed(2)}</div>
        <p className="text-sm opacity-75 mt-2">{currency}</p>
      </div>
    </div>
  );
};

 
export const TransactionTable = ({ transactions = [], loading = false }) => {
  const typeLabels = {
    deposit: 'إيداع',
    withdrawal: 'سحب',
    client_payment: 'دفع عميل',
    subscription_charge: 'رسوم الاشتراك',
    refund: 'استرجاع',
    commission: 'عمولة',
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">جاري التحميل...</div>;
  }

  if (transactions.length === 0) {
    return <div className="text-center py-8 text-gray-500">لا توجد عمليات</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">النوع</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">المبلغ</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الحالة</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900">{typeLabels[tx.type] || tx.type}</td>
              <td className={`px-6 py-4 text-sm font-semibold ${tx.type.includes('deposit') ? 'text-green-600' : 'text-red-600'}`}>
                {tx.type.includes('deposit') || tx.type === 'client_payment' ? '+' : '-'} {Math.abs(tx.amount).toFixed(2)} $
              </td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[tx.status] || 'bg-gray-100'}`}>
                  {tx.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {new Date(tx.createdAt).toLocaleDateString('ar-EG')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const WithdrawalCard = ({ request, onApprove, onReject, loading = false }) => {
  const statusLabels = {
    requested: 'قيد الانتظار',
    approved: 'معتمد',
    processing: 'قيد المعالجة',
    completed: 'مكتمل',
    rejected: 'مرفوض',
  };

  const statusColors = {
    requested: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">طلب سحب</h3>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-2 ${statusColors[request.status]}`}>
            {statusLabels[request.status]}
          </span>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-orange-600">{request.amount.toFixed(2)} $</p>
          <p className="text-sm text-gray-600 mt-1">
            {new Date(request.createdAt).toLocaleDateString('ar-EG')}
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-gray-700">
          <span className="font-semibold">اسم صاحب الحساب:</span> {request.accountHolderName}
        </p>
        <p className="text-gray-700">
          <span className="font-semibold">البنك:</span> {request.bankName}
        </p>
        <p className="text-gray-700">
          <span className="font-semibold">رقم الحساب:</span> {request.bankAccountNumber}
        </p>
      </div>

      {request.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-sm text-red-800">
            <span className="font-semibold">سبب الرفض:</span> {request.rejectionReason}
          </p>
        </div>
      )}

      {request.status === 'requested' && onApprove && onReject && (
        <div className="flex gap-3">
          <button
            onClick={() => onApprove(request.id)}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded transition disabled:opacity-50"
          >
            {loading ? 'جاري...' : 'موافقة'}
          </button>
          <button
            onClick={() => onReject(request.id)}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded transition disabled:opacity-50"
          >
            {loading ? 'جاري...' : 'رفض'}
          </button>
        </div>
      )}
    </div>
  );
};
