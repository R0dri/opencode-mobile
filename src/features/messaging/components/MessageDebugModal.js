import React, { useCallback } from 'react';
import { View, Modal, Alert, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/components/ThemeProvider';

// Extracted hooks
import { useMessageCounts } from '../hooks/useMessageCounts';
import { useClipboard } from '../hooks/useClipboard';
import { useDebugTabs } from '../hooks/useDebugTabs';
import { useDebugState } from '../hooks/useDebugState';
import { useResizableDrawer } from '../hooks/useResizableDrawer';

// Extracted components
import GripHandle from './debug/GripHandle';
import DebugHeader from './debug/DebugHeader';
import DebugContent from './debug/DebugContent';

/**
 * MessageDebugModal component for displaying classified and unclassified messages
 * @param {Object} props - Component props
 * @param {Object} props.groupedUnclassifiedMessages - Grouped unclassified messages
 * @param {Object} props.allMessages - All messages grouped
 * @param {Array} props.events - Events array
 * @param {boolean} props.visible - Whether debug screen is visible
 * @param {Function} props.onClose - Function to close debug screen
 * @param {Function} props.onClearMessages - Optional clear messages callback
 */
const MessageDebugModal = ({
  groupedUnclassifiedMessages = {},
  allMessages = {},
  events = [],
  visible = false,
  onClose = () => {},
  onClearMessages, // New optional prop for clear button
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  // Use extracted hooks
  const stats = useMessageCounts(allMessages, groupedUnclassifiedMessages, events);
  const { copyToClipboard } = useClipboard();
  const { activeTab, setActiveTab } = useDebugTabs();
  const { expandedGroups, toggleGroup, resetState } = useDebugState();
  const {
    drawerHeight,
    isResizing,
    isWideScreen,
    onGestureEvent,
    onHandlerStateChange
  } = useResizableDrawer();

  // Map props to expected variables
  const groupedMessages = allMessages;
  const unclassifiedMessages = groupedUnclassifiedMessages;

  // Handle clear messages with confirmation
  const handleClearMessages = useCallback(() => {
    if (!onClearMessages) return;

    Alert.alert(
      'Clear Debug Messages',
      'This will clear all debug messages from the display. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            onClearMessages();
            resetState(); // Reset expanded groups and other state
            setActiveTab('classified'); // Reset to default tab
            Alert.alert('Cleared', 'All debug messages have been cleared.');
          }
        }
      ]
    );
  }, [onClearMessages, resetState, setActiveTab]);

  // Handle copying all debug data
  const handleCopyAllData = useCallback(() => {
    const allData = {
      timestamp: new Date().toISOString(),
      summary: {
        classified: {
          types: Object.keys(groupedMessages?.classified || {}).length,
          total: stats.totalClassifiedMessages,
        },
        unclassified: {
          types: Object.keys(unclassifiedMessages || {}).length,
          total: stats.totalUnclassifiedMessages,
        },
      },
      groupedMessages,
      unclassifiedMessages,
    };
    copyToClipboard(JSON.stringify(allData, null, 2), 'All debug data');
  }, [groupedMessages, unclassifiedMessages, stats, copyToClipboard]);

  if (!visible) return null;

  if (isWideScreen) {
    // Wide screen: Right sidebar
    return (
      <View style={[styles.rightSidebar, { height: drawerHeight }]}>
        <GripHandle
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        />

        <DebugHeader
          onClose={onClose}
          stats={stats}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onCopyAllData={handleCopyAllData}
          onClearMessages={onClearMessages ? handleClearMessages : null}
          groupedMessages={groupedMessages}
          unclassifiedMessages={unclassifiedMessages}
        />

        <DebugContent
          activeTab={activeTab}
          groupedMessages={groupedMessages}
          unclassifiedMessages={unclassifiedMessages}
          expandedGroups={expandedGroups}
          onToggleGroup={toggleGroup}
          onCopyMessage={copyToClipboard}
        />
      </View>
    );
  } else {
    // Mobile: Bottom sheet modal
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={[styles.container, { height: drawerHeight }]}>
            <GripHandle
              onGestureEvent={onGestureEvent}
              onHandlerStateChange={onHandlerStateChange}
            />

            <DebugHeader
              onClose={onClose}
              stats={stats}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onCopyAllData={handleCopyAllData}
              onClearMessages={onClearMessages ? handleClearMessages : null}
              groupedMessages={groupedMessages}
              unclassifiedMessages={unclassifiedMessages}
            />

            <DebugContent
              activeTab={activeTab}
              groupedMessages={groupedMessages}
              unclassifiedMessages={unclassifiedMessages}
              expandedGroups={expandedGroups}
              onToggleGroup={toggleGroup}
              onCopyMessage={copyToClipboard}
            />
          </View>
        </View>
      </Modal>
    );
  }
};

const getStyles = (theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  rightSidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 320,
    backgroundColor: theme.colors.background,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default MessageDebugModal;
