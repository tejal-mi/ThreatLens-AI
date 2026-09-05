import React from 'react';
import { Box, useInput } from 'ink';
import { useNavigation } from '../../state/navigation.js';
import { useSecuritySession } from '../../state/securitySession.js';
import { TargetUrlScreen } from './TargetUrlScreen.js';
import { TerminalLayout } from '../../components/TerminalLayout.js';
import { Select } from '../../components/Select.js';

type SecurityOptionValue = 'ddos' | 'sqli' | 'xss' | 'exfil' | 'rateLimit' | 'proxy';

interface SecurityMenuItem {
  label: string;
  value: SecurityOptionValue;
}

const securityOptions: SecurityMenuItem[] = [
  {
    label: '1. DDoS Testing (Flood, Slowloris, and Burst-spike stress load simulations)',
    value: 'ddos',
  },
  {
    label: '2. SQL Injection (Error-based, Union-based, and Blind Boolean/Time probes)',
    value: 'sqli',
  },
  {
    label: '3. Cross-Site Scripting (XSS) (Reflected, Stored, and DOM script sink analysis)',
    value: 'xss',
  },
  {
    label: '4. Data Exfiltration (API response & error message sensitive leak detection)',
    value: 'exfil',
  },
  {
    label: '5. Rate Limiting (Concurrency threshold & 429 response enforcement)',
    value: 'rateLimit',
  },
  {
    label: '6. Proxy Interception & Live Request Tampering',
    value: 'proxy',
  },
];

export const SecurityMenu: React.FC = () => {
  const { push, pop } = useNavigation();
  const { targetUrl, clearTargetUrl } = useSecuritySession();

  const isInteractive = Boolean(process.stdin?.isTTY);

  if (!targetUrl) {
    return <TargetUrlScreen />;
  }

  const handleSelect = (item: SecurityMenuItem) => {
    switch (item.value) {
      case 'ddos':
        push({ type: 'ddos' });
        break;
      case 'sqli':
        push({ type: 'sqli' });
        break;
      case 'xss':
        push({ type: 'xss' });
        break;
      case 'exfil':
        push({ type: 'exfil' });
        break;
      case 'rateLimit':
        push({ type: 'rateLimit' });
        break;
      case 'proxy':
        push({ type: 'proxy' });
        break;
    }
  };

  useInput(
    (_input, key) => {
      if (key.escape) {
        clearTargetUrl();
        pop();
      }
    },
    { isActive: isInteractive }
  );

  return (
    <TerminalLayout
      title="Security Testing Suite"
      subtitle="Select an offensive security assessment module to configure and execute"
      breadcrumb="SECURITY"
      accentColor="yellow"
      statusText="SESSION ACTIVE"
      statusType="ready"
      keyHints="↑↓ navigate · enter select · esc back to main menu"
    >
      <Box marginY={1} flexDirection="column">
        <Select
          items={securityOptions}
          onSelect={handleSelect}
          isFocused={isInteractive}
        />
      </Box>
    </TerminalLayout>
  );
};

export const SecurityMenuScreen = SecurityMenu;
export default SecurityMenu;
