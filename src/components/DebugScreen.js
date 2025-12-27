import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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
          <Svg width="12" height="12" viewBox="0 0 24 24" style={styles.expandIcon}>
            <Path d={isExpanded ? "M7 10l5 5 5-5z" : "M10 7l5 5-5 5z"} fill="#666666" />
          </Svg>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.groupContent}>
            {messages.map((message, index) => (
              <View key={index} style={styles.messageItem}>
                <Text style={styles.messageTimestamp}>
                  {new Date().toLocaleTimeString()}
                </Text>
                 <View style={styles.messageHeader}>
                    <View style={styles.messageProject}>
                      <Svg width="12" height="12" viewBox="0 0 24 24">
                        <Path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="#666666" />
                      </Svg>
                      <Text style={styles.messageProjectText}>
                        {message.projectName}
                      </Text>
                    </View>
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
              <View style={styles.title}>
                <Svg width="16" height="16" viewBox="0 0 24 24">
                  <Path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="#856404" />
                </Svg>
                <Text style={styles.titleText}>
                  Debug Screen
                </Text>
              </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 18,
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
    marginLeft: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  messageProjectText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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