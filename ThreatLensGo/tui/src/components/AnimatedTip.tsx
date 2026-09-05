import React from 'react';
import { Box, Text } from 'ink';
import { useFrameIndex } from '../hooks/useSpinnerFrame.js';

const TIPS = [
  'Press 0 to launch the autonomous AI ThreatLens security agent',
  'Run /git to audit public repositories for leaked secrets & CVEs',
  'Run /target to configure the active endpoint for security assessments',
  'Run /ddos to simulate flood, slowloris, and burst-spike traffic loads',
  'Run /sqli to fuzz query strings & request bodies for SQL injection',
  'Run /xss to probe reflection points, storage sinks, and DOM sinks',
  'Run /exfil to inspect API responses and headers for sensitive data leakage',
  'Press Tab or 0-9 at any time for quick navigation',
];

function buildDotIndicator(current: number, total: number): string {
  const dots = Array.from({ length: total }, (_, i) =>
    i === current ? '●' : '○'
  );
  return dots.join(' ');
}

export const AnimatedTip: React.FC = () => {
  // Rotate tips every 5 seconds
  const tipIndex = useFrameIndex(TIPS.length, 5000);
  const currentTip = TIPS[tipIndex] ?? TIPS[0];

  return (
    <Box flexDirection="column" alignItems="center" marginY={1}>
      {/* Tip text row */}
      <Box flexDirection="row" alignItems="center" justifyContent="center">
        <Text color="yellow" bold>
          {'💡 '}
        </Text>
        <Text color="gray">
          {currentTip}
        </Text>
      </Box>
      {/* Dot progress indicator */}
      <Box marginTop={0} justifyContent="center">
        <Text color="#38BDF8" dimColor>
          {buildDotIndicator(tipIndex, TIPS.length)}
        </Text>
      </Box>
    </Box>
  );
};

export default AnimatedTip;
