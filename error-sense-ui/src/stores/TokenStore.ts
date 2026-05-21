import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiFetch } from '../api/client';
import { LoginDTO } from '../api/contract';

interface TokenState {
    username: string;
    passKey: string;
    isAuthenticated: boolean;
    token: string | null;
}

interface TokenActions {
    login: (username: string, passKey: string) => Promise<void>;
    logout: () => void;
}

type TokenStore = TokenState & TokenActions;

export const useTokenStore = create<TokenStore>()(
    persist(
        (set) => ({
            username: '',
            passKey: '',
            isAuthenticated: false,
            token: null,

            login: async (username: string, passKey: string) => {
                const response = await apiFetch<LoginDTO>('/api/v1/errsense/login', { params: { username, passKey } });
                set({ username, passKey, isAuthenticated: response.auth, token: response.token });
            },

            logout: () => {
                set({
                    username: '',
                    passKey: '',
                    isAuthenticated: false,
                    token: null,
                });
            },
        }),
        {
            name: 'error-sense-token-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);