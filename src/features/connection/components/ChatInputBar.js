import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { useTheme } from '@/shared/components/ThemeProvider';
import { logger } from '@/shared/services/logger';
import PaperPlaneIcon from '@/components/common/PaperPlaneIcon';
import { useAgents } from '@/features/connection/hooks/useAgents';
import AgentSelectorModal from '@/components/common/AgentSelectorModal';
import { getAgentColor } from '@/shared/utils/agentColorUtils';
import { CommandDrawer } from '@/features/commands/components';
import { useCommands } from '@/features/commands/hooks';

const ChatInputBar = ({
  inputUrl,
  onUrlChange,
  onConnect,
  onSendMessage,
  onSendCommand,
  isConnecting,
  isConnected,
  isServerReachable,
  baseUrl,
  selectedProject,
  onServerPress,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [messageText, setMessageText] = useState('');
  const [inputHeight, setInputHeight] = useState(44);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef(null);
  const { agents, loading, selectedAgent, selectedIndex, setSelectedAgent, cycleAgent } = useAgents(
    baseUrl,
    selectedProject,
  );

  const [showCommandDrawer, setShowCommandDrawer] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const { commands, loading: commandsLoading } = useCommands(baseUrl, selectedProject);

  const filteredCommands = useMemo(() => {
    if (!commandFilter) return commands;
    return commands.filter(cmd => cmd.name.toLowerCase().startsWith(commandFilter.toLowerCase()));
  }, [commands, commandFilter]);

  const autocompleteCommand = filteredCommands[0];

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handler = e => {
        if (e.shiftKey && e.key === 'Tab' && inputFocused && !showCommandDrawer) {
          e.preventDefault();
          cycleAgent();
        }

        if (
          e.key === 'Tab' &&
          !e.shiftKey &&
          showCommandDrawer &&
          autocompleteCommand &&
          inputFocused
        ) {
          e.preventDefault();
          handleCommandSelect(autocompleteCommand);
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [cycleAgent, inputFocused, showCommandDrawer, autocompleteCommand]);

  const handleTextChange = text => {
    setMessageText(text);

    if (text.startsWith('/')) {
      setShowCommandDrawer(true);
      setCommandFilter(text.slice(1));
    } else {
      setShowCommandDrawer(false);
      setCommandFilter('');
    }
  };

  const handleCommandSelect = command => {
    setMessageText(`/${command.name} `);
    setShowCommandDrawer(false);
    setCommandFilter('');
  };

  const handleSendMessage = async () => {
    if (messageText.trim()) {
      try {
        const trimmedMessage = messageText.trim();
        const isCommand = trimmedMessage.startsWith('/');

        if (isCommand && onSendCommand) {
          await onSendCommand(trimmedMessage);
        } else {
          await onSendMessage(trimmedMessage, selectedAgent || { name: 'build' });
        }

        setMessageText('');
        setShowCommandDrawer(false);
        setCommandFilter('');
      } catch (error) {
        const chatLogger = logger.tag('ChatInput');
        chatLogger.error('Failed to send message', error);
        Alert.alert('Send Failed', 'Unable to send message. Please try again.');
      }
    }
  };

  const handleKeyPress = e => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleContentSizeChange = event => {
    const { height: contentHeight } = event.nativeEvent.contentSize;
    const singleLineHeight = 20 + 24;
    const maxDynamicHeight = 4 * 20 + 24;
    setInputHeight(Math.min(Math.max(contentHeight, singleLineHeight), maxDynamicHeight));
  };

  return (
    <View style={styles.container}>
      {isConnected && showCommandDrawer && (
        <CommandDrawer
          commands={filteredCommands}
          loading={commandsLoading}
          onSelect={handleCommandSelect}
          visible={showCommandDrawer}
        />
      )}

      <View style={styles.inputContainer}>
        {isConnected ? (
          <>
            <TouchableOpacity
              style={[
                styles.modeButton,
                {
                  borderColor: selectedAgent
                    ? getAgentColor(selectedAgent, selectedIndex, theme.isDark ? 'dark' : 'light')
                    : theme.colors.border,
                },
              ]}
              onPress={cycleAgent}
              onLongPress={() => setModalVisible(true)}
            >
              <Text style={styles.modeButtonText}>
                {loading
                  ? 'LOADING...'
                  : selectedAgent
                    ? selectedAgent.name.length > 10
                      ? selectedAgent.name.substring(0, 10) + '...'
                      : selectedAgent.name.toUpperCase()
                    : 'LOADING...'}
              </Text>
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={[styles.messageInput, { height: inputHeight }]}
              value={messageText}
              onChangeText={handleTextChange}
              placeholder="Type your message..."
              placeholderTextColor={theme.colors.textMuted}
              multiline={true}
              numberOfLines={1}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyPress={handleKeyPress}
              onContentSizeChange={handleContentSizeChange}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !messageText.trim()
                  ? styles.sendButtonDisabled
                  : {
                      borderColor: getAgentColor(
                        selectedAgent,
                        selectedIndex,
                        theme.isDark ? 'dark' : 'light',
                      ),
                    },
              ]}
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <PaperPlaneIcon
                color={
                  !messageText.trim()
                    ? theme.colors.textMuted
                    : getAgentColor(selectedAgent, selectedIndex, theme.isDark ? 'dark' : 'light')
                }
                size={20}
              />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.modeButton,
                {
                  borderColor: selectedAgent
                    ? getAgentColor(selectedAgent, selectedIndex, theme.isDark ? 'dark' : 'light')
                    : theme.colors.border,
                },
              ]}
              onPress={cycleAgent}
              onLongPress={() => setModalVisible(true)}
            >
              <Text style={styles.modeButtonText}>
                {loading
                  ? 'LOADING...'
                  : selectedAgent
                    ? selectedAgent.name.length > 10
                      ? selectedAgent.name.substring(0, 10) + '...'
                      : selectedAgent.name.toUpperCase()
                    : 'LOADING...'}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={styles.urlInput}
              value={inputUrl}
              onChangeText={onUrlChange}
              placeholder="Enter base URL (https:// added automatically, e.g., 10.1.1.122:63425)"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onSubmitEditing={onConnect}
            />
            <TouchableOpacity
              style={styles.serverButton}
              onPress={onServerPress}
              accessibilityLabel="Open server connection"
            >
              <Text style={styles.serverButtonText}>🔗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.connectButton,
                isConnecting && styles.connectButtonDisabled,
                isServerReachable === true && styles.connectButtonReachable,
                isServerReachable === false && styles.connectButtonUnreachable,
              ]}
              onPress={onConnect}
              disabled={isConnecting}
            >
              <Text
                style={[
                  styles.connectButtonText,
                  isServerReachable === true && styles.connectButtonTextReachable,
                  isServerReachable === false && styles.connectButtonTextUnreachable,
                ]}
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <AgentSelectorModal
          visible={modalVisible}
          agents={agents}
          selectedIndex={selectedIndex}
          onSelect={setSelectedAgent}
          onClose={() => setModalVisible(false)}
        />
      </View>
    </View>
  );
};

const getStyles = theme =>
  StyleSheet.create({
    container: {
      backgroundColor: 'transparent',
    },
    inputContainer: {
      flexDirection: 'row',
      paddingTop: 6,
      paddingHorizontal: 12,
      paddingBottom: 8,
      backgroundColor: 'transparent',
      gap: 8,
      alignItems: 'center',
    },
    urlInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.glassBorder || theme.colors.border,
      borderRadius: 24,
      padding: 12,
      fontSize: 14,
      backgroundColor: theme.colors.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
      color: theme.colors.textPrimary,
    },
    messageInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.glassBorder || theme.colors.border,
      borderRadius: 24,
      padding: 12,
      fontSize: 14,
      lineHeight: 20,
      backgroundColor: theme.colors.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
      color: theme.colors.textPrimary,
      textAlignVertical: 'top',
    },
    sendButton: {
      width: 40,
      height: 40,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.glassBorder || theme.colors.border,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      borderColor: theme.colors.textMuted,
    },

    connectButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.success,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    connectButtonDisabled: {
      borderColor: theme.colors.textMuted,
    },
    connectButtonReachable: {
      borderColor: theme.colors.statusConnected,
    },
    connectButtonUnreachable: {
      borderColor: theme.colors.statusUnreachable,
    },
    connectButtonText: {
      color: theme.colors.success,
      fontWeight: 'bold',
      fontSize: 14,
    },
    connectButtonTextReachable: {
      color: theme.colors.statusConnected,
    },
    connectButtonTextUnreachable: {
      color: theme.colors.statusUnreachable,
    },
    modeButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
      backgroundColor: 'transparent',
    },
    modeButtonText: {
      color: theme.colors.textPrimary,
      fontWeight: 'bold',
      fontSize: 12,
    },
    serverButton: {
      width: 40,
      height: 40,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    serverButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 18,
    },
  });

export default ChatInputBar;
