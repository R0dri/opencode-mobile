import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/**
 * DebugScreen component for displaying unclassified messages
 * @param {Object} props - Component props
 * @param {Object} props.unclassifiedMessages - Grouped unclassified messages
 * @param {boolean} props.visible - Whether debug screen is visible
 * @param {Function} props.onClose - Function to close debug screen
 */
const DebugScreen = ({ unclassifiedMessages, visible, onClose }) => {
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (type) => {
    setExpandedGroups(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const copyToClipboard = async (content, label) => {
    try {
      await Clipboard.setStringAsync(content);
      Alert.alert('Copied!', `${label} copied to clipboard`);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const copyAllData = () => {
    const allData = {
      timestamp: new Date().toISOString(),
      summary: {
        payloadTypes: messageTypes.length,
        totalMessages,
        typesBreakdown: Object.fromEntries(
          messageTypes.map(type => [type, unclassifiedMessages[type].length])
        )
      },
      unclassifiedMessages
    };
    copyToClipboard(JSON.stringify(allData, null, 2), 'All debug data');
  };

  const renderMessageGroup = (type, messages) => {
    const isExpanded = expandedGroups[type];
    const messageCount = messages.length;

    return (
      <View key={type} style={styles.groupContainer}>
        <TouchableOpacity
          style={styles.groupHeader}
          onPress={() => toggleGroup(type)}
        >
          <Text style={styles.groupTitle}>
            {type} ({messageCount})
          </Text>
          <Text style={styles.expandIcon}>
            {isExpanded ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.groupContent}>
            {messages.map((message, index) => (
              <View key={index} style={styles.messageItem}>
                <Text style={styles.messageTimestamp}>
                  {new Date().toLocaleTimeString()}
                </Text>
                 <View style={styles.messageHeader}>
                   <Text style={styles.messageProject}>
                     📁 {message.projectName}
                   </Text>
                   <TouchableOpacity 
                     style={styles.copyButton}
                     onPress={() => copyToClipboard(
                       JSON.stringify(message.rawData, null, 2),
                       'Message JSON'
                     )}
                   >
                     <Text style={styles.copyButtonText}>📋</Text>
                   </TouchableOpacity>
                 </View>
                 <Text style={styles.messageRaw}>
                   {JSON.stringify(message.rawData, null, 2)}
                 </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const messageTypes = Object.keys(unclassifiedMessages);
  const totalMessages = messageTypes.reduce((sum, type) =>
    sum + unclassifiedMessages[type].length, 0
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>
                Debug Screen ⚠️
              </Text>
              <Text style={styles.subtitle}>
                {messageTypes.length} payload types • {totalMessages} total messages
              </Text>
            </View>
            <View style={styles.headerButtons}>
              {messageTypes.length > 0 && (
                <TouchableOpacity 
                  style={styles.copyAllButton} 
                  onPress={copyAllData}
                >
                  <Text style={styles.copyAllButtonText}>📋 Copy All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content}>
            {messageTypes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No unclassified messages yet
                </Text>
                <Text style={styles.emptySubtext}>
                  Messages will appear here when received
                </Text>
              </View>
            ) : (
              messageTypes.map(type => renderMessageGroup(type, unclassifiedMessages[type]))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  copyAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    marginRight: 8,
  },
  copyAllButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  groupContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFC107',
    borderRadius: 8,
    backgroundColor: '#fff8e1',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFC107',
    borderRadius: 8,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  expandIcon: {
    fontSize: 14,
    color: '#333',
  },
  groupContent: {
    padding: 12,
  },
  messageItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  messageTimestamp: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageProject: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  copyButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 12,
  },
  messageRaw: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});

export default DebugScreen;