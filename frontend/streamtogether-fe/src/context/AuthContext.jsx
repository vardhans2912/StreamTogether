import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { authApi } from "../api";
import { getStoredToken, getStoredUser, storeAuth, clearAuth } from "../api/config";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());

  const applySession = useCallback((nextToken, nextUser) => {
    storeAuth(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async ({ usernameOrEmail, password }) => {
      const { token: nextToken, user: nextUser } = await authApi.login({
        usernameOrEmail,
        password,
      });
      applySession(nextToken, nextUser);
      return nextUser;
    },
    [applySession],
  );

  const register = useCallback(
    async ({ email, username, password }) => {
      const { token: nextToken, user: nextUser } = await authApi.register({
        email,
        username,
        password,
      });
      applySession(nextToken, nextUser);
      return nextUser;
    },
    [applySession],
  );

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  /** Merge partial updates into the persisted user (e.g. after profile edit). */
  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      storeAuth(null, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      updateUser,
    }),
    [token, user, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export default AuthContext;
