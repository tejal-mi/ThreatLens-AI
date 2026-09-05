import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { ProgressBar } from './ProgressBar.js';
import { Spinner } from './Spinner.js';

export interface SimulationRunnerProps {
  moduleName: string;
  target: string;
  params: Record<string, unknown>;
  onDone: () => void;
}

interface Stage {
  label: string;
  completed: boolean;
}

const STAGE_LABELS = [
  'Resolving target endpoint telemetry & handshake',
  'Generating security assessment test vectors',
  'Dispatching payload matrix & inspecting responses',
  'Evaluating latency differentials & error boundaries',
  'Finalizing vulnerability intelligence telemetry',
];

const TOTAL_TICKS = 50;          // number of interval ticks to reach 100%
const TICK_INTERVAL_MS = 180;    // interval between ticks
const TOTAL_DURATION_MS = TOTAL_TICKS * TICK_INTERVAL_MS; // ~9 seconds

export const SimulationRunner: React.FC<SimulationRunnerProps> = ({
  moduleName,
  target,
  params,
  onDone,
}) => {
  const [progress, setProgress] = useState(0);
  const [stages, setStages] = useState<Stage[]>(
    STAGE_LABELS.map((label) => ({ label, completed: false }))
  );
  const [isDone, setIsDone] = useState(false);
  const [etaSeconds, setEtaSeconds] = useState(Math.ceil(TOTAL_DURATION_MS / 1000));

  // Anti-jitter: single ref-based interval, no multiple timers
  const tickRef = useRef(0);
  // NO spinnerFrame hook here — Spinner component is isolated

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      const currentTick = tickRef.current;
      const newPercent = Math.min(100, Math.round((currentTick / TOTAL_TICKS) * 100));
      const remaining = Math.max(0, Math.ceil(((TOTAL_TICKS - currentTick) * TICK_INTERVAL_MS) / 1000));

      if (currentTick >= TOTAL_TICKS) {
        clearInterval(interval);
        setProgress(100);
        setStages((prev) => prev.map((s) => ({ ...s, completed: true })));
        setEtaSeconds(0);
        setIsDone(true);
      } else {
        const stageIndex = Math.min(
          STAGE_LABELS.length - 1,
          Math.floor((newPercent / 100) * STAGE_LABELS.length)
        );

        setProgress(newPercent);
        setEtaSeconds(remaining);
        setStages((prev) =>
          prev.map((s, i) => ({
            ...s,
            completed: i < stageIndex,
          }))
        );
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  useInput((_input, key) => {
    if (isDone && (key.return || key.escape)) {
      onDone();
    }
  });

  const activeStageIndex = Math.min(
    STAGE_LABELS.length - 1,
    Math.floor((progress / 100) * STAGE_LABELS.length)
  );

  return (
    <Box flexDirection="column" marginY={1}>
      {/* Simulation Header — Spinner is isolated leaf */}
      <Box flexDirection="row" alignItems="center" marginBottom={1}>
        {!isDone ? (
          <Box marginRight={1}>
            <Spinner type="dots" intervalMs={80} color="#38BDF8" bold />
          </Box>
        ) : (
          <Text color="green" bold>
            ✓{' '}
          </Text>
        )}
        <Text bold color={isDone ? 'green' : '#38BDF8'}>
          {isDone ? `${moduleName.toUpperCase()} COMPLETE` : `EXECUTING ${moduleName.toUpperCase()}`}
        </Text>
        {!isDone && (
          <Text color="gray" dimColor>
            {'  '}~{etaSeconds}s remaining
          </Text>
        )}
      </Box>

      {/* Target and Progress Bar */}
      <Box flexDirection="column" marginBottom={1} paddingLeft={2}>
        <Box flexDirection="row" alignItems="center">
          <Text color="gray" dimColor>Target: </Text>
          <Text color="cyan" bold>{target || 'N/A'}</Text>
        </Box>
        <Box marginY={1}>
          <ProgressBar
            percent={progress}
            width={40}
            color="cyan"
            showShimmer={!isDone}
          />
        </Box>
      </Box>

      {/* Stage Log Panel */}
      <Box
        flexDirection="column"
        marginY={0}
        borderStyle="round"
        borderColor={isDone ? 'green' : '#818CF8'}
        paddingX={2}
        paddingY={1}
      >
        <Box marginBottom={1}>
          <Text bold color={isDone ? 'green' : '#818CF8'}>
            {isDone ? '✓ Assessment Stages' : `⬡ Live Stages`}
          </Text>
        </Box>
        {stages.map((stage, i) => {
          const isActive = !isDone && i === activeStageIndex;
          const isCompleted = stage.completed || isDone;

          return (
            <Box key={i} flexDirection="row" alignItems="center" marginTop={0}>
              {isCompleted ? (
                <Text color="green" bold>✔ </Text>
              ) : isActive ? (
                <Box marginRight={1}><Spinner type="dots" intervalMs={80} color="#38BDF8" bold /></Box>
              ) : (
                <Text color="gray" dimColor>○ </Text>
              )}
              <Text
                color={isCompleted ? 'gray' : isActive ? 'white' : 'gray'}
                bold={isActive}
                dimColor={!isActive && !isCompleted}
              >
                {stage.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Done action prompt */}
      {isDone ? (
        <Box marginTop={1} paddingLeft={2} flexDirection="row" alignItems="center">
          <Text bold color="green">✓ </Text>
          <Text color="gray">Payload telemetry captured successfully · </Text>
          <Text bold color="cyan">[Enter/Esc] Return</Text>
        </Box>
      ) : null}
    </Box>
  );
};

export default SimulationRunner;
