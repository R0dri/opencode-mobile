/**
 * Individual message item component
 * @param {Object} props - Component props
 * @param {Object} props.message - Message object
 * @param {Function} props.onCopyMessage - Copy message handler
 * @param {boolean} props.showMetaHeaders - Whether to show meta headers
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/shared/components/ThemeProvider';

const MessageItem = ({ message, onCopyMessage, showMetaHeaders = true }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const handleCopyMessage = () => {
    if (onCopyMessage && message.rawData) {
      onCopyMessage(JSON.stringify(message.rawData, null, 2), 'Message JSON');
    }
  };

  return (
    <View style={styles.messageItem}>
      {showMetaHeaders && (
        <>
          <Text style={styles.messageTimestamp}>{new Date().toLocaleTimeString()}</Text>
          <View style={styles.messageHeader}>
            <View style={styles.messageProject}>
              <Svg width="12" height="12" viewBox="0 0 24 24">
                <Path
                  d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
                  fill="#666666"
                />
              </Svg>
              <Text style={styles.messageProjectText}>{message.projectName || 'Unknown'}</Text>
            </View>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyMessage}>
              <Text style={styles.copyButtonText}>📋</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      <Text style={styles.messageRaw}>{JSON.stringify(message.rawData, null, 2)}</Text>
    </View>
  );
};

const getStyles = theme =>
  StyleSheet.create({
    messageItem: {
      marginBottom: 12,
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    },
    messageTimestamp: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    messageHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    messageProject: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    messageProjectText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    copyButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: theme.colors.statusConnecting,
      borderRadius: 4,
    },
    copyButtonText: {
      color: theme.colors.background,
      fontSize: 12,
    },
    messageRaw: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontFamily: 'monospace',
    },
  });

export default MessageItem;
