import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { formatSessionTitle } from '../utils/sessionListUtils';
import { getColoredSessionSummary } from '@/shared/helpers/formatting';
import { useTheme } from '@/shared/components/ThemeProvider';
import { createStyles } from './styles';

/**
 * SessionItem component - Reusable item visualization for session lists
 * @param {Object} props - Component props
 * @param {Object} props.session - Session object
 * @param {boolean} props.isActive - Whether this session is currently active
 * @param {Object} props.status - Status information for the session
 * @param {Function} props.onSelect - Function called when session is selected
 * @param {Function} props.onDelete - Function called when session should be deleted
 * @param {boolean} props.isChild - Whether this is a child session (affects styling)
 * @param {boolean} props.isOrphaned - Whether this is an orphaned session
 * @param {boolean} props.isParent - Whether this is a parent session
 * @param {number} props.childrenCount - Number of children for parent sessions
 * @param {boolean} props.showDeleteButton - Whether to show the delete button
 */
const SessionItem = ({ session, isActive, status, onSelect, onDelete, isChild = false, isOrphaned = false, isParent = false, childrenCount = 0, showDeleteButton = false }) => {
  const theme = useTheme();
  const styles = createStyles(theme, { top: 0 }, 400); // Using dummy insets and width

  const handleDelete = () => {
    if (isParent && childrenCount > 0) {
      Alert.alert(
        'Delete Session',
        `Are you sure you want to delete "${formatSessionTitle(session)}" and its ${childrenCount} child session${childrenCount !== 1 ? 's' : ''}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete All',
            style: 'destructive',
            onPress: () => {
              // Parent delete function should handle both parent and children
              onDelete(session);
            }
          },
        ]
      );
    } else {
      Alert.alert(
        'Delete Session',
        `Are you sure you want to delete "${formatSessionTitle(session)}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete(session) },
        ]
      );
    }
  };

  const getStatusColor = () => {
    if (!status) return theme.colors.textMuted;

    switch (status.type || status) {
      case 'busy':
      case 'thinking':
        return theme.colors.warning;
      case 'idle':
      case 'ready':
        return theme.colors.success;
      default:
        return theme.colors.textMuted;
    }
  };

  return (
    <View style={[styles.sessionItem, isChild && styles.childSessionItem, isOrphaned && styles.orphanedSessionItem]}>
      <TouchableOpacity
        onPress={onSelect}
        style={[isChild ? styles.childSessionTouchable : styles.sessionTouchable, isActive && styles.activeSessionItem]}
        activeOpacity={0.7}
      >
        <View style={styles.sessionContent}>
          <View style={styles.sessionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.sessionTitle, isChild && styles.childSessionTitle, isActive && styles.activeSessionTitle]} numberOfLines={1} ellipsizeMode="tail">
                  {formatSessionTitle(session)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {getColoredSessionSummary(session, theme)}
                </View>
              </View>
              {isParent && childrenCount > 0 && (
                <Text style={styles.sessionCount}>
                  {childrenCount}
                </Text>
              )}
              <View style={styles.sessionMeta}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                <Text style={styles.sessionTime}>
                  {session.time?.updated ? new Date(session.time.updated).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : ''}
                </Text>
              </View>
              {showDeleteButton && (
                <TouchableOpacity
                  style={styles.compactDeleteButton}
                  onPress={handleDelete}
                  accessibilityLabel={`Delete session ${formatSessionTitle(session)}${isParent && childrenCount > 0 ? ` and ${childrenCount} children` : ''}`}
                  accessibilityRole="button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.compactDeleteIcon}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default SessionItem;