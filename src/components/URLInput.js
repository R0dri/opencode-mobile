import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import SendIcon from './SendIcon';

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
  const [messageText, setMessageText] = useState('');
  const [mode, setMode] = useState('build');
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
            style={[styles.modeButton, { borderColor: mode === 'build' ? '#007bff' : '#6f42c1' }]}
            onPress={() => setMode(mode === 'build' ? 'plan' : 'build')}
          >
            <Text style={styles.modeButtonText}>{mode.toUpperCase()}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.messageInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type your message..."
            placeholderTextColor="#999999"
            multiline
            onSubmitEditing={handleSubmitEditing}
            blurOnSubmit={false}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
          >
            <SendIcon
              color={!messageText.trim() ? '#999' : '#007bff'}
              size={20}
            />
          </TouchableOpacity>
        </>
      ) : (
        // Show URL input and connect button when not connected
        <>
          <TouchableOpacity
            style={[styles.modeButton, { borderColor: mode === 'build' ? '#007bff' : '#6f42c1' }]}
            onPress={() => setMode(mode === 'build' ? 'plan' : 'build')}
          >
            <Text style={styles.modeButtonText}>{mode.toUpperCase()}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.urlInput}
            value={inputUrl}
            onChangeText={onUrlChange}
            placeholder="Enter base URL (e.g., http://10.1.1.122:63425)"
            placeholderTextColor="#999999"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
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

const styles = StyleSheet.create({
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
    borderColor: '#e0e0e0',
    borderRadius: 20,
    padding: 12,
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    borderColor: '#007bff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    borderColor: '#cccccc',
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
    borderRightColor: '#999',
  },

  connectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButtonDisabled: {
    borderColor: '#cccccc',
  },
  connectButtonReachable: {
    borderColor: '#4CAF50', // Green when server is reachable
  },
  connectButtonUnreachable: {
    borderColor: '#F44336', // Red when server is unreachable
  },
  connectButtonText: {
    color: '#28a745',
    fontWeight: 'bold',
    fontSize: 14,
  },
  connectButtonTextReachable: {
    color: '#4CAF50',
  },
  connectButtonTextUnreachable: {
    color: '#F44336',
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  modeButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 12,
  },
});



export default URLInput;