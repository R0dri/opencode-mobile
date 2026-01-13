import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/components/ThemeProvider';

/**
 * LogModal - Application logs viewer
 */
const LogModal = ({ visible, onClose }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  // Placeholder for logs - in a real implementation, this would come from a logging service
  const logs = [
    { id: 1, level: 'INFO', message: 'Application started', timestamp: new Date().toISOString() },
    { id: 2, level: 'INFO', message: 'Connected to server', timestamp: new Date().toISOString() },
    { id: 3, level: 'WARN', message: 'Slow network detected', timestamp: new Date().toISOString() },
  ];

  const getLogLevelColor = level => {
    switch (level) {
      case 'ERROR':
        return theme.colors.error;
      case 'WARN':
        return theme.colors.warning;
      case 'INFO':
        return theme.colors.info;
      case 'DEBUG':
        return theme.colors.textSecondary;
      default:
        return theme.colors.textPrimary;
    }
  };

  const renderLogItem = log => (
    <View key={log.id} style={styles.logItem}>
      <View style={styles.logHeader}>
        <Text style={[styles.logLevel, { color: getLogLevelColor(log.level) }]}>{log.level}</Text>
        <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
      </View>
      <Text style={styles.logMessage}>{log.message}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={true}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.colors.glassBackground || 'rgba(0,0,0,0.5)' },
        ]}
      />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Application Logs</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {logs.length > 0 ? (
            logs.map(renderLogItem)
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No logs available</Text>
              <Text style={styles.emptySubtext}>Application logs will appear here</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const getStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.glassBackground || 'rgba(255, 255, 255, 0.9)',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.glassBorder || theme.colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
    },
    closeButton: {
      fontSize: 18,
      color: theme.colors.textSecondary,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    logItem: {
      backgroundColor: theme.colors.glassSurface || theme.colors.surface,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.glassBorder || 'transparent',
    },
    logHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    logLevel: {
      fontSize: 12,
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    logTime: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    logMessage: {
      fontSize: 14,
      color: theme.colors.textPrimary,
      fontFamily: 'monospace',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
  });

export default LogModal;
