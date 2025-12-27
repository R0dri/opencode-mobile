import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Markdown from 'react-native-markdown-display';


/**
 * EventList component for displaying SSE events
 * @param {Object} props - Component props
 * @param {Array} props.events - Array of event objects
 * @param {Object} props.groupedUnclassifiedMessages - Grouped unclassified messages
 * @param {string|null} props.error - Current error message
 * @param {Function} props.onClearError - Function to clear error
 */
const EventList = ({ events, groupedUnclassifiedMessages, error, onClearError }) => {

  const scrollViewRef = useRef(null);
  const lastScrollTime = useRef(0);

  // Markdown styles matching app theme
  const markdownStyles = {
     body: {
       color: '#333333',
       fontSize: 16,
       lineHeight: 24,
     },
    paragraph: {
      marginTop: 0,
      marginBottom: 4,
    },
     heading1: {
       fontSize: 28,
       fontWeight: 'bold',
       color: '#333333',
       marginBottom: 10,
     },
     heading2: {
       fontSize: 24,
       fontWeight: 'bold',
       color: '#333333',
       marginBottom: 8,
     },
     heading3: {
       fontSize: 20,
       fontWeight: 'bold',
       color: '#333333',
       marginBottom: 6,
     },
    strong: {
      fontWeight: 'bold',
    },
    em: {
      fontStyle: 'italic',
    },
     code_inline: {
       backgroundColor: '#f5f5f5',
       paddingHorizontal: 6,
       paddingVertical: 3,
       borderRadius: 3,
       fontFamily: 'monospace',
       fontSize: 14,
     },
     code_block: {
       backgroundColor: '#f5f5f5',
       padding: 10,
       borderRadius: 4,
       fontFamily: 'monospace',
       fontSize: 14,
       marginVertical: 6,
     },
    link: {
      color: '#007bff',
      textDecorationLine: 'underline',
    },
    list_item: {
      marginBottom: 4,
    },
    bullet_list: {
      marginBottom: 8,
    },
    ordered_list: {
      marginBottom: 8,
    },
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: '#e0e0e0',
      paddingLeft: 8,
      marginVertical: 4,
      fontStyle: 'italic',
    },
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 150);
  };

  useEffect(() => {
    scrollToBottom();
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
        color: '#333333',
      },
    };

    return (
      <View key={item.id} style={[styles.eventContainer, containerStyle]}>
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

  const hasUnclassifiedMessages = Object.keys(groupedUnclassifiedMessages).length > 0;

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
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollToBottom()}
      >
        {events.map((item) => renderEventItem({ item }))}
      </ScrollView>


    </View>
  );
};

const styles = StyleSheet.create({
  eventsContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  markdownContainer: {
    alignSelf: 'flex-start',
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
     paddingHorizontal: 20,
     paddingBottom: 20,
   },
    eventItem: {
      padding: 12,
      marginBottom: 12,
      borderRadius: 0,
      borderLeftWidth: 4,
      borderRightWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      maxWidth: '97%',
    },
  messageItem: {
    backgroundColor: '#ffffff',
    borderLeftColor: '#007bff',
    borderLeftWidth: 4,
  },
  planMessageItem: {
    backgroundColor: '#ffffff',
    borderLeftColor: '#6200ee',
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
    color: '#333333',
  },
  connectionMessage: {
    color: '#1976d2',
  },
  errorMessage: {
    color: '#d32f2f',
  },
  // Classified message styles
  finalizedItem: {
    backgroundColor: '#f8f9fa',
    borderLeftColor: '#007bff',
    borderLeftWidth: 4,
  },
  planFinalizedItem: {
    backgroundColor: '#f8f9fa',
    borderLeftColor: '#6200ee',
    borderLeftWidth: 4,
  },
  finalizedType: {
    color: '#007bff',
  },
  planFinalizedType: {
    color: '#6200ee',
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
    color: '#666666',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  debugButton: {
    backgroundColor: '#ffc107',
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
     backgroundColor: '#f8f9fa',
     borderRightColor: '#28a745',
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