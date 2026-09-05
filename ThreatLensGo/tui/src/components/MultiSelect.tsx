import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

export interface MultiSelectItem<V extends string = string> {
  label: string;
  value: V;
  key?: string;
}

export interface MultiSelectProps<V extends string = string> {
  items: MultiSelectItem<V>[];
  initialSelected?: V[];
  onSubmit: (selectedValues: V[]) => void;
  isFocused?: boolean;
  minSelected?: number;
}

export function MultiSelect<V extends string = string>({
  items,
  initialSelected = [],
  onSubmit,
  isFocused = true,
  minSelected = 1,
}: MultiSelectProps<V>): React.JSX.Element {
  const [selectedIndexSet, setSelectedIndexSet] = useState<Set<V>>(
    new Set(initialSelected)
  );
  const [cursorIndex, setCursorIndex] = useState(0);
  const [validationError, setValidationError] = useState('');

  const isInteractive = isFocused && Boolean(process.stdin?.isTTY);

  const toggleCurrent = useCallback(() => {
    const item = items[cursorIndex];
    if (!item) return;

    setSelectedIndexSet((prev) => {
      const next = new Set(prev);
      if (next.has(item.value)) {
        next.delete(item.value);
      } else {
        next.add(item.value);
      }
      return next;
    });
    setValidationError('');
  }, [items, cursorIndex]);

  const handleConfirm = useCallback(() => {
    const selectedArray = Array.from(selectedIndexSet);
    if (selectedArray.length < minSelected) {
      setValidationError(`Please select at least ${minSelected} option(s).`);
      return;
    }
    setValidationError('');
    onSubmit(selectedArray);
  }, [selectedIndexSet, minSelected, onSubmit]);

  useInput(
    (input, key) => {
      if (key.upArrow) {
        setCursorIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
      } else if (key.downArrow) {
        setCursorIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
      } else if (input === ' ') {
        toggleCurrent();
      } else if (key.return) {
        handleConfirm();
      }
    },
    { isActive: isInteractive }
  );

  return (
    <Box flexDirection="column" marginY={1}>
      {items.map((item, index) => {
        const isHovered = index === cursorIndex;
        const isChecked = selectedIndexSet.has(item.value);

        // Check if label contains description in parentheses e.g. "Title (Description)"
        const match = item.label.match(/^(.*?)\s*\((.*?)\)$/);
        let title = item.label;
        let desc: string | null = null;

        if (match && match[1] && match[2]) {
          title = match[1];
          desc = match[2];
        }

        return (
          <Box key={item.key ?? item.value} flexDirection="row" marginY={0}>
            <Box width={3}>
              <Text color={isHovered ? 'yellow' : 'gray'} bold={isHovered}>
                {isHovered ? '❯' : ' '}
              </Text>
            </Box>
            <Box width={4}>
              <Text color={isChecked ? 'green' : 'gray'} bold={isChecked}>
                [{isChecked ? '✔' : ' '}]
              </Text>
            </Box>
            <Box flexDirection="row" flexWrap="wrap">
              <Text color={isHovered ? 'yellow' : 'white'} bold={isHovered}>
                {title}
              </Text>
              {desc ? (
                <Text dimColor color="gray">
                  {' '}─ {desc}
                </Text>
              ) : null}
            </Box>
          </Box>
        );
      })}

      {validationError ? (
        <Box marginTop={1} paddingLeft={3}>
          <Text color="red" bold>✗ {validationError}</Text>
        </Box>
      ) : null}
    </Box>
  );
}

export default MultiSelect;
