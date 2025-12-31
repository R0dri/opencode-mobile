import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../shared/components/ThemeProvider';
import PaperPlaneIcon from '../common/PaperPlaneIcon';

/**
 * URLInput component for entering URL, connecting, and sending messages
 * @param {Object} props - Component props
 * @param {string} props.inputUrl - Current input URL value
 * @param {Function} props.onUrlChange - Function to handle URL changes
 * @param {Function} props.onConnect - Function to handle connect button press
 * @param {Function} props.onSendMessage - Function to handle send message
 * @param {boolean} props.isConnecting - Whether connection is in progress
 * @param {boolean} props.isConnected - Whether already connected
 * @param {boolean|null} props.isServerReachable - Whether server is reachable
 */
const URLInput = ({ inputUrl, onUrlChange, onConnect, onSendMessage, isConnecting, isConnected, isServerReachable }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [messageText, setMessageText] = useState('');
  const [mode, setMode] = useState('build');
  const inputRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handler = (e) => {
        if (e.shiftKey && e.key === 'Tab' && document.activeElement === inputRef.current) {
          e.preventDefault();
          setMode(prev => prev === 'build' ? 'plan' : 'build');
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, []);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim(), mode);
      setMessageText('');
    }
  };

  const handleSubmitEditing = () => {
    handleSendMessage();
  };

  return (
    <View style={styles.inputContainer}>
      {isConnected ? (
        // Show message input and send button when connected
        <>
          <TouchableOpacity
            style={[styles.modeButton, { borderColor: mode === 'build' ? theme.colors.accent : '#6f42c1' }]}
            onPress={() => setMode(mode === 'build' ? 'plan' : 'build')}
          >
            <Text style={styles.modeButtonText}>{mode.toUpperCase()}</Text>
          </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={styles.messageInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type your message..."
              placeholderTextColor={theme.colors.textMuted}
              multiline={false}
              onSubmitEditing={handleSubmitEditing}
              returnKeyType="send"
            />
          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
          >
            <PaperPlaneIcon
              color={!messageText.trim() ? theme.colors.textMuted : theme.colors.accent}
              size={20}
            />
          </TouchableOpacity>
        </>
      ) : (
        // Show URL input and connect button when not connected
        <>
          <TouchableOpacity
            style={[styles.modeButton, { borderColor: mode === 'build' ? theme.colors.accent : '#6f42c1' }]}
            onPress={() => setMode(mode === 'build' ? 'plan' : 'build')}
          >
            <Text style={styles.modeButtonText}>{mode.toUpperCase()}</Text>
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
            style={[
              styles.connectButton,
              isConnecting && styles.connectButtonDisabled,
              isServerReachable === true && styles.connectButtonReachable,
              isServerReachable === false && styles.connectButtonUnreachable
            ]}
            onPress={onConnect}
            disabled={isConnecting}
          >
            <Text style={[
              styles.connectButtonText,
              isServerReachable === true && styles.connectButtonTextReachable,
              isServerReachable === false && styles.connectButtonTextUnreachable
            ]}>
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const getStyles = (theme) => StyleSheet.create({
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
    borderColor: theme.colors.border,
    borderRadius: 20,
    padding: 12,
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    padding: 12,
    fontSize: 14,
    backgroundColor: 'transparent',
    minHeight: 32,
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.accent,
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
    borderColor: theme.colors.statusConnected, // Green when server is reachable
  },
  connectButtonUnreachable: {
    borderColor: theme.colors.statusUnreachable, // Red when server is unreachable
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
});



export default URLInput;