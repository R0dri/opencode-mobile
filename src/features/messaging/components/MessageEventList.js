import React, { useRef, useState, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/shared/components/ThemeProvider';
import { ThinkingIndicator } from '@/shared/components/common';
import { logger } from '@/shared/services/logger';
import getMarkdownStyles from '@/features/messaging/utils/markdownStyles';
import { useScrollManagement } from '@/features/messaging/hooks/useScrollManagement';
import EventItem from './EventItem';

const messageLogger = logger.tag('Message');

/**
 * MessageEventList component for displaying SSE events
 * @param {Object} props - Component props
 * @param {Array} props.events - Array of event objects
 * @param {Object} props.groupedUnclassifiedMessages - Grouped unclassified messages
 * @param {string|null} props.error - Current error message
 * @param {Function} props.onClearError - Function to clear error
 * @param {boolean} props.isThinking - Whether to show thinking indicator
 * @param {boolean} props.showMeta - Whether to show meta headers
 */
const MessageEventList = ({
  events,
  groupedUnclassifiedMessages,
  error,
  onClearError,
  isThinking,
  onDebugPress,
  showMeta,
}) => {
  const theme = useTheme();
  const markdownStyles = useMemo(() => getMarkdownStyles(theme), [theme]);
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [debugVisible, setDebugVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const { scrollViewRef, scrollToBottom, handleScroll, isAtBottom } = useScrollManagement({
    events,
  });

  // Show toast with fade animation
  const showToast = () => {
    setToastVisible(true);
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setToastVisible(false);
        });
      }, 1500);
    });
  };

  const hasUnclassifiedMessages =
    groupedUnclassifiedMessages && typeof groupedUnclassifiedMessages === 'object'
      ? Object.values(groupedUnclassifiedMessages).flat().length > 0
      : false;

  return (
    <View style={styles.eventsContainer}>
      {error && (
        <TouchableOpacity style={styles.errorContainer} onPress={onClearError}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorClose}>✕</Text>
        </TouchableOpacity>
      )}

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.listContent}
          contentContainerStyle={{ paddingTop: 40 }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={['transparent', theme.colors.background]}
            style={styles.fadeGradient}
            pointerEvents="none"
          />
          {events.map(item => (
            <EventItem
              key={item.messageId || item.id}
              item={item}
              theme={theme}
              markdownStyles={markdownStyles}
              showToast={showToast}
              showMeta={showMeta}
            />
          ))}
          {isThinking && <ThinkingIndicator isThinking={true} inline={true} />}
        </ScrollView>
      </TouchableWithoutFeedback>

      {!isAtBottom && (
        <TouchableOpacity style={styles.scrollToBottomButton} onPress={scrollToBottom}>
          <Text style={styles.scrollToBottomText}>↓</Text>
        </TouchableOpacity>
      )}

      {/* Copy toast notification */}
      {toastVisible && (
        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>✓ Copied!</Text>
        </Animated.View>
      )}
    </View>
  );
};

const getStyles = theme =>
  StyleSheet.create({
    eventsContainer: {
      flex: 1,
      backgroundColor: 'transparent',
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
    fadeGradient: {
      position: 'absolute',
      top: -40,
      left: 0,
      right: 0,
      height: 80,
      zIndex: 1,
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
      backgroundColor: theme.colors.surfaceSecondary,
      borderLeftColor: theme.colors.statusConnecting,
      borderLeftWidth: 4,
    },
    errorItem: {
      backgroundColor: theme.colors.errorBackground,
      borderLeftColor: theme.colors.statusUnreachable,
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
      backgroundColor: theme.colors.sur,
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
      // background: theme.colors.surfaceSecondary,
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
    debugIdBadge: {
      fontSize: 9,
      fontFamily: 'monospace',
      color: theme.colors.textSecondary,
      backgroundColor: theme.colors.surfaceSecondary,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      marginBottom: 4,
      alignSelf: 'flex-start',
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    copyButton: {
      padding: 4,
      borderRadius: 4,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    copyButtonText: {
      fontSize: 16,
    },
    toastContainer: {
      position: 'absolute',
      bottom: 80,
      left: '50%',
      transform: [{ translateX: -60 }],
      backgroundColor: theme.colors.success || '#28a745',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      elevation: 5,
      shadowColor: theme.colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      zIndex: 1000,
    },
    toastText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
    },
  });

export default memo(MessageEventList);
