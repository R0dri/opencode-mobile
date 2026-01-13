/**
 * Debug modal header component
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Close modal handler
 * @param {Object} props.stats - Statistics from useMessageCounts
 * @param {string} props.activeTab - Current active tab
 * @param {Function} props.onTabChange - Tab change handler
 * @param {Function} props.onCopyAllData - Export all data handler
 * @param {Function} props.onClearMessages - Clear messages handler (optional)
 * @param {Object} props.groupedMessages - Grouped messages object
 * @param {Object} props.unclassifiedMessages - Unclassified messages object
 * @param {boolean} props.showMetaHeaders - Whether to show meta headers
 * @param {Function} props.onToggleMetaHeaders - Toggle meta headers handler
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/shared/components/ThemeProvider';
import StatsRow from './StatsRow';
import TabSelector from './TabSelector';
import MetaToggle from './MetaToggle';

const DebugHeader = ({
  onClose,
  stats,
  activeTab,
  onTabChange,
  onCopyAllData,
  onClearMessages,
  groupedMessages,
  unclassifiedMessages,
  showMetaHeaders,
  onToggleMetaHeaders,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const hasMessages =
    (activeTab === 'classified'
      ? Object.keys(groupedMessages?.classified || {})
      : Object.keys(unclassifiedMessages || {})
    ).length > 0;

  return (
    <View style={styles.header}>
      {/* Top Row: Title and Close Button */}
      <View style={styles.headerTopRow}>
        <View style={styles.titleSection}>
          <Svg width="20" height="20" viewBox="0 0 24 24">
            <Path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="#856404" />
          </Svg>
          <Text style={styles.titleText}>Message Debug</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <StatsRow stats={stats} />

      {/* Tab Selector */}
      <TabSelector activeTab={activeTab} onTabChange={onTabChange} />

      {/* Meta Toggle */}
      <MetaToggle showMetaHeaders={showMetaHeaders} onToggleMetaHeaders={onToggleMetaHeaders} />

      {/* Action Buttons */}
      {hasMessages && (
        <View style={styles.actionRow}>
          {onClearMessages && (
            <TouchableOpacity style={styles.clearButton} onPress={onClearMessages}>
              <Text style={styles.clearButtonText}>🗑️ Clear Messages</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.copyAllButton} onPress={onCopyAllData}>
            <Text style={styles.copyAllButtonText}>📋 Export All Data</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const getStyles = theme =>
  StyleSheet.create({
    header: {
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    titleSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    titleText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.statusUnreachable,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButtonText: {
      color: theme.colors.background,
      fontSize: 16,
      fontWeight: 'bold',
    },
    actionRow: {
      flexDirection: 'row',
      marginTop: 8,
      gap: 8,
    },
    clearButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.colors.statusUnreachable,
      borderRadius: 8,
      alignItems: 'center',
      flex: 1,
    },
    clearButtonText: {
      color: theme.colors.background,
      fontSize: 14,
      fontWeight: '600',
    },
    copyAllButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.colors.statusConnecting,
      borderRadius: 8,
      alignItems: 'center',
      flex: 1,
    },
    copyAllButtonText: {
      color: theme.colors.background,
      fontSize: 14,
      fontWeight: '600',
    },
  });

export default DebugHeader;
