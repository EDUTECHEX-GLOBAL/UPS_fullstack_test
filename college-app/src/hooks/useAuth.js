// src/hooks/useAuth.js

const useAuth = () => {
  // ✅ Always reads fresh token from localStorage
  const getToken = () => localStorage.getItem("token");

  // ✅ Always reads fresh user data from localStorage
  const getUserData = () => {
    const data = localStorage.getItem("userData");
    return data ? JSON.parse(data) : null;
  };

  // ✅ Clear all old user data (call on logout or new login)
  const clearAuth = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
    localStorage.removeItem("studentType");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("profileCompleted");
    localStorage.removeItem("userProfile");
    localStorage.removeItem("testingActiveSections");
  };

  // ✅ Check if user is logged in
  const isAuthenticated = () => !!localStorage.getItem("token");

  return { getToken, getUserData, clearAuth, isAuthenticated };
};

export default useAuth;