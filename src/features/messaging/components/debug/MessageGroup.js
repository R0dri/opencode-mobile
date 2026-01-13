/**
 * Expandable message group component
 * @param {Object} props - Component props
 * @param {string} props.type - Group type/key (or messageId for messageId groups)
 * @param {Array} props.messages - Array of messages in this group
 * @param {boolean} props.isClassified - Whether this is a classified group
 * @param {boolean} props.isExpanded - Whether group is expanded
 * @param {Function} props.onToggle - Toggle expansion handler
 * @param {Function} props.onCopyMessage - Copy message handler
 * @param {boolean} props.isMessageIdGroup - Whether this is a messageId group (shows event timeline)
 * @param {boolean} props.showMetaHeaders - Whether to show meta headers
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/shared/components/ThemeProvider';
import MessageItem from './MessageItem';

const MessageGroup = ({
  type,
  messages,
  isClassified,
  isExpanded,
  onToggle,
  onCopyMessage,
  isMessageIdGroup,
  showMetaHeaders,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const groupStyles = {
    borderColor: isMessageIdGroup
      ? theme.colors.info
      : isClassified
        ? theme.colors.success
        : theme.colors.warning,
    backgroundColor: isMessageIdGroup
      ? theme.colors.infoBackground
      : isClassified
        ? theme.colors.successBackground
        : theme.colors.warningBackground,
    headerBackground: isMessageIdGroup
      ? theme.colors.info
      : isClassified
        ? theme.colors.success
        : theme.colors.warning,
  };

  const formatTimestamp = ts => {
    if (!ts) return '--:--';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getEventTypeIcon = eventType => {
    switch (eventType) {
      case 'message.part.updated':
        return '📝';
      case 'message.updated':
        return '✅';
      case 'session.status':
        return '🔄';
      case 'session.idle':
        return '💤';
      default:
        return '📋';
    }
  };

  return (
    <View
      style={[
        styles.groupContainer,
        {
          borderColor: groupStyles.borderColor,
          backgroundColor: groupStyles.backgroundColor,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.groupHeader, { backgroundColor: groupStyles.headerBackground }]}
        onPress={onToggle}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.groupTitle}>{type}</Text>
          <Text style={styles.messageCount}>({messages.length})</Text>
          {isMessageIdGroup && (
            <View style={styles.eventTypeContainer}>
              {messages.map((msg, i) => (
                <Text key={i} style={styles.eventTypeIcon}>
                  {getEventTypeIcon(msg.eventType || msg.type)}
                </Text>
              ))}
            </View>
          )}
        </View>
        <Svg width="12" height="12" viewBox="0 0 24 24" style={styles.expandIcon}>
          <Path d={isExpanded ? 'M7 10l5 5 5-5z' : 'M10 7l5 5-5 5z'} fill="#666666" />
        </Svg>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.groupContent}>
          {isMessageIdGroup ? (
            <View style={styles.timelineContainer}>
              {messages.map((message, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineLine}>
                    <Text style={styles.timelineTime}>{formatTimestamp(message.timestamp)}</Text>
                    <Text style={styles.timelineIcon}>
                      {getEventTypeIcon(message.eventType || message.type)}
                    </Text>
                    <Text style={styles.timelineEventType}>
                      {message.eventType || message.type}
                    </Text>
                  </View>
                  <View style={styles.timelineContent}>
                    <MessageItem
                      message={message}
                      onCopyMessage={onCopyMessage}
                      showMetaHeaders={showMetaHeaders}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            messages.map((message, index) => (
              <MessageItem
                key={index}
                message={message}
                onCopyMessage={onCopyMessage}
                showMetaHeaders={showMetaHeaders}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
};

const getStyles = theme =>
  StyleSheet.create({
    groupContainer: {
      marginBottom: 16,
      borderWidth: 1,
      borderRadius: 8,
    },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    groupTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
    },
    messageCount: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginLeft: 8,
    },
    eventTypeContainer: {
      flexDirection: 'row',
      marginLeft: 8,
    },
    eventTypeIcon: {
      fontSize: 12,
      marginLeft: 4,
    },
    expandIcon: {
      marginLeft: 8,
    },
    groupContent: {
      padding: 12,
    },
    timelineContainer: {
      flex: 1,
    },
    timelineItem: {
      marginBottom: 8,
    },
    timelineLine: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    timelineTime: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      width: 70,
    },
    timelineIcon: {
      fontSize: 12,
      marginRight: 4,
    },
    timelineEventType: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    timelineContent: {
      marginLeft: 86,
    },
  });

export default MessageGroup;
