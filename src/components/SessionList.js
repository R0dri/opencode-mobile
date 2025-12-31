import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { getSessionSummaryText, formatSessionDate } from '../features';

/**
 * SessionList component for displaying project sessions as a clickable list
 * @param {Object} props - Component props
 * @param {Array<import('../shared/types/opencode.types.js').Session>} props.sessions - Array of sessions to display
 * @param {boolean} props.visible - Whether the modal is visible
 * @param {Function} props.onSessionSelect - Function called when a session is selected
 * @param {Function} props.onClose - Function called when modal is closed
 * @param {Function} props.deleteSession - Function to delete a session
 */
const SessionList = ({ sessions, visible, onSessionSelect, onClose, deleteSession }) => {
  const handleSessionSelect = (session) => {
    onSessionSelect(session);
    onClose();
  };

  const handleDeleteSession = (session) => {
    Alert.alert(
      'Delete Session',
      `Are you sure you want to delete "${session.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession(session.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete session. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Sort sessions by updated time (most recent first), fallback to created time
  const sortedSessions = [...sessions].sort((a, b) => {
    const aTime = a.time?.updated || a.time?.created || 0;
    const bTime = b.time?.updated || b.time?.created || 0;
    return bTime - aTime;
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalView}>
          <Text style={styles.title}>Select a Session</Text>
          <Text style={styles.subtitle}>Choose a session to start chatting</Text>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {sortedSessions.map((session) => (
              <View key={session.id} style={styles.sessionItem}>
                <TouchableOpacity
                  style={styles.sessionContent}
                  onPress={() => handleSessionSelect(session)}
                  activeOpacity={0.7}
                >
                 <View style={styles.sessionHeader}>
                   <Text style={styles.sessionTitle} numberOfLines={2}>
                     {session.title}
                   </Text>
                 </View>

                  <View style={styles.sessionMeta}>
                    <Text style={styles.sessionTime}>
                      {formatSessionDate(session.time.updated)}
                    </Text>
                    {session.summary && (
                      <Text style={styles.sessionSummary}>
                        {getSessionSummaryText(session)}
                      </Text>
                    )}
                  </View>

                 {session.parentID && (
                   <View style={styles.parentIndicator}>
                     <Text style={styles.parentText}>↳ Child session</Text>
                   </View>
                 )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteSession(session)}
                >
                  <Svg width="16" height="16" viewBox="0 0 24 24" style={styles.deleteIcon}>
                    <Path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#f44336" />
                  </Svg>
                </TouchableOpacity>
              </View>
            ))}

            {sortedSessions.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No sessions found for this project</Text>
                <Text style={styles.emptySubtext}>Try selecting a different project</Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollView: {
    maxHeight: 400,
  },
  sessionItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    position: 'relative',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sessionContent: {
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteIcon: {
    // SVG styles handled inline
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  sessionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  sessionTime: {
    fontSize: 12,
    color: '#999',
  },
  sessionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  sessionSummary: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
  },
  parentIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  parentText: {
    fontSize: 10,
    color: '#6c757d',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SessionList;