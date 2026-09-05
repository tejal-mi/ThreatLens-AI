import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface SecuritySessionContextType {
  targetUrl: string;
  setTargetUrl: (url: string) => void;
  clearTargetUrl: () => void;
}

const SecuritySessionContext = createContext<SecuritySessionContextType | null>(null);

export interface SecuritySessionProviderProps {
  children: React.ReactNode;
}

export const SecuritySessionProvider: React.FC<SecuritySessionProviderProps> = ({ children }) => {
  const [targetUrl, setTargetUrlState] = useState<string>('');

  const setTargetUrl = useCallback((url: string) => {
    setTargetUrlState(url);
  }, []);

  const clearTargetUrl = useCallback(() => {
    setTargetUrlState('');
  }, []);

  const value = useMemo<SecuritySessionContextType>(
    () => ({
      targetUrl,
      setTargetUrl,
      clearTargetUrl,
    }),
    [targetUrl, setTargetUrl, clearTargetUrl]
  );

  return (
    <SecuritySessionContext.Provider value={value}>
      {children}
    </SecuritySessionContext.Provider>
  );
};

export const useSecuritySession = (): SecuritySessionContextType => {
  const context = useContext(SecuritySessionContext);
  if (!context) {
    return {
      targetUrl: '',
      setTargetUrl: () => {},
      clearTargetUrl: () => {},
    };
  }
  return context;
};
