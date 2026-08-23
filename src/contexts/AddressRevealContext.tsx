import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AddressRevealContextValue {
  revealAllTick: number;
  triggerRevealAll: () => void;
  isRevealingAll: boolean;
  registerLoading: (id: string, isLoading: boolean) => void;
}

const Context = createContext<AddressRevealContextValue | null>(null);

export function AddressRevealProvider({ children }: { children: ReactNode }) {
  const [revealAllTick, setRevealAllTick] = useState(0);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const triggerRevealAll = useCallback(() => {
    setRevealAllTick(t => t + 1);
  }, []);

  const registerLoading = useCallback((id: string, isLoading: boolean) => {
    setLoadingIds(prev => {
      const next = new Set(prev);
      if (isLoading) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  return (
    <Context.Provider value={{
      revealAllTick,
      triggerRevealAll,
      isRevealingAll: loadingIds.size > 0,
      registerLoading
    }}>
      {children}
    </Context.Provider>
  );
}

export function useAddressRevealContext() {
  return useContext(Context);
}
