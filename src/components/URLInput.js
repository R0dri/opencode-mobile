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
  const handleSendMessage = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim());
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
          <TextInput
            style={styles.messageInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type your message..."
            placeholderTextColor="#999"
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
              color={!messageText.trim() ? '#999' : 'white'} 
              size={20} 
            />
          </TouchableOpacity>
        </>
      ) : (
        // Show URL input and connect button when not connected
        <>
          <TextInput
            style={styles.urlInput}
            value={inputUrl}
            onChangeText={onUrlChange}
            placeholder="Enter base URL (e.g., http://10.1.1.122:63425)"
            placeholderTextColor="#999"
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
    padding: 12,
    backgroundColor: '#e8e8e8',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    gap: 8,
    alignItems: 'center',
  },
  urlInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 20,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f0f0f0',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 20,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f0f0f0',
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    backgroundColor: '#a0a0a0',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
    borderRightColor: '#999',
  },

  connectButton: {
    backgroundColor: '#808080',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  connectButtonReachable: {
    backgroundColor: '#4CAF50', // Green when server is reachable
  },
  connectButtonUnreachable: {
    backgroundColor: '#F44336', // Red when server is unreachable
  },
  connectButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  connectButtonTextReachable: {
    color: 'white',
  },
  connectButtonTextUnreachable: {
    color: 'white',
  },
});



export default URLInput;