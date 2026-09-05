import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';
import { backendClient } from '../api/backendClient.js';
import type { UsageData, LimitData } from '../api/types.js';

export interface PersistedSession {
  token: string;
  provider: string;
  savedAt: string;
}

export function getBackendLocalJwt(): string | null {
  try {
    const candidates = [
      path.resolve(process.cwd(), '../cli-backend/local.db'),
      path.resolve(process.cwd(), '../../cli-backend/local.db'),
      path.resolve(process.cwd(), 'cli-backend/local.db'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const db = new Database(p, { readonly: true });
        const row = db.prepare('SELECT jwt_token FROM auth LIMIT 1').get() as { jwt_token?: string } | undefined;
        db.close();
        if (row?.jwt_token) {
          return row.jwt_token;
        }
      }
    }
  } catch {
    // Ignore error
  }
  return null;
}

export function getSessionFilePath(): string {
  return path.join(os.homedir(), '.threatlensgo', 'session.json');
}

export function saveSession(session: { token: string; provider?: string }): void {
  try {
    const dir = path.join(os.homedir(), '.threatlensgo');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data: PersistedSession = {
      token: session.token,
      provider: session.provider || 'credentials',
      savedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(dir, 'session.json'), JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Fail gracefully if cannot write to filesystem
  }
}

export function loadSession(): PersistedSession | null {
  try {
    const filePath = getSessionFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content) as PersistedSession;
      if (parsed && typeof parsed.token === 'string' && parsed.token.trim()) {
        return parsed;
      }
    }
  } catch {
    clearSession();
  }

  try {
    const localToken = getBackendLocalJwt();
    if (localToken) {
      const localSession: PersistedSession = {
        token: localToken,
        provider: 'cli-backend',
        savedAt: new Date().toISOString(),
      };
      saveSession(localSession);
      return localSession;
    }
  } catch {
    // Ignore fallback failure
  }

  return null;
}

export function clearSession(): void {
  try {
    const filePath = getSessionFilePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Fail gracefully
  }
}

// Pre-seed backendClient with boot token if available
try {
  const initialBootSession = loadSession();
  if (initialBootSession?.token) {
    backendClient.setAuthToken(initialBootSession.token);
  }
} catch {
  // Ignore pre-seed failure
}

export interface BackendStateContextType {
  isOnline: boolean;
  isAuthenticated: boolean;
  authToken: string | null;
  usage: UsageData | null;
  limits: LimitData | null;
  checkPulse: () => Promise<boolean>;
  setAuth: (token: string, provider?: string) => void;
  clearAuth: () => void;
  setAuthToken: (token: string | null) => void;
  refreshUsage: () => Promise<void>;
  refreshLimits: () => Promise<void>;
}

const BackendContext = createContext<BackendStateContextType | null>(null);

export interface BackendProviderProps {
  children: React.ReactNode;
}

export const BackendProvider: React.FC<BackendProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [authToken, setAuthTokenState] = useState<string | null>(() => {
    const persisted = loadSession();
    if (persisted?.token) {
      backendClient.setAuthToken(persisted.token);
      return persisted.token;
    }
    return backendClient.getAuthToken();
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const persisted = loadSession();
    return Boolean(persisted?.token);
  });
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [limits, setLimits] = useState<LimitData | null>(null);

  const setAuth = useCallback((token: string, provider: string = 'credentials') => {
    saveSession({ token, provider });
    backendClient.setAuthToken(token);
    setAuthTokenState(token);
    setIsAuthenticated(true);
  }, []);

  const clearAuth = useCallback(() => {
    clearSession();
    backendClient.setAuthToken('');
    setAuthTokenState(null);
    setIsAuthenticated(false);
  }, []);

  const setAuthToken = useCallback((token: string | null) => {
    if (token) {
      backendClient.setAuthToken(token);
      setAuthTokenState(token);
      setIsAuthenticated(true);
    } else {
      clearAuth();
    }
  }, [clearAuth]);

  const checkPulse = useCallback(async (): Promise<boolean> => {
    try {
      const res = await backendClient.pulse();
      const online = res.connect === true || res.status === 'Live';
      setIsOnline(online);
      return online;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  const refreshUsage = useCallback(async () => {
    try {
      const data = await backendClient.getUsage();
      setUsage(data);
    } catch {
      // Backend may be offline or unauthenticated
    }
  }, []);

  const refreshLimits = useCallback(async () => {
    try {
      const data = await backendClient.getLimit();
      setLimits(data);
    } catch {
      // Backend may be offline or unauthenticated
    }
  }, []);

  useEffect(() => {
    backendClient.setOnUnauthorized(() => {
      clearAuth();
    });
  }, [clearAuth]);

  useEffect(() => {
    let isMounted = true;

    const performPulse = async () => {
      try {
        const res = await backendClient.pulse();
        if (isMounted) {
          setIsOnline(res.connect === true || res.status === 'Live');
        }
      } catch {
        if (isMounted) {
          setIsOnline(false);
        }
      }
    };

    performPulse();

    // Periodic health check every 30 seconds via /pulse
    const interval = setInterval(performPulse, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const value = useMemo<BackendStateContextType>(
    () => ({
      isOnline,
      isAuthenticated,
      authToken,
      usage,
      limits,
      checkPulse,
      setAuth,
      clearAuth,
      setAuthToken,
      refreshUsage,
      refreshLimits,
    }),
    [isOnline, isAuthenticated, authToken, usage, limits, checkPulse, setAuth, clearAuth, setAuthToken, refreshUsage, refreshLimits]
  );

  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
};

export const useBackend = (): BackendStateContextType => {
  const context = useContext(BackendContext);
  if (!context) {
    return {
      isOnline: true,
      isAuthenticated: false,
      authToken: null,
      usage: null,
      limits: null,
      checkPulse: async () => false,
      setAuth: () => {},
      clearAuth: () => {},
      setAuthToken: () => {},
      refreshUsage: async () => {},
      refreshLimits: async () => {},
    };
  }
  return context;
};
