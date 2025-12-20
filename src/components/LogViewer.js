import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import logger from '../utils/logger';

const LogViewer = ({ visible, onClose }) => {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadLogs();
    }
  }, [visible]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const logContent = await logger.getLogs(200);
      setLogs(logContent);
      await logger.info('Log viewer opened');
    } catch (error) {
      console.error('Failed to load logs:', error);
      setLogs('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await logger.clearLogs();
              setLogs('Logs cleared');
              await logger.info('Logs cleared by user');
            } catch (error) {
              console.error('Failed to clear logs:', error);
            }
          }
        }
      ]
    );
  };

  const copyLogs = async () => {
    try {
      await Clipboard.setStringAsync(logs);
      Alert.alert('Copied!', 'Logs copied to clipboard');
      await logger.info('Logs copied to clipboard by user');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy logs');
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Application Logs</Text>
          <View style={styles.buttons}>
            <TouchableOpacity onPress={copyLogs} style={styles.copyButton}>
              <Text style={styles.copyButtonText}>📋 Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView style={styles.logContainer}>
          {loading ? (
            <Text style={styles.loadingText}>Loading logs...</Text>
          ) : (
            <Text style={styles.logText}>{logs}</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    margin: 20,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttons: {
    flexDirection: 'row',
  },
  copyButton: {
    marginRight: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  clearButton: {
    marginRight: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff6b6b',
    borderRadius: 4,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4a90e2',
    borderRadius: 4,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  logContainer: {
    flex: 1,
    padding: 10,
  },
  loadingText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
  },
  logText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 16,
  },
});

export default LogViewer;