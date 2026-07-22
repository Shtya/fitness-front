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

/**
 * Returns:
 * - `undefined` while hydrating (SSR + first client paint)
 * - `null` when no stored user
 * - user object after client mount
 *
 * Callers must not read `user.field` until `user` is defined.
 */
export const useUser = () => {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const update = () => setUser(readStoredUser());
    update();
    window.addEventListener('storage', update);
    window.addEventListener('sobha-user-updated', update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('sobha-user-updated', update);
    };
  }, []);

  return user;
};
