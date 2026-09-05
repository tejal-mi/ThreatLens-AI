import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { ProgressBar } from './ProgressBar.js';
import { Spinner } from './Spinner.js';
import { backendClient } from '../api/backendClient.js';
import type { AttackType, AttackStatus } from '../api/types.js';

export interface AttackRunnerProps {
  attackType: AttackType;
  config: any;
  onDone: (result: AttackStatus) => void;
  onError?: (error: string) => void;
}

export const AttackRunner: React.FC<AttackRunnerProps> = ({
  attackType,
  config,
  onDone,
  onError,
}) => {
  const [attackId, setAttackId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('starting');
  const [attackData, setAttackData] = useState<AttackStatus | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 🔧 PATCH — idempotency guard required for React 18 Strict Mode and double effects
  const hasStartedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const attackIdRef = useRef<string | null>(null);
  const isTerminatedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Stop attack helper
  const handleStop = useCallback(async () => {
    if (isTerminatedRef.current) return;
    isTerminatedRef.current = true;
    setStatus('stopped');
    setIsDone(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (attackIdRef.current) {
      try {
        await backendClient.stopAttack(attackType, attackIdRef.current);
      } catch {
        // Ignore stop failures if already halted
      }
    }

    const finalStatus: AttackStatus = attackData ? { ...attackData, status: 'stopped' } : {
      attack_id: attackIdRef.current || 'unknown',
      status: 'stopped',
    };
    onDone(finalStatus);
  }, [attackType, attackData, onDone]);

  useEffect(() => {
    isMountedRef.current = true;

    // Idempotency check: guard against React 18 Strict Mode double invoke
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function executeAttack() {
      try {
        const startRes = await backendClient.startAttack(attackType, config, {
          signal: controller.signal,
        });

        if (!isMountedRef.current || controller.signal.aborted) {
          if (startRes.attack_id) {
            backendClient.stopAttack(attackType, startRes.attack_id).catch(() => {});
          }
          return;
        }

        const id = startRes.attack_id;
        attackIdRef.current = id;
        setAttackId(id);
        setStatus(startRes.status || 'started');

        // Connect real-time SSE stream
        const stream = backendClient.streamAttack(attackType, id, {
          signal: controller.signal,
        });

        for await (const chunk of stream) {
          if (!isMountedRef.current || controller.signal.aborted) break;

          setAttackData(chunk);
          if (chunk.status) {
            setStatus(chunk.status);
          }

          // Calculate progress percentage
          if (chunk.progress?.planned_requests && chunk.progress.attempted_requests !== undefined) {
            const pct = Math.min(
              100,
              Math.max(0, Math.round((chunk.progress.attempted_requests / chunk.progress.planned_requests) * 100))
            );
            setProgress(pct);
          }

          // Terminal state detection
          const stateStr = (chunk.status || '').toLowerCase();
          if (stateStr === 'completed' || stateStr === 'failed' || stateStr === 'stopped') {
            isTerminatedRef.current = true;
            setIsDone(true);
            onDone(chunk);
            break;
          }
        }
      } catch (err: any) {
        if (controller.signal.aborted) return;
        const msg = err?.message || String(err);
        setErrorMessage(msg);
        setStatus('failed');
        setIsDone(true);
        if (onError) {
          onError(msg);
        }
      }
    }

    executeAttack();

    return () => {
      isMountedRef.current = false;
      controller.abort();
      if (attackIdRef.current && !isTerminatedRef.current) {
        backendClient.stopAttack(attackType, attackIdRef.current).catch(() => {});
      }
    };
  }, [attackType, config, onDone, onError]);

  // Keyboard navigation & interruption (guarded by isTTY for headless/test stability)
  const isInteractive = Boolean(process.stdin?.isTTY);
  useInput(
    (input, key) => {
      if ((input === 's' || key.escape) && !isDone) {
        handleStop();
      }
    },
    { isActive: isInteractive }
  );

  // Extract metrics
  const perf = attackData?.performance;
  const requests = attackData?.requests;
  const statusCodes = attackData?.status_codes || {};
  const statusCodeEntries = Object.entries(statusCodes);

  const targetUrl =
    config?.target?.base_url && config?.target?.endpoint
      ? `${config.target.base_url}${config.target.endpoint}`
      : config?.target?.base_url || config?.target || 'target';

  const isTerminal = status === 'completed' || status === 'stopped' || status === 'failed';

  return (
    <Box flexDirection="column" marginY={1}>
      {/* Header Bar */}
      <Box flexDirection="row" alignItems="center" marginBottom={1}>
        {!isTerminal ? (
          <Box marginRight={1}>
            <Spinner type="dots" intervalMs={80} color="#38BDF8" bold />
          </Box>
        ) : status === 'completed' ? (
          <Text color="green" bold>✓ </Text>
        ) : status === 'stopped' ? (
          <Text color="yellow" bold>⏹ </Text>
        ) : (
          <Text color="red" bold>✗ </Text>
        )}

        <Text
          bold
          color={
            status === 'completed'
              ? 'green'
              : status === 'stopped'
              ? 'yellow'
              : status === 'failed'
              ? 'red'
              : '#38BDF8'
          }
        >
          {`${attackType.toUpperCase()} ATTACK: ${status.toUpperCase()}`}
        </Text>

        {attackId ? (
          <Text color="gray" dimColor>
            {' '}[ID: {attackId.slice(0, 8)}]
          </Text>
        ) : null}

        {attackData?.elapsed_seconds !== undefined ? (
          <Text color="gray" dimColor>
            {' '}{attackData.elapsed_seconds.toFixed(1)}s elapsed
          </Text>
        ) : null}
      </Box>

      {/* Target and Progress Bar */}
      <Box flexDirection="column" marginBottom={1} paddingLeft={2}>
        <Box flexDirection="row" alignItems="center">
          <Text color="gray" dimColor>Target: </Text>
          <Text color="cyan" bold>{String(targetUrl)}</Text>
        </Box>
        <Box marginY={1}>
          <ProgressBar
            percent={progress}
            width={40}
            color={status === 'failed' ? 'red' : status === 'stopped' ? 'yellow' : 'cyan'}
            showShimmer={!isTerminal}
          />
        </Box>
      </Box>

      {/* Live Performance & Telemetry Panel */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={
          status === 'completed'
            ? 'green'
            : status === 'stopped'
            ? 'yellow'
            : status === 'failed'
            ? 'red'
            : '#818CF8'
        }
        paddingX={2}
        paddingY={1}
      >
        <Box marginBottom={1}>
          <Text bold color="#818CF8">
            ⬡ Real-Time Telemetry & Metrics
          </Text>
        </Box>

        {/* Requests summary */}
        <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <Box marginRight={2}>
            <Text color="gray">Attempted: </Text>
            <Text bold color="white">
              {attackData?.progress?.attempted_requests ?? 0}
            </Text>
          </Box>
          <Box marginRight={2}>
            <Text color="gray">Success: </Text>
            <Text bold color="green">
              {requests?.successful ?? 0}
            </Text>
          </Box>
          <Box marginRight={2}>
            <Text color="gray">Failed: </Text>
            <Text bold color="red">
              {requests?.failed ?? 0}
            </Text>
          </Box>
          <Box marginRight={2}>
            <Text color="gray">Active: </Text>
            <Text bold color="yellow">
              {attackData?.progress?.active_requests ?? 0}
            </Text>
          </Box>
        </Box>

        {/* Throughput & Latency */}
        {perf ? (
          <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
            <Box marginRight={2}>
              <Text color="gray">Rate: </Text>
              <Text bold color="cyan">
                {(perf.requests_per_second || 0).toFixed(1)} req/s
              </Text>
            </Box>
            <Box marginRight={2}>
              <Text color="gray">Avg Latency: </Text>
              <Text bold color="white">
                {(perf.average_latency_ms || 0).toFixed(1)} ms
              </Text>
            </Box>
            <Box marginRight={2}>
              <Text color="gray">p95: </Text>
              <Text bold color="white">
                {(perf.p95_latency_ms || 0).toFixed(1)} ms
              </Text>
            </Box>
          </Box>
        ) : null}

        {/* Status Codes Distribution */}
        {statusCodeEntries.length > 0 ? (
          <Box flexDirection="row" alignItems="center" marginTop={0}>
            <Text color="gray">Status Codes: </Text>
            {statusCodeEntries.map(([code, count]) => {
              const codeNum = parseInt(code, 10);
              const color = codeNum >= 500 ? 'red' : codeNum >= 400 ? 'yellow' : 'green';
              return (
                <Box key={code} marginRight={1}>
                  <Text color={color} bold>
                    {code}: {count}
                  </Text>
                </Box>
              );
            })}
          </Box>
        ) : null}

        {/* Error message if any */}
        {errorMessage || attackData?.error_message ? (
          <Box marginTop={1}>
            <Text color="red" bold>
              ✗ {errorMessage || attackData?.error_message}
            </Text>
          </Box>
        ) : null}
      </Box>

      {/* Control Hints */}
      {!isTerminal ? (
        <Box marginTop={1} paddingLeft={2}>
          <Text dimColor color="gray">
            Press <Text bold color="yellow">[s]</Text> or <Text bold color="yellow">[Esc]</Text> to halt attack
          </Text>
        </Box>
      ) : (
        <Box marginTop={1} paddingLeft={2}>
          <Text color="gray">
            Attack finished with status: <Text bold color="white">{status}</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default AttackRunner;
