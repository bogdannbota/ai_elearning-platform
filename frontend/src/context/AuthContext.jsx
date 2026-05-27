import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = sessionStorage.getItem("token");
      const savedUser = sessionStorage.getItem("user");

      if (savedToken) setToken(savedToken);

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (err) {
      console.error("Auth restore error:", err);
      sessionStorage.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (tokenData, userData) => {
    setToken(tokenData);
    setUser(userData);

    sessionStorage.setItem("token", tokenData);
    sessionStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    sessionStorage.clear();
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        loading,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}