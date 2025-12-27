import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * SessionStatusIndicator component
 * Shows the current session status (busy/idle) in the status bar
 * @param {string} sessionStatus - Current session status ('busy', 'idle', or null)
 */
const SessionStatusIndicator = ({ sessionStatus }) => {
  console.log('SessionStatusIndicator render with status:', sessionStatus);
  if (!sessionStatus) {
    console.log('SessionStatusIndicator returning null');
    return null;
  }

  const getStatusInfo = () => {
    switch (sessionStatus) {
      case 'busy':
        return {
          text: 'Busy',
          icon: 'B',
          color: '#FFC107',
          backgroundColor: 'rgba(255, 193, 7, 0.1)'
        };
      case 'idle':
        return {
          text: 'Idle',
          icon: 'I',
          color: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)'
        };
      default:
        return {
          text: 'Status',
          icon: '?',
          color: '#9E9E9E',
          backgroundColor: 'rgba(158, 158, 158, 0.1)'
        };
    }
  };

  const { text, icon, color, backgroundColor } = getStatusInfo();

  console.log('SessionStatusIndicator rendering with:', { text, icon, color });

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <Text style={[styles.icon, { color }]}>
          {icon}
        </Text>
        <Text style={[styles.text, { color }]}>
          {text}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    fontSize: 10,
  },
  text: {
    fontSize: 10,
    fontWeight: '500',
  },
});

export default SessionStatusIndicator;