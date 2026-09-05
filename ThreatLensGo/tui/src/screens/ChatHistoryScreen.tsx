import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useNavigation } from '../state/navigation.js';
import { TerminalLayout } from '../components/TerminalLayout.js';
import { Spinner } from '../components/Spinner.js';
import { backendClient } from '../api/backendClient.js';
import { formatBackendError } from '../api/errorHandler.js';
import type { Chat } from '../api/types.js';

export const ChatHistoryScreen: React.FC = () => {
  const { pop, push } = useNavigation();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [actionNotice, setActionNotice] = useState<string>('');

  const isInteractive = Boolean(process.stdin?.isTTY);

  const fetchChats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await backendClient.listChats();
      const list = Array.isArray(data) ? data : (data as any)?.data || [];
      setChats(list);
      setSelectedIndex(0);
    } catch (err: any) {
      setError(formatBackendError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        setActionNotice(`Deleting session #${id}...`);
        await backendClient.deleteChat(id);
        setChats((prev) => prev.filter((c) => c.id !== id));
        setSelectedIndex((prev) => Math.max(0, prev - 1));
        setActionNotice(`Deleted session #${id}`);
        setTimeout(() => setActionNotice(''), 3000);
      } catch (err: any) {
        setActionNotice(`Failed to delete session: ${formatBackendError(err)}`);
      }
    },
    []
  );

  useInput(
    (input, key) => {
      if (key.escape) {
        pop();
        return;
      }

      if (chats.length === 0) return;

      if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => Math.min(chats.length - 1, prev + 1));
      } else if (key.return) {
        const selected = chats[selectedIndex];
        if (selected) {
          push({ type: 'agentChat', chatId: selected.id });
        }
      } else if (input === 'd' || input === 'D') {
        const selected = chats[selectedIndex];
        if (selected) {
          handleDelete(selected.id);
        }
      } else if (input === 'r' || input === 'R') {
        fetchChats();
      }
    },
    { isActive: isInteractive }
  );

  return (
    <TerminalLayout
      title="Saved Agent Chat Sessions"
      subtitle="Restore or manage previous threat intelligence analysis conversations"
      breadcrumb="MAIN > CHAT HISTORY"
      accentColor="cyan"
      statusText={isLoading ? 'LOADING SESSIONS' : `${chats.length} SAVED SESSIONS`}
      statusType={isLoading ? 'ready' : 'ready'}
      keyHints={
        chats.length > 0
          ? '↑↓ navigate · enter open session · d delete · r refresh · esc back'
          : 'esc return to menu'
      }
    >
      <Box flexDirection="column" marginY={1} paddingLeft={1}>
        {isLoading ? (
          <Box flexDirection="row" alignItems="center" marginY={1}>
            <Box marginRight={1}>
              <Spinner type="dots" color="cyan" />
            </Box>
            <Text color="gray">Querying chat session registry...</Text>
          </Box>
        ) : error ? (
          <Box flexDirection="column" marginY={1}>
            <Text color="red" bold>
              ✗ {error}
            </Text>
            <Box marginTop={1}>
              <Text color="gray">Press <Text bold color="white">[r]</Text> to retry or <Text bold color="white">[Esc]</Text> to return.</Text>
            </Box>
          </Box>
        ) : chats.length === 0 ? (
          <Box flexDirection="column" marginY={1}>
            <Text color="yellow">No saved chat sessions found.</Text>
            <Box marginTop={1}>
              <Text color="gray">Start a conversation from the ThreatLens Agent menu to begin recording history.</Text>
            </Box>
          </Box>
        ) : (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color="gray" dimColor>
                Use arrow keys to highlight a conversation. Press <Text bold color="white">[Enter]</Text> to resume, or <Text bold color="red">[d]</Text> to delete:
              </Text>
            </Box>

            {chats.map((chat, idx) => {
              const isHighlighted = idx === selectedIndex;
              const dateStr = chat.created_at
                ? new Date(chat.created_at).toLocaleString()
                : 'Recent';

              return (
                <Box
                  key={chat.id}
                  flexDirection="row"
                  alignItems="center"
                  marginY={0}
                  paddingX={1}
                >
                  <Box width={3}>
                    <Text color={isHighlighted ? 'cyan' : 'gray'} bold>
                      {isHighlighted ? '›' : ' '}
                    </Text>
                  </Box>

                  <Box width={10}>
                    <Text color={isHighlighted ? 'yellow' : 'gray'} bold>
                      #{chat.id}
                    </Text>
                  </Box>

                  <Box flexGrow={1}>
                    <Text
                      color={isHighlighted ? 'white' : 'gray'}
                      bold={isHighlighted}
                      wrap="truncate"
                    >
                      {chat.title || 'Untitled Session'}
                    </Text>
                  </Box>

                  <Box width={24} justifyContent="flex-end">
                    <Text color="gray" dimColor>
                      {dateStr}
                    </Text>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {actionNotice ? (
          <Box marginTop={1}>
            <Text color="yellow" bold>
              ℹ {actionNotice}
            </Text>
          </Box>
        ) : null}
      </Box>
    </TerminalLayout>
  );
};

export default ChatHistoryScreen;
