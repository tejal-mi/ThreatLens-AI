import React, { useState, useEffect, useCallback, useRef } from 'react';
import { exec } from 'child_process';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useNavigation } from '../state/navigation.js';
import { useBackend, getBackendLocalJwt } from '../state/backendState.js';
import { backendClient } from '../api/backendClient.js';
import { TerminalLayout } from '../components/TerminalLayout.js';
import { Select } from '../components/Select.js';
import { didWeStartTheBackend, restartBackendForFreshAuth } from '../launcher.js';
import { formatBackendError } from '../api/errorHandler.js';

type AuthMethod = 'github' | 'google' | 'credentials';

interface MethodOption {
  label: string;
  value: AuthMethod;
}

const AUTH_METHODS: MethodOption[] = [
  {
    label: '1. Continue with GitHub OAuth (Fast device-code authentication)',
    value: 'github',
  },
  {
    label: '2. Continue with Google OAuth (Browser SSO login)',
    value: 'google',
  },
  {
    label: '3. Operator Credentials (Sign in with Username & Password)',
    value: 'credentials',
  },
];

function openBrowser(url: string) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"`
    : process.platform === 'darwin' ? `open "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd);
}

export const LoginScreen: React.FC = () => {
  const { push } = useNavigation();
  const { setAuth } = useBackend();
  const [method, setMethod] = useState<AuthMethod | null>(null);

  // Credentials state
  const [activeField, setActiveField] = useState<'username' | 'password'>('username');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // OAuth Flow state (repurposed from device flow)
  const [oauthCode, setOauthCode] = useState('Waiting for browser authorization…');
  const [oauthStatus, setOauthStatus] = useState<'waiting' | 'success'>('waiting');
  const [oauthUser, setOauthUser] = useState('dev-operator');

  // Timers and abort controller
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isInteractive = Boolean(process.stdin?.isTTY);

  const cancelOAuth = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelOAuth();
    };
  }, [cancelOAuth]);

  // Handle OAuth selection & real polling authorization flow
  const handleSelectMethod = (item: MethodOption) => {
    setError('');
    setMethod(item.value);

    if (item.value === 'github' || item.value === 'google') {
      cancelOAuth();
      setOauthCode('Waiting for browser authorization…');
      setOauthStatus('waiting');
      setOauthUser(item.value === 'github' ? 'github_operator' : 'google_operator');

      const loginUrl = backendClient.getOAuthLoginUrl(item.value);
      openBrowser(loginUrl);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const provider = item.value;

      // 120-second hard timeout
      timeoutTimerRef.current = setTimeout(() => {
        cancelOAuth();
        setError('OAuth timed out — try again or use credentials.');
      }, 120000);

      let consecutiveMeFailuresAfterDbToken = 0;

      // Polling loop every 2 seconds
      const poll = async () => {
        if (controller.signal.aborted) return;

        try {
          const res = await backendClient.getMe();
          if (res && !res.error && !res.detail) {
            cancelOAuth();
            const token = (res as any).token || (res as any).access_token || getBackendLocalJwt() || `${provider}-session`;
            const user = (res as any).username || (res as any).identifier || (res as any).email || (provider === 'github' ? 'github_operator' : 'google_operator');
            setOauthUser(user);
            setOauthStatus('success');
            setAuth(token, provider);
            setTimeout(() => {
              push({ type: 'mainMenu' });
            }, 800);
            return;
          }
        } catch {
          // Check for Bearer None backend bug workaround
          const dbToken = getBackendLocalJwt();
          if (dbToken) {
            consecutiveMeFailuresAfterDbToken++;
            if (consecutiveMeFailuresAfterDbToken >= 3) {
              if (didWeStartTheBackend()) {
                setOauthCode('Restarting backend for fresh authentication…');
                try {
                  await restartBackendForFreshAuth();
                  consecutiveMeFailuresAfterDbToken = 0;
                  return;
                } catch {
                  // Fall through to manual-restart message
                }
              }

              cancelOAuth();
              setAuth(dbToken, provider);
              setError(
                'Login succeeded, but the backend process needs to be restarted to recognize it (known issue). Please restart cli-backend manually and relaunch the TUI.'
              );
              return;
            }
          }
        }
      };

      pollTimerRef.current = setInterval(poll, 2000);
    }
  };

  // Handle Credentials Login
  const handleCredentialsLogin = useCallback(async () => {
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser && !trimmedPass) {
      setError('Username and password cannot be empty.');
      setActiveField('username');
      return;
    }

    if (!trimmedUser) {
      setError('Username is required.');
      setActiveField('username');
      return;
    }

    if (!trimmedPass) {
      setError('Password is required.');
      setActiveField('password');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await backendClient.passwordLogin(trimmedUser, trimmedPass);
      const token = (res as any).token || (res as any).access_token || 'operator-session';
      setAuth(token, 'credentials');
      push({ type: 'mainMenu' });
    } catch (err: any) {
      setError(formatBackendError(err));
    } finally {
      setIsLoading(false);
    }
  }, [username, password, push, setAuth]);

  useInput(
    (input, key) => {
      if (isLoading) {
        return;
      }
      if (key.escape) {
        if (method !== null) {
          cancelOAuth();
          setMethod(null);
          setError('');
          setOauthStatus('waiting');
        } else {
          // Direct bypass to main menu
          push({ type: 'mainMenu' });
        }
      } else if (method === null) {
        if (input === '1') {
          handleSelectMethod(AUTH_METHODS[0]);
        } else if (input === '2') {
          handleSelectMethod(AUTH_METHODS[1]);
        } else if (input === '3') {
          handleSelectMethod(AUTH_METHODS[2]);
        } else if (input === '0' || input === 'q' || key.return) {
          push({ type: 'mainMenu' });
        }
      } else if (key.tab && method === 'credentials') {
        setActiveField((prev) => (prev === 'username' ? 'password' : 'username'));
        setError('');
      } else if (key.return && (method === 'github' || method === 'google')) {
        if (oauthStatus === 'success') {
          push({ type: 'mainMenu' });
        }
      }
    },
    { isActive: true }
  );

  return (
    <TerminalLayout
      title="ThreatLensGo Authentication"
      subtitle="Sign in via OAuth provider or operator credentials to access test suites"
      breadcrumb="AUTHENTICATION"
      accentColor="yellow"
      statusText={
        isLoading
          ? 'AUTHENTICATING...'
          : oauthStatus === 'success'
          ? 'OAUTH VERIFIED'
          : error
          ? 'AUTH FAILED'
          : method === 'github' || method === 'google'
          ? 'AWAITING OAUTH AUTHORIZATION'
          : 'SELECT AUTH METHOD'
      }
      statusType={isLoading ? 'warning' : oauthStatus === 'success' ? 'success' : error ? 'error' : 'ready'}
      keyHints={
        method === null
          ? '↑↓ navigate · enter select'
          : method === 'credentials'
          ? 'tab switch field · enter submit · esc back'
          : (method === 'github' || method === 'google') && oauthStatus === 'success'
          ? 'enter proceed to main menu'
          : 'esc back to methods'
      }
    >
      {/* 1. Method Selection */}
      {method === null && (
        <Box flexDirection="column" marginY={1}>
          <Text bold color="white">
            Choose Authentication Provider:
          </Text>
          <Box marginTop={1}>
            <Select
              items={AUTH_METHODS}
              onSelect={handleSelectMethod}
              isFocused={isInteractive}
            />
          </Box>
        </Box>
      )}

      {/* 2. OAuth Flow (GitHub / Google) */}
      {(method === 'github' || method === 'google') && (
        <Box flexDirection="column" marginY={1}>
          <Box flexDirection="row" alignItems="center" marginBottom={1}>
            <Text bold color={method === 'github' ? 'cyan' : 'yellow'}>
              {method === 'github' ? '◆ GitHub OAuth' : '◆ Google OAuth'} Browser Authorization
            </Text>
          </Box>

          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor="gray"
            paddingX={2}
            paddingY={1}
            marginBottom={1}
          >
            <Text color="gray">
              1. Browser URL:{' '}
              <Text bold color="cyan">
                {backendClient.getOAuthLoginUrl(method)}
              </Text>
            </Text>

            <Box flexDirection="row" alignItems="center" marginY={1}>
              <Text color="gray">2. Status: </Text>
              <Box borderStyle="round" borderColor="yellow" paddingX={1}>
                <Text bold color="yellow">
                  {oauthCode}
                </Text>
              </Box>
            </Box>

            <Box flexDirection="row" alignItems="center" marginTop={1}>
              {oauthStatus === 'waiting' && !error ? (
                <>
                  <Box marginRight={1}>
                    <Text color="yellow">
                      <Spinner type="dots" />
                    </Text>
                  </Box>
                  <Text color="gray">
                    Waiting for browser authorization…
                  </Text>
                </>
              ) : oauthStatus === 'success' ? (
                <>
                  <Text color="green" bold>
                    ✔ Successfully authorized as @{oauthUser}!
                  </Text>
                </>
              ) : null}
            </Box>
          </Box>

          {error ? (
            <Box marginTop={1} paddingLeft={2}>
              <Text color="red" bold>
                ✗ {error}
              </Text>
            </Box>
          ) : null}

          {oauthStatus === 'success' ? (
            <Box marginTop={1}>
              <Text bold color="cyan">
                › Press [Enter] to continue to Main Menu
              </Text>
            </Box>
          ) : (
            <Text dimColor color="gray">
              Press [Esc] to cancel and switch auth method
            </Text>
          )}
        </Box>
      )}

      {/* 3. Username & Password Credentials */}
      {method === 'credentials' && (
        <Box flexDirection="column" marginY={1}>
          <Box flexDirection="row" marginY={1}>
            <Box width={14}>
              <Text bold color={activeField === 'username' ? 'yellow' : 'gray'}>
                {activeField === 'username' ? '› ' : '  '}Username:
              </Text>
            </Box>
            <TextInput
              value={username}
              onChange={(val) => {
                setUsername(val);
                if (error) setError('');
              }}
              onSubmit={() => {
                setActiveField('password');
              }}
              focus={isInteractive && activeField === 'username'}
              placeholder="admin"
            />
          </Box>

          <Box flexDirection="row" marginY={1}>
            <Box width={14}>
              <Text bold color={activeField === 'password' ? 'yellow' : 'gray'}>
                {activeField === 'password' ? '› ' : '  '}Password:
              </Text>
            </Box>
            <TextInput
              value={password}
              onChange={(val) => {
                setPassword(val);
                if (error) setError('');
              }}
              onSubmit={handleCredentialsLogin}
              focus={isInteractive && activeField === 'password'}
              mask="*"
              placeholder="••••••••"
            />
          </Box>

          {isLoading ? (
            <Box marginTop={1} paddingLeft={2}>
              <Text color="yellow">
                <Spinner type="dots" /> Authenticating operator credentials...
              </Text>
            </Box>
          ) : null}

          {error ? (
            <Box marginTop={1} paddingLeft={2}>
              <Text color="red" bold>
                ✗ {error}
              </Text>
            </Box>
          ) : null}
        </Box>
      )}
    </TerminalLayout>
  );
};

export default LoginScreen;
