import React from 'react';
import { Box, Text } from 'ink';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { useFrameIndex } from '../hooks/useSpinnerFrame.js';

// Ultra-clean, crystal-clear 6-line block art for "THREATLENSGO" (104 cols)
const LARGE_LOGO = [
  '████████╗██╗  ██╗██████╗ ███████╗ █████╗ ████████╗██╗     ███████╗███╗   ██╗███████╗  ██████╗  ██████╗ ',
  '╚══██╔══╝██║  ██║██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██║     ██╔════╝████╗  ██║██╔════╝ ██╔════╝ ██╔═══██╗',
  '   ██║   ███████║██████╔╝█████╗  ███████║   ██║   ██║     █████╗  ██╔██╗ ██║███████╗ ██║  ███╗██║   ██║',
  '   ██║   ██╔══██║██╔══██╗██╔══╝  ██╔══██║   ██║   ██║     ██╔══╝  ██║╚██╗██║╚════██║ ██║   ██║██║   ██║',
  '   ██║   ██║  ██║██║  ██║███████╗██║  ██║   ██║   ███████╗███████╗██║ ╚████║███████║ ╚██████╔╝╚██████╔╝',
  '   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝  ╚═════╝  ╚═════╝ ',
];

// Compact 3-line ANSI block art for "THREATLENSGO" (52 cols) for standard terminals
const COMPACT_LOGO = [
  '▀█▀ █ █ █▀▄ █▀▀ █▀█ ▀█▀ █   █▀▀ █▄ █ █▀▀  █▀▀ █▀█',
  ' █  █▀█ █▀▄ █▀▀ █▀█  █  █   █▀▀ █ ▀█ ▄██  █ █ █ █',
  ' ▀  ▀ ▀ ▀ ▀ ▀▀▀ ▀ ▀  ▀  ▀▀▀ ▀▀▀ ▀  ▀ ▀▀▀  ▀▀▀ ▀▀▀',
];

// Vibrant cyberpunk neon wave gradient palette — extended for smoother waves
const NEON_PALETTE = [
  '#38BDF8', // Electric Sky
  '#22D3EE', // Bright Cyan
  '#2DD4BF', // Mint Teal
  '#34D399', // Emerald
  '#A3E635', // Neon Lime
  '#FBBF24', // Amber Glow
  '#FB923C', // Warm Orange
  '#F472B6', // Rose Pink
  '#E879F9', // Electric Fuchsia
  '#C084FC', // Purple
  '#818CF8', // Indigo
  '#60A5FA', // Blue
];

// Subtitle cycling taglines
const TAGLINES = [
  'OFFENSIVE SECURITY & VULNERABILITY ASSESSMENT',
  'AUTONOMOUS CODEBASE INTELLIGENCE & PATCHING',
  'ADVANCED THREAT DETECTION & SIMULATION ENGINE',
  'POWERED BY CODESENA · AI-DRIVEN PENTESTING',
];

function splitIntoChunks(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

export const AnimatedLogo: React.FC<{ subtitle?: string }> = ({
  subtitle,
}) => {
  const { columns } = useTerminalSize();

  const isWide = columns >= 114;
  const logoLines = isWide ? LARGE_LOGO : COMPACT_LOGO;
  const chunkSize = isWide ? 8 : 4;

  // Wave sweep: offset advances every 120ms, creating a flowing neon gradient
  const waveOffset = useFrameIndex(NEON_PALETTE.length, 120);

  // Tagline rotation every 4 seconds (independent slower tick)
  const taglineIndex = useFrameIndex(TAGLINES.length, 4000);

  const displaySubtitle = subtitle ?? TAGLINES[taglineIndex] ?? TAGLINES[0];

  return (
    <Box flexDirection="column" alignItems="center" marginY={1}>
      <Box flexDirection="row" alignItems="flex-end">
        <Box flexDirection="column">
          {logoLines.map((line, lineIndex) => {
            const chunks = splitIntoChunks(line, chunkSize);

            return (
              <Box key={lineIndex} flexDirection="row">
                {chunks.map((chunk, chunkIndex) => {
                  // Offset each chunk by its position + current wave frame for the sweep effect
                  const colorIndex = (chunkIndex + waveOffset + lineIndex) % NEON_PALETTE.length;
                  const color = NEON_PALETTE[colorIndex] ?? '#38BDF8';

                  return (
                    <Text key={chunkIndex} color={color} bold>
                      {chunk}
                    </Text>
                  );
                })}
              </Box>
            );
          })}
        </Box>

        {/* Small by CodeSena with animated accent */}
        <Box paddingBottom={isWide ? 1 : 0} marginLeft={2}>
          <Text color="#38BDF8" bold>
            by CodeSena
          </Text>
        </Box>
      </Box>

      {/* Animated subtitle tagline */}
      <Box marginTop={1} flexDirection="row" alignItems="center">
        <Text color="#22D3EE" bold dimColor>
          {'◈ '}
        </Text>
        <Text dimColor color="gray" bold>
          {displaySubtitle}
        </Text>
        <Text color="#22D3EE" bold dimColor>
          {' ◈'}
        </Text>
      </Box>
    </Box>
  );
};

export default AnimatedLogo;
