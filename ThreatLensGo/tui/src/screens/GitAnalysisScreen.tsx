import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useNavigation } from '../state/navigation.js';
import { TerminalLayout } from '../components/TerminalLayout.js';
import { Spinner } from '../components/Spinner.js';
import { backendClient } from '../api/backendClient.js';
import { formatBackendError } from '../api/errorHandler.js';

const GIT_URL_REGEX = /^(https?:\/\/[^\s]+|git@[^\s:]+:[^\s]+)$/i;

export const GitAnalysisScreen: React.FC = () => {
  const { pop } = useNavigation();
  const [repoUrl, setRepoUrl] = useState('');
  const [inputError, setInputError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ status: string; count: number | null } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const isInteractive = Boolean(process.stdin?.isTTY);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('unmount');
      }
    };
  }, []);

  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      setInputError('Repository URL cannot be empty.');
      return;
    }

    if (!GIT_URL_REGEX.test(trimmed)) {
      setInputError('Invalid Git URL. Example: https://github.com/org/repo or git@github.com:org/repo.git');
      return;
    }

    setInputError('');
    setApiError(null);
    setResult(null);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 90-second timeout guard per specification
    const timer = setTimeout(() => {
      controller.abort('timeout');
    }, 90000);
    timeoutTimerRef.current = timer;

    try {
      const data = await backendClient.buildRepo(trimmed, controller.signal);
      if (isMountedRef.current) {
        setResult(data);
        setIsLoading(false);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setIsLoading(false);

      if (controller.signal.aborted) {
        const reason = (controller.signal as any).reason;
        if (reason === 'timeout') {
          setApiError(
            'Analysis is taking longer than expected — it may still be running on the backend. Try again shortly or check backend logs.'
          );
        } else {
          setApiError('Analysis cancelled by user.');
        }
      } else {
        setApiError(formatBackendError(err));
      }
    } finally {
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }
    }
  }, []);

  useInput(
    (_input, key) => {
      if (key.escape) {
        if (isLoading) {
          // Abort current analysis and return to form with cancelled message
          if (abortControllerRef.current) {
            abortControllerRef.current.abort('user_cancelled');
          }
        } else if (result || apiError) {
          // Reset view to form
          setResult(null);
          setApiError(null);
        } else {
          pop();
        }
      } else if (key.return && (result || apiError)) {
        // Reset view to form
        setResult(null);
        setApiError(null);
      }
    },
    { isActive: isInteractive }
  );

  return (
    <TerminalLayout
      title="Git Repository Analysis"
      subtitle="Deep-scan source code repositories for secrets, keys, and CVEs"
      breadcrumb="GIT SCAN"
      accentColor="yellow"
      statusText={
        isLoading
          ? 'ANALYZING REPO'
          : result
          ? 'AUDIT COMPLETE'
          : apiError
          ? 'ANALYSIS FAILED'
          : inputError
          ? 'INPUT ERROR'
          : 'AWAITING REPOSITORY URL'
      }
      statusType={
        isLoading ? 'warning' : result ? 'success' : apiError || inputError ? 'error' : 'ready'
      }
      keyHints={
        isLoading
          ? 'esc cancel analysis'
          : result || apiError
          ? 'enter / esc return to input'
          : 'enter submit · esc back to main menu'
      }
    >
      {isLoading ? (
        <Box flexDirection="column" marginY={2} paddingLeft={1}>
          <Box flexDirection="row" alignItems="center">
            <Box marginRight={1}>
              <Spinner type="dots" color="yellow" />
            </Box>
            <Text bold color="yellow">
              Analyzing repository… <Text color="gray">(Esc to cancel)</Text>
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Target: {repoUrl}
            </Text>
          </Box>
        </Box>
      ) : result ? (
        <Box flexDirection="column" marginY={1} paddingLeft={1}>
          <Box flexDirection="row" alignItems="center" marginBottom={1}>
            <Text color="green" bold>✓ </Text>
            <Text bold color="green">
              {result.count !== null && result.count !== undefined
                ? `Stored ${result.count} new commits`
                : result.status || 'Already up to date'}
            </Text>
          </Box>
          <Box flexDirection="column" paddingLeft={2}>
            <Text color="gray">
              • Target Repository: <Text color="cyan">{repoUrl}</Text>
            </Text>
            <Text color="gray">
              • Audit Status: <Text color="white" bold>{result.status}</Text>
            </Text>
            {result.count !== null && result.count !== undefined ? (
              <Text color="gray">
                • Commits Indexed: <Text color="yellow" bold>{result.count}</Text>
              </Text>
            ) : null}
          </Box>
          <Box marginTop={2}>
            <Text color="gray" dimColor>
              Press <Text bold color="white">[Enter]</Text> or <Text bold color="white">[Esc]</Text> to analyze another repository.
            </Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column" marginY={1}>
          <Box flexDirection="row" marginY={1}>
            <Box width={28}>
              <Text bold color="yellow">
                › Public Git URL:
              </Text>
            </Box>
            <Box flexGrow={1}>
              <TextInput
                value={repoUrl}
                onChange={(val) => {
                  setRepoUrl(val);
                  if (inputError) setInputError('');
                  if (apiError) setApiError(null);
                }}
                onSubmit={handleSubmit}
                focus={isInteractive}
                placeholder="https://github.com/dev47929/ThreatLens"
              />
            </Box>
          </Box>

          {inputError ? (
            <Box marginTop={1} paddingLeft={2}>
              <Text color="red" bold>
                ✗ {inputError}
              </Text>
            </Box>
          ) : null}

          {apiError ? (
            <Box marginTop={1} paddingLeft={2}>
              <Text color="red" bold>
                ✗ {apiError}
              </Text>
            </Box>
          ) : null}
        </Box>
      )}
    </TerminalLayout>
  );
};

export default GitAnalysisScreen;
