import React from 'react';
import { Text } from 'ink';
import { useSpinnerFrame } from '../hooks/useSpinnerFrame.js';

/**
 * Isolated stream cursor — blinks ▌ when agent is streaming text.
 * Only this component re-renders on its 500ms tick — NOT the AgentChatScreen parent.
 */
export const StreamCursor: React.FC = () => {
  const frame = useSpinnerFrame('pulse', 500);
  const visible = frame === '◆' || frame === '◈';
  return (
    <Text color="#38BDF8" bold>
      {visible ? '▌' : ' '}
    </Text>
  );
};

export default StreamCursor;
