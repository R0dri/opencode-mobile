import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { formatStatusText, getStatusIcon, getThinkingAnimation } from '../utils/sessionStatusUtils';

/**
 * SessionStatusIndicator component - Text/icon combo visualization for session status
 * @param {Object} props - Component props
 * @param {boolean} props.isThinking - Whether the session is thinking
 * @param {boolean} props.isBusy - Whether the session is busy
 */
const SessionStatusIndicator = React.memo(({ isThinking, isBusy }) => {

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{getStatusIcon(isThinking, isBusy)}</Text>
      <Text style={styles.text}>{formatStatusText(isThinking, isBusy)}</Text>
    </View>
  );
});

SessionStatusIndicator.displayName = 'SessionStatusIndicator';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
    marginRight: 4,
  },
  text: {
    fontSize: 14,
  },
});

export default SessionStatusIndicator;