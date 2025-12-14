 

// ============= WALLET APIs =============

import api from "@/utils/axios";

export const getWallet = async (adminId) => {
  const params = adminId ? { adminId } : {};
  return api.get('/billing/wallet', { params });
};

export const getAdminWallet = async (adminId) => {
  return api.get(`/billing/wallet/${adminId}`);
};

// ============= TRANSACTION APIs =============

export const createTransaction = async (data) => {
  return api.post('/billing/transactions', data);
};

export const getTransactions = async (filters = {}) => {
  return api.get('/billing/transactions', { params: filters });
};

export const getAllTransactions = async (filters = {}) => {
  return api.get('/billing/transactions/all', { params: filters });
};

export const getTransaction = async (id) => {
  return api.get(`/billing/transactions/${id}`);
};

export const createSubscription = async (data) => {
  return api.post('/billing/subscriptions', data);
};

 

// ============= WITHDRAWAL APIs =============

export const requestWithdrawal = async (data) => {
  return api.post('/billing/withdrawals/request', data);
};

export const getWithdrawals = async (filters = {}) => {
  return api.get('/billing/withdrawals', { params: filters });
};

export const getAllWithdrawals = async (filters = {}) => {
  return api.get('/billing/withdrawals/all', { params: filters });
};

export const approveWithdrawal = async (id) => {
  return api.patch(`/billing/withdrawals/${id}/approve`);
};

export const rejectWithdrawal = async (id, rejectionReason) => {
  return api.patch(`/billing/withdrawals/${id}/reject`, { rejectionReason });
};

export const completeWithdrawal = async (id) => {
  return api.patch(`/billing/withdrawals/${id}/complete`);
};

// ============= CLIENT PAYMENT APIs =============

export const recordClientPayment = async (data) => {
  return api.post('/billing/client-payments', data);
};

export const getClientPayments = async (filters = {}) => {
  return api.get('/billing/client-payments', { params: filters });
};

export const markPaymentAsPaid = async (id) => {
  return api.patch(`/billing/client-payments/${id}/mark-paid`);
};

// ============= ANALYTICS APIs =============

export const getAdminAnalytics = async (adminId) => {
  const params = adminId ? { adminId } : {};
  return api.get('/billing/analytics/admin', { params });
};

export const getAdminBillingOverview = async (adminId) => {
  const params = adminId ? { adminId } : {};
  return api.get('/billing/analytics/overview', { params });
};

export const getSystemAnalytics = async () => {
  return api.get('/billing/analytics/system');
};

export const getAllWallets = async (page = 1, limit = 10) => {
  return api.get('/billing/analytics/wallets', { params: { page, limit } });
};


// ============= SUBSCRIPTION APIs =============
export const getSubscription = async (adminId) => {
  const params = adminId ? { adminId } : {};
  return api.get('/billing/subscriptions', { params }); // ✅ FIX (was wrong)
};

export const renewSubscription = async (id) => {
  return api.post(`/billing/subscriptions/${id}/renew`); // ✅ FIX
};

// ============= CLIENT PAYMENT APIs =============
export const deleteClientPayment = async (id) => {
  return api.delete(`/billing/client-payments/${id}`); // ✅ NEW
};
