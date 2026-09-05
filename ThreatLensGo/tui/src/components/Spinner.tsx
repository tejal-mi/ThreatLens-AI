import React from 'react';
import { Text } from 'ink';
import { useSpinnerFrame, SpinnerType } from '../hooks/useSpinnerFrame.js';

export interface SpinnerProps {
  type?: SpinnerType;
  intervalMs?: number;
  color?: string;
  bold?: boolean;
}

/**
 * Isolated spinner leaf component.
 * ONLY this tiny component re-renders on every tick — NOT the parent.
 * This is the key anti-jitter pattern: never call useSpinnerFrame in a large parent.
 */
export const Spinner: React.FC<SpinnerProps> = ({
  type = 'dots',
  intervalMs = 140,
  color = 'cyan',
  bold = true,
}) => {
  const frame = useSpinnerFrame(type, intervalMs);
  return (
    <Text color={color} bold={bold}>
      {frame}
    </Text>
  );
};

export default Spinner;
