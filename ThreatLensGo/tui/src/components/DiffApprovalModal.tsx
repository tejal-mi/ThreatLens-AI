import React from 'react';
import { Box, Text, useInput } from 'ink';
import { DiffApprovalPayload } from '../agent/types.js';

export interface DiffApprovalModalProps {
  payload: DiffApprovalPayload;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  onCancel: () => void;
  isActive?: boolean;
}

export const DiffApprovalModal: React.FC<DiffApprovalModalProps> = ({
  payload,
  onApprove,
  onReject,
  onCancel,
  isActive = true,
}) => {
  useInput(
    (input, key) => {
      if (!isActive) return;

      const lower = input.toLowerCase();
      if (lower === 'a' || key.return) {
        onApprove(payload.id);
      } else if (lower === 'r') {
        onReject(payload.id, 'Rejected by user');
      } else if (lower === 'c' || key.escape) {
        onCancel();
      }
    },
    { isActive }
  );

  const renderDiffLines = () => {
    const lines = payload.patch.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('+++') || line.startsWith('---')) {
        return (
          <Text key={idx} bold color="white">
            {line}
          </Text>
        );
      }
      if (line.startsWith('@@')) {
        return (
          <Text key={idx} color="cyan">
            {line}
          </Text>
        );
      }
      if (line.startsWith('+')) {
        return (
          <Text key={idx} color="green">
            {line}
          </Text>
        );
      }
      if (line.startsWith('-')) {
        return (
          <Text key={idx} color="red">
            {line}
          </Text>
        );
      }
      return (
        <Text key={idx} color="gray">
          {line}
        </Text>
      );
    });
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={1}
      paddingY={1}
      marginY={1}
    >
      <Box flexDirection="row" alignItems="center" marginBottom={1}>
        <Text bold color="yellow">
          ⚠️ CODE MODIFICATION APPROVAL REQUIRED
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color="gray">
          File: <Text bold color="white">{payload.file}</Text>
        </Text>
        <Text color="gray">
          Summary: <Text color="cyan">{payload.description}</Text>
        </Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        marginY={1}
      >
        {renderDiffLines()}
      </Box>

      <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
        <Text bold color="green">
          [A] / Enter Approve & Apply
        </Text>
        <Text bold color="red">
          [R] Reject
        </Text>
        <Text color="gray">
          [C] / Esc Cancel
        </Text>
      </Box>
    </Box>
  );
};
