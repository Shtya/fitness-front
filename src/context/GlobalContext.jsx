'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import api from '@/utils/axios';

const GlobalContext = createContext();

export const GlobalProvider = ({ children }) => {
  const [usersByRole, setUsersByRole] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(null);

  const fetchUsers = async role => {
    if (!role) return;
    if (usersByRole[role]) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/auth/users?role=${role}&limit=1000`);
      const mapped = (res.data.users || []).map(u => ({
        id: u.id,
        label: u.name || u.email,
        email: u.email,
      }));
      setUsersByRole(prev => ({ ...prev, [role]: mapped }));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlobalContext.Provider
      value={{
        usersByRole, // { client: [...], coach: [...] }
        fetchUsers, // call this with a role
        loading,
        error,
        conversationId,
        setConversationId,
      }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useValues = () => {
  return useContext(GlobalContext);
};
