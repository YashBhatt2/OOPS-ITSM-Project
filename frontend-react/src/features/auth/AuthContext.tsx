import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserAccount, apiRequest, loginApi, logoutApi, registerApi } from '@/lib/api';

interface AuthContextType {
  user: UserAccount | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<UserAccount>;
  register: (name: string, email: string, pass: string) => Promise<UserAccount>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const me = await apiRequest<UserAccount>('/api/v1/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const account = await loginApi(email, pass);
    setUser(account);
    return account;
  };

  const register = async (name: string, email: string, pass: string) => {
    const account = await registerApi({ displayName: name, email, password: pass });
    return account;
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

