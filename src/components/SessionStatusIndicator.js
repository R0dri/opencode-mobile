import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * SessionStatusIndicator component
 * Shows the current session status (busy/idle) above the connection status
 * @param {string} sessionStatus - Current session status ('busy', 'idle', or null)
 */
const SessionStatusIndicator = ({ sessionStatus }) => {
  if (!sessionStatus) {
    return null;
  }

  const getStatusInfo = () => {
    switch (sessionStatus) {
      case 'busy':
        return {
          text: 'Session is busy',
          emoji: '🤖',
          color: '#FFC107',
          backgroundColor: 'rgba(255, 193, 7, 0.1)'
        };
      case 'idle':
        return {
          text: 'Session is idle',
          emoji: '😌',
          color: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)'
        };
      default:
        return {
          text: `Session: ${sessionStatus}`,
          emoji: '❓',
          color: '#9E9E9E',
          backgroundColor: 'rgba(158, 158, 158, 0.1)'
        };
    }
  };

  const { text, emoji, color, backgroundColor } = getStatusInfo();

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.text, { color }]}>
        {emoji} {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default SessionStatusIndicator;