import React from 'react';
import { Box, Text } from 'ink';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { useSecuritySession } from '../state/securitySession.js';
import { useBackend } from '../state/backendState.js';
import { StatusDot, StatusType } from './StatusDot.js';

export interface TerminalLayoutProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  step?: number;
  totalSteps?: number;
  statusText?: string;
  statusType?: StatusType;
  keyHints?: string;
  accentColor?: string;
  children: React.ReactNode;
}

// Step fill bar using block chars
function buildStepBar(step: number, total: number): string {
  const bars = Array.from({ length: total }, (_, i) =>
    i < step ? '▰' : '▱'
  );
  return bars.join(' ');
}

export const TerminalLayout: React.FC<TerminalLayoutProps> = ({
  title,
  subtitle,
  breadcrumb = 'THREATLENSGO',
  step,
  totalSteps,
  statusText = 'READY',
  statusType = 'ready',
  keyHints = '↑↓ navigate · enter select · esc back',
  accentColor = 'cyan',
  children,
}) => {
  const { columns } = useTerminalSize();
  const { targetUrl } = useSecuritySession();
  const { isOnline } = useBackend();

  // NO animation hooks here — StatusDot handles its own re-renders in isolation
  const width = Math.max(60, columns > 2 ? columns - 2 : 78);
  const dividerLength = Math.max(10, width - 4);

  return (
    <Box
      flexDirection="column"
      width={width}
      paddingX={1}
      marginY={1}
    >
      {/* Top Minimalist Header — fully static, no animation */}
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Box flexDirection="row" alignItems="center">
          <Text bold color="yellow">threatlensgo</Text>
          <Text color="cyan"> by CodeSena</Text>
          <Text color="#818CF8"> › </Text>
          <Text color="white" bold>{'['}</Text>
          <Text color={accentColor} bold>{breadcrumb.toLowerCase()}</Text>
          <Text color="white" bold>{']'}</Text>
          {!isOnline && (
            <Text color="red" bold> ⚠ Backend Offline</Text>
          )}
        </Box>
        <Box flexDirection="row">
          {targetUrl ? (
            <Text color="gray">{'⬡ '}<Text color="cyan" bold>{targetUrl}</Text></Text>
          ) : (
            <Text dimColor color="gray">standalone mode</Text>
          )}
        </Box>
      </Box>

      {/* Card Box with Content */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={accentColor}
        paddingX={2}
        paddingY={1}
      >
        {/* Step Counter & Title — static */}
        <Box flexDirection="column" marginBottom={1}>
          {step && totalSteps ? (
            <Box flexDirection="row" marginBottom={0} alignItems="center">
              <Text color="yellow" bold>● STEP {step}/{totalSteps}{'  '}</Text>
              <Text color="#818CF8" bold>{buildStepBar(step, totalSteps)}</Text>
            </Box>
          ) : null}

          <Text bold color={accentColor}>{title}</Text>
          {subtitle ? (
            <Text color="gray" dimColor>{subtitle}</Text>
          ) : null}
        </Box>

        {/* Divider — static */}
        <Box marginBottom={1}>
          <Text color={accentColor} dimColor>
            {'╌'.repeat(Math.max(1, dividerLength - 4))}
          </Text>
        </Box>

        {/* Child Content */}
        <Box flexDirection="column">
          {children}
        </Box>

        {/* Card Footer — StatusDot is isolated; only IT re-renders on animation ticks */}
        <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
          <Box flexDirection="row" alignItems="center">
            <StatusDot statusType={statusType} statusText={statusText} />
          </Box>
          <Box flexDirection="row">
            <Text dimColor color="gray">{keyHints}</Text>
          </Box>
        </Box>
      </Box>

      {/* Bottom Statusline — static */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
        <Text dimColor color="gray">ThreatLensGo:main</Text>
        <Text dimColor color="gray">v0.1.0</Text>
      </Box>
    </Box>
  );
};

export default TerminalLayout;
