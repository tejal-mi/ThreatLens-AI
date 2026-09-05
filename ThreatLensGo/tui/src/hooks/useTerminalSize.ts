import { useState, useEffect } from 'react';
import { useStdout } from 'ink';

export interface TerminalSize {
  columns: number;
  rows: number;
}

export const useTerminalSize = (): TerminalSize => {
  const { stdout } = useStdout();

  const getDimensions = (): TerminalSize => ({
    columns: stdout?.columns ?? process.stdout.columns ?? 80,
    rows: stdout?.rows ?? process.stdout.rows ?? 24,
  });

  const [size, setSize] = useState<TerminalSize>(getDimensions);

  useEffect(() => {
    const handleResize = () => {
      const next = getDimensions();
      setSize((prev) => {
        if (prev.columns === next.columns && prev.rows === next.rows) {
          return prev;
        }
        return next;
      });
    };

    stdout?.on('resize', handleResize);
    process.stdout.on('resize', handleResize);

    return () => {
      stdout?.off('resize', handleResize);
      process.stdout.off('resize', handleResize);
    };
  }, [stdout]);

  return size;
};
