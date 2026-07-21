'use client';

import { useEffect, useState } from 'react';

function readStoredUser() {
  try {
    const user = window.localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export const useUser = () => {
  // Keep the server render and the first browser render identical.
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const update = () => setUser(readStoredUser());
    update();
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);

  return user;
};
