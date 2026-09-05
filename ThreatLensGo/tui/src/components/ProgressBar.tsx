import React from 'react';
import { Box, Text } from 'ink';
import { useFrameIndex } from '../hooks/useSpinnerFrame.js';

export interface ProgressBarProps {
  percent: number; // 0 to 100
  width?: number;
  color?: string;
  emptyColor?: string;
  showShimmer?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  width = 30,
  color = 'cyan',
  emptyColor = 'gray',
  showShimmer = false,
}) => {
  const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)));
  const filledCount = Math.round((clampedPercent / 100) * width);
  const emptyCount = Math.max(0, width - filledCount);

  // Shimmer: a brighter position sweeps across filled region every 400ms
  const shimmerPos = useFrameIndex(Math.max(1, filledCount + 4), 120);
  const isDone = clampedPercent >= 100;

  // Build bar char-by-char for gradient edge + shimmer
  const buildFilledBar = (): JSX.Element[] => {
    if (filledCount === 0) return [];
    const cells: JSX.Element[] = [];

    for (let i = 0; i < filledCount; i++) {
      // Last cell gets a gradient boundary char
      const isLast = i === filledCount - 1;
      // Shimmer position highlight
      const isShimmer = showShimmer && !isDone && i === shimmerPos % filledCount;

      let char: string;
      if (isDone) {
        char = '█';
      } else if (isLast) {
        char = '▓';         // Soft edge at fill boundary
      } else if (isShimmer) {
        char = '█';         // Bright flash moving across bar
      } else {
        char = '█';
      }

      const cellColor = isShimmer ? '#FFFFFF' : (
        isDone
          ? 'green'
          : clampedPercent > 80
          ? '#34D399'      // Emerald transition near done
          : color
      );

      cells.push(
        <Text key={i} color={cellColor} bold={isShimmer}>
          {char}
        </Text>
      );
    }

    return cells;
  };

  const emptyBar = '░'.repeat(emptyCount);

  // Color ramp based on completion
  const percentColor = isDone ? 'green' : clampedPercent > 80 ? '#34D399' : clampedPercent > 50 ? 'cyan' : 'yellow';

  return (
    <Box flexDirection="row" alignItems="center">
      <Box marginRight={1} flexDirection="row">
        {buildFilledBar()}
        <Text color={emptyColor} dimColor>
          {emptyBar}
        </Text>
      </Box>
      <Text bold color={percentColor}>
        {clampedPercent}%
      </Text>
    </Box>
  );
};

export default ProgressBar;
