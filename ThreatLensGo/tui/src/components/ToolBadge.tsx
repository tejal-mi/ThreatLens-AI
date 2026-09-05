import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from './Spinner.js';

export interface ToolBadgeProps {
  toolName: string;
  args?: Record<string, any>;
  status: 'running' | 'completed' | 'error';
  result?: any;
}

const TOOL_META: Record<string, { icon: string; label: string; color: string }> = {
  search_code:        { icon: '⬡', label: 'Search Code',    color: '#38BDF8' },
  find_symbol:        { icon: '◈', label: 'Find Symbol',     color: '#A3E635' },
  read_file:          { icon: '◻', label: 'Read File',       color: '#60A5FA' },
  edit_file:          { icon: '◼', label: 'Edit File',       color: '#FBBF24' },
  run_sectest:        { icon: '⬡', label: 'Security Test',   color: '#F472B6' },
  verify_remediation: { icon: '◈', label: 'Verify Fix',      color: '#34D399' },
};

export const ToolBadge: React.FC<ToolBadgeProps> = ({
  toolName,
  args,
  status,
  result,
}) => {
  // NO animation hooks in this component — Spinner is an isolated leaf
  const meta = TOOL_META[toolName];
  const icon = meta?.icon ?? '⚡';
  const displayLabel = meta?.label ?? toolName;
  const accentColor = meta?.color ?? '#38BDF8';

  const getArgsSummary = () => {
    if (!args) return '';
    if (args.query) return `"${String(args.query).slice(0, 40)}"`;
    if (args.path) return String(args.path).slice(0, 40);
    if (args.suite) return `suite: ${args.suite}`;
    if (args.name) return `${args.name}()`;
    return JSON.stringify(args).slice(0, 35) + '…';
  };

  const borderColor = status === 'running' ? accentColor : status === 'error' ? 'red' : 'green';

  return (
    <Box
      flexDirection="column"
      marginY={0}
      paddingX={1}
      borderStyle="round"
      borderColor={borderColor}
    >
      <Box flexDirection="row" alignItems="center">
        {/* Status indicator — Spinner isolated so only it re-renders */}
        {status === 'running' ? (
          <Box marginRight={1}>
            <Spinner type="dots" intervalMs={80} color={accentColor} bold />
          </Box>
        ) : status === 'completed' ? (
          <Text color="green" bold>✓ </Text>
        ) : (
          <Text color="red" bold>✗ </Text>
        )}

        <Text color={accentColor} bold>{icon}{' '}</Text>
        <Text color="white" bold>{displayLabel}</Text>

        {args && getArgsSummary() ? (
          <Text color="gray" dimColor>{'  '}{getArgsSummary()}</Text>
        ) : null}
      </Box>

      {/* Sub-line: running hint or result preview — static text */}
      {status === 'running' ? (
        <Box marginTop={0} paddingLeft={2}>
          <Text color={accentColor} dimColor>executing…</Text>
        </Box>
      ) : result ? (
        <Box marginTop={0} paddingLeft={2}>
          <Text color="gray" dimColor>
            {'↳ '}{typeof result === 'object'
              ? JSON.stringify(result).slice(0, 65) + '…'
              : String(result).slice(0, 65)}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};

export default ToolBadge;
