import React, { useMemo, useState, useCallback } from 'react';
import { SectionList, StyleSheet, View, TouchableOpacity, Text, Alert } from 'react-native';
import { useTheme } from '@/shared/components/ThemeProvider';
import { groupSessionsByDateAndParent } from './utils';
import { createStyles } from './styles';
import { getColoredSessionSummary } from '@/shared/helpers/formatting';
import SectionHeader from './SectionHeader';
import SessionItem from './SessionItem';
import SkeletonItem from './SkeletonItem';

/**
 * SessionListDrawer component - Drawer-embedded visualization for session list
 * @param {Object} props - Component props
 * @param {Array} props.sessions - Array of sessions to display
 * @param {Object} props.selectedSession - Currently selected session
 * @param {Object} props.sessionStatuses - Status information for sessions
 * @param {boolean} props.sessionLoading - Whether sessions are loading
 * @param {Function} props.onSessionSelect - Function called when session is selected
 * @param {Function} props.deleteSession - Function called to delete a session
 * @param {Function} props.createSession - Function called to create a new session
 */
const SessionListDrawer = ({
  sessions = [],
  selectedSession,
  sessionStatuses = {},
  sessionLoading = false,
  onSessionSelect,
  deleteSession,
  createSession
}) => {
  const theme = useTheme();
  const styles = createStyles(theme, { top: 0 }, 400); // Using dummy insets and width

  const [editMode, setEditMode] = useState(false);
  const toggleEditMode = useCallback(() => setEditMode(prev => !prev), []);

  const sections = useMemo(() => {
    if (sessionLoading) return [];
    return groupSessionsByDateAndParent(sessions);
  }, [sessions, sessionLoading]);

  const renderParentSession = ({ parent, children }) => {
    const isActive = selectedSession && selectedSession.id === parent.id;
    const isBusy = sessionStatuses[parent.id]?.type === 'busy';
    const isParentBusy = children.some(child => sessionStatuses[child.id]?.type === 'busy') || isBusy;
    const shouldShowChildren = isActive; // Only show children when parent is selected

    return (
      <View>
        {/* Parent Row - now using SessionItem for consistency */}
        <SessionItem
          session={parent}
          isActive={isActive}
          status={sessionStatuses[parent.id]}
          onSelect={() => onSessionSelect(parent)}
          onDelete={() => handleDeleteParent(parent.id)}
          isParent={true}
          childrenCount={children.length}
          showDeleteButton={editMode}
        />

        {/* Child Rows - show when parent is selected */}
        {shouldShowChildren && children.map(child => (
          <SessionItem
            key={child.id}
            session={child}
            isActive={selectedSession?.id === child.id}
            status={sessionStatuses[child.id]}
            onSelect={() => onSessionSelect(child)}
            onDelete={() => deleteSession(child.id)}
            isChild={true}
            showDeleteButton={editMode}
          />
        ))}


      </View>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <SectionHeader
      title={section.title}
      hasInlineNewSession={section.title === 'Today'}
      onCreateSession={createSession}
      editMode={editMode}
      onToggleEditMode={toggleEditMode}
    />
  );

  const handleDeleteParent = (parentId) => {
    // Find the parent session object
    const parent = sections.flatMap(section => section.data).find(session => session.id === parentId);
    if (!parent) return;

    const childCount = parent.children?.length || 0;
    Alert.alert(
      'Delete Session',
      `Are you sure you want to delete "${parent.title || 'Untitled Session'}" and its ${childCount} child session${childCount !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            deleteSession(parentId);
            parent.children?.forEach(child => deleteSession(child.id));
          }
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    // Handle orphaned sessions
    if (item.isOrphaned) {
      return (
        <SessionItem
          session={{...item, title: `${item.title} [ORPHANED]`}}
          isActive={selectedSession?.id === item.id}
          status={sessionStatuses[item.id]}
          onSelect={() => onSessionSelect(item)}
          onDelete={() => deleteSession(item.id)}
          isOrphaned={true}
          showDeleteButton={editMode}
        />
      );
    }

    // Check if this item has children (is a parent)
    const hasChildren = item.children && item.children.length > 0;
    if (hasChildren) {
      return renderParentSession({ parent: item, children: item.children });
    }

    return (
      <SessionItem
        session={item}
        isActive={selectedSession?.id === item.id}
        status={sessionStatuses[item.id]}
        onSelect={() => onSessionSelect(item)}
        onDelete={() => deleteSession(item.id)}
        showDeleteButton={editMode}
      />
    );
  };

  if (sessionLoading) {
    return (
      <SectionList
        sections={[{ title: 'Loading', data: Array(5).fill({}) }]}
        keyExtractor={(item, index) => `skeleton-${index}`}
        renderItem={() => <SkeletonItem />}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.listContent}
      />
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.listContent}
    />
  );
};

export default SessionListDrawer;