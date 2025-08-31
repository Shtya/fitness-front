// Global function to get user info from localStorage
export const getUserInfo = () => {
  if (typeof window === 'undefined') return null;

  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data from localStorage:', error);
    return null;
  }
};
