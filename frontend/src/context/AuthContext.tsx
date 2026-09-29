import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { User } from '../types';

interface Ctx { user: User | null; loading: boolean; logout: () => Promise<void>; }
const AuthCtx = createContext<Ctx>({ user: null, loading: true, logout: async () => {} });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['me'], queryFn: () => api.me().catch(() => null), retry: false, staleTime: 60_000 });
  const logout = async () => { await api.logout().catch(() => {}); qc.setQueryData(['me'], null); };
  return <AuthCtx.Provider value={{ user: q.data ?? null, loading: q.isLoading, logout }}>{children}</AuthCtx.Provider>;
}
