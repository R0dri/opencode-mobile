import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import DebugScreen from './DebugScreen';

/**
 * EventList component for displaying SSE events
 * @param {Object} props - Component props
 * @param {Array} props.events - Array of event objects
 * @param {Object} props.groupedUnclassifiedMessages - Grouped unclassified messages
 * @param {string|null} props.error - Current error message
 * @param {Function} props.onClearError - Function to clear error
 */
const EventList = ({ events, groupedUnclassifiedMessages, error, onClearError }) => {
  const [debugVisible, setDebugVisible] = useState(false);
  const flatListRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [events]);

  const renderEventItem = ({ item }) => {
    console.log('🎨 RENDERING EVENT:', item.type, item.category, item.message?.substring(0, 50) + '...');
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
        itemStyle = styles.finalizedItem;
        typeStyle = styles.finalizedType;
        messageStyle = styles.finalizedMessage;
        containerStyle = styles.leftAlignedContainer;
        break;
      default:
        itemStyle = styles.messageItem;
        typeStyle = styles.messageType;
        messageStyle = styles.messageMessage;
        containerStyle = styles.leftAlignedContainer;
    }

    return (
      <View style={[styles.eventContainer, containerStyle]}>
        <View style={[styles.eventItem, itemStyle]}>
          {item.type !== 'sent' && (
            <View style={styles.eventHeader}>
              <Text style={[styles.eventType, typeStyle]}>
                {item.icon || ''} {item.type}
              </Text>
              {item.projectName && item.projectName !== 'Me' && (
                <Text style={styles.projectBadge}>
                  📁 {item.projectName}
                </Text>
              )}
            </View>
          )}
          <Text style={[styles.eventMessage, messageStyle]}>
            {item.message}
          </Text>
        </View>
      </View>
    );
  };

  const hasUnclassifiedMessages = Object.keys(groupedUnclassifiedMessages).length > 0;

  return (
    <View style={styles.eventsContainer}>
      {error && (
        <TouchableOpacity style={styles.errorContainer} onPress={onClearError}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorClose}>✕</Text>
        </TouchableOpacity>
      )}

      {hasUnclassifiedMessages && (
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => setDebugVisible(true)}
        >
          <Text style={styles.debugButtonText}>
            ⚠️ Debug ({Object.values(groupedUnclassifiedMessages).flat().length} unclassified)
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={events}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEventItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
      />

      <DebugScreen
        unclassifiedMessages={groupedUnclassifiedMessages}
        visible={debugVisible}
        onClose={() => setDebugVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  eventsContainer: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    flex: 1,
  },
  errorClose: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  eventItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderRightWidth: 0,
  },
  messageItem: {
    backgroundColor: '#f8f8f8',
    borderLeftColor: '#808080',
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
    color: '#6200ee',
  },
  connectionType: {
    color: '#2196f3',
  },
  errorType: {
    color: '#d32f2f',
  },
  eventMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageMessage: {
    color: '#333',
  },
  connectionMessage: {
    color: '#1976d2',
  },
  errorMessage: {
    color: '#d32f2f',
  },
  // Classified message styles
  finalizedItem: {
    backgroundColor: '#e8e8e8',
    borderLeftColor: '#707070',
    borderLeftWidth: 4,
  },
  finalizedType: {
    color: '#4CAF50',
  },
  finalizedMessage: {
    color: '#2e7d32',
  },
  streamingItem: {
    backgroundColor: '#e3f2fd',
    borderLeftColor: '#2196F3',
    borderLeftWidth: 4,
  },
  streamingType: {
    color: '#2196F3',
  },
  streamingMessage: {
    color: '#1565c0',
  },
  sessionItem: {
    backgroundColor: '#f5f5f5',
    borderLeftColor: '#9E9E9E',
    borderLeftWidth: 4,
  },
  sessionType: {
    color: '#9E9E9E',
  },
  sessionMessage: {
    color: '#424242',
  },

  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  projectBadge: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#d0d0d0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  debugButton: {
    backgroundColor: '#b0b0b0',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Sent message styles
  sentItem: {
    backgroundColor: '#e0e0e0',
    borderRightColor: '#606060',
    borderRightWidth: 4,
    borderLeftWidth: 0,
  },
  sentType: {
    color: '#2196F3',
  },
  sentMessage: {
    color: '#1565C0',
  },
  // Session status styles
  sessionStatusItem: {
    backgroundColor: '#e3f2fd',
    borderLeftColor: '#2196F3',
    borderLeftWidth: 4,
  },
  sessionStatusType: {
    color: '#2196F3',
  },
  sessionStatusMessage: {
    color: '#1565C0',
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
});



export default EventList;