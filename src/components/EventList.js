 import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../shared/components/ThemeProvider';
import SessionThinkingIndicator from './common/SessionThinkingIndicator';

const getMarkdownStyles = (theme) => ({
  body: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  heading1: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  heading2: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  heading3: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paragraph: {
    marginBottom: 8,
  },
  link: {
    color: theme.colors.accent,
    textDecorationLine: 'underline',
  },
  code_inline: {
    backgroundColor: theme.colors.surface,
    fontFamily: 'monospace',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: theme.colors.surface,
    fontFamily: 'monospace',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.border,
    paddingLeft: 8,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  list_item: {
    marginBottom: 4,
  },
  strong: {
    fontWeight: 'bold',
  },
  em: {
    fontStyle: 'italic',
  },
});

/**
 * EventList component for displaying SSE events
 * @param {Object} props - Component props
 * @param {Array} props.events - Array of event objects
 * @param {Object} props.groupedUnclassifiedMessages - Grouped unclassified messages
 * @param {string|null} props.error - Current error message
 * @param {Function} props.onClearError - Function to clear error
 * @param {boolean} props.isThinking - Whether to show thinking indicator
 */
const EventList = ({ events, groupedUnclassifiedMessages, error, onClearError, isThinking, onDebugPress }) => {
  const theme = useTheme();
  const markdownStyles = getMarkdownStyles(theme);
  const styles = getStyles(theme);
  const [debugVisible, setDebugVisible] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollViewRef = useRef(null);
  const previousEventsLength = useRef(0);

  const hasUnclassifiedMessages = groupedUnclassifiedMessages && typeof groupedUnclassifiedMessages === 'object'
    ? Object.values(groupedUnclassifiedMessages).flat().length > 0
    : false;

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const handleScroll = (event) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const threshold = 50; // pixels from bottom to consider "at bottom"
    const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - threshold;
    setIsAtBottom(atBottom);
  };

  // Auto-scroll to bottom only on initial message load
  useEffect(() => {
    if (previousEventsLength.current === 0 && events.length > 0) {
      scrollToBottom();
    }
    previousEventsLength.current = events.length;
  }, [events]);















  const renderEventItem = ({ item }) => {
    // Don't render connection messages in the main UI - only show in logs
    if (item.type === 'connection') {
      return null;
    }

    // Don't render unclassified messages in the main UI
    if (item.type === 'unclassified') {
      return null;
    }



    let itemStyle, typeStyle, messageStyle, containerStyle;

    // Determine styling based on message type
    switch (item.type) {
      case 'sent':
        itemStyle = styles.sentItem;
        typeStyle = styles.sentType;
        messageStyle = styles.sentMessage;
        containerStyle = styles.rightAlignedContainer;
        break;
      case 'error':
        itemStyle = styles.errorItem;
        typeStyle = styles.errorType;
        messageStyle = styles.errorMessage;
        containerStyle = styles.leftAlignedContainer;
        break;
      case 'session_status':
        itemStyle = styles.sessionStatusItem;
        typeStyle = styles.sessionStatusType;
        messageStyle = styles.sessionStatusMessage;
        containerStyle = styles.leftAlignedContainer;
        break;
      case 'message_finalized':
        itemStyle = item.mode === 'plan' ? styles.planFinalizedItem : styles.finalizedItem;
        typeStyle = item.mode === 'plan' ? styles.planFinalizedType : styles.finalizedType;
        messageStyle = styles.finalizedMessage;
        containerStyle = styles.leftAlignedContainer;
        break;
      default:
        itemStyle = item.mode === 'plan' ? styles.planMessageItem : styles.messageItem;
        typeStyle = styles.messageType;
        messageStyle = styles.messageMessage;
        containerStyle = styles.leftAlignedContainer;
    }

    // Dynamic markdown styles based on message type
    const dynamicMarkdownStyles = {
      ...markdownStyles,
      body: {
        ...markdownStyles.body,
        color: theme.colors.textPrimary,
      },
    };







    return (
      <View key={item.id} style={[styles.eventContainer, containerStyle]} pointerEvents="box-none">
        <View style={[styles.eventItem, itemStyle]} pointerEvents="box-none">
          <View style={[styles.markdownContainer, messageStyle]} pointerEvents="box-none">
            <Markdown
              style={dynamicMarkdownStyles}
              maxWidth="100%"
              rules={{
                // Limit complex rules for performance
                html_inline: () => null,
                html_block: () => null,
                image: () => null,
              }}
            >
              {item.message || ''}
            </Markdown>
          </View>
        </View>
      </View>
    );
  };



  return (
    <View style={styles.eventsContainer}>
      {error && (
        <TouchableOpacity style={styles.errorContainer} onPress={onClearError}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorClose}>✕</Text>
        </TouchableOpacity>
      )}



      <ScrollView
        ref={scrollViewRef}
        style={styles.listContent}
        contentContainerStyle={{ paddingBottom: 20 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {events.map((item) => renderEventItem({ item }))}
        {isThinking && <SessionThinkingIndicator isThinking={true} />}
      </ScrollView>

      {!isAtBottom && (
        <TouchableOpacity
          style={styles.scrollToBottomButton}
          onPress={scrollToBottom}
        >
          <Text style={styles.scrollToBottomText}>↓</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const getStyles = (theme) => StyleSheet.create({
  eventsContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  markdownContainer: {
    alignSelf: 'flex-start',
  },
  errorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.errorBackground,
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.statusUnreachable,
  },
  errorText: {
    color: theme.colors.errorText,
    fontSize: 14,
    flex: 1,
  },
  errorClose: {
    color: theme.colors.errorText,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
   listContent: {
     paddingHorizontal: 20,
     paddingBottom: 20,
   },
    eventItem: {
      padding: 12,
      marginBottom: 12,
      borderRadius: 0,
      borderLeftWidth: 4,
      borderRightWidth: 0,
      shadowColor: theme.colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
  messageItem: {
    backgroundColor: theme.colors.background,
    borderLeftColor: theme.colors.accent,
    borderLeftWidth: 4,
  },
  planMessageItem: {
    backgroundColor: theme.colors.background,
    borderLeftColor: '#6f42c1', // Keep purple for plan mode distinction
    borderLeftWidth: 4,
  },
  connectionItem: {
    backgroundColor: '#e3f2fd',
    borderLeftColor: '#2196f3',
    borderLeftWidth: 4,
  },
  errorItem: {
    backgroundColor: '#ffebee',
    borderLeftColor: '#f44336',
    borderLeftWidth: 4,
  },
  eventType: {
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  messageType: {
    color: '#6f42c1', // Keep purple for plan mode
  },
  connectionType: {
    color: theme.colors.statusConnecting,
  },
  errorType: {
    color: theme.colors.errorText,
  },
  eventMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageMessage: {
    color: theme.colors.textPrimary,
  },
  connectionMessage: {
    color: theme.colors.accentSecondary,
  },
  errorMessage: {
    color: theme.colors.errorText,
  },
  // Classified message styles
  finalizedItem: {
    backgroundColor: theme.colors.surface,
    borderLeftColor: theme.colors.accent,
    borderLeftWidth: 4,
  },
  planFinalizedItem: {
    backgroundColor: theme.colors.surface,
    borderLeftColor: '#6f42c1',
    borderLeftWidth: 4,
  },
  finalizedType: {
    color: theme.colors.accent,
  },
  planFinalizedType: {
    color: '#6f42c1',
  },
  finalizedMessage: {
    color: theme.colors.success,
  },
  streamingItem: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderLeftColor: theme.colors.statusConnecting,
    borderLeftWidth: 4,
  },
  streamingType: {
    color: theme.colors.statusConnecting,
  },
  streamingMessage: {
    color: theme.colors.accentSecondary,
  },
  sessionItem: {
    backgroundColor: theme.colors.surface,
    borderLeftColor: theme.colors.statusUnknown,
    borderLeftWidth: 4,
  },
  sessionType: {
    color: theme.colors.statusUnknown,
  },
  sessionMessage: {
    color: theme.colors.textSecondary,
  },

  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  projectBadge: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  debugButton: {
    backgroundColor: theme.colors.warning,
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Sent message styles
    sentItem: {
      backgroundColor: theme.colors.surface,
      borderRightColor: theme.colors.success,
      borderRightWidth: 4,
      borderLeftWidth: 0,
    },
  sentType: {
    color: theme.colors.statusConnecting,
  },
  sentMessage: {
    color: theme.colors.accentSecondary,
  },
  // Session status styles
  sessionStatusItem: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderLeftColor: theme.colors.statusConnecting,
    borderLeftWidth: 4,
  },
  sessionStatusType: {
    color: theme.colors.statusConnecting,
  },
  sessionStatusMessage: {
    color: theme.colors.accentSecondary,
  },
  // Message alignment containers
  eventContainer: {
    marginBottom: 8,
  },
  leftAlignedContainer: {
    alignItems: 'flex-start',
  },
  rightAlignedContainer: {
    alignItems: 'flex-end',
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  scrollToBottomText: {
    color: theme.colors.background,
    fontSize: 20,
    fontWeight: 'bold',
  },
});