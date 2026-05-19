import { ReactNode, createContext, useContext, useMemo, useState } from 'react';
import { loginWithPassword } from '../api/auth';
import { setApiToken } from '../api/client';

type User = {
  email: string;
  token: string;
};

type AppContextValue = {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string, oneTimePassword?: string) => Promise<void>;
  logout: () => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const value = useMemo<AppContextValue>(
    () => ({
      isAuthenticated: Boolean(true),
      user,
      login: async (email: string, password: string, oneTimePassword?: string) => {
        const response = await loginWithPassword({
          email,
          password,
          oneTimePassword: oneTimePassword || undefined,
        });
        setApiToken(response.token);
        setUser({
          email: response.email,
          token: response.token,
        });
      },
      logout: () => {
        setApiToken(null);
        setUser(null);
      },
    }),
    [user]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }

  return context;
}
