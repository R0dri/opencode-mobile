/**
 * @fileoverview Bottom action bar for SessionDrawer
 * Contains settings, meta toggle, and debug buttons moved from StatusBar
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/components/ThemeProvider';
import Svg, { Path } from 'react-native-svg';

/**
 * DrawerBottomBar component - Bottom action bar for persistent sidebar
 * Contains settings, meta toggle, and debug buttons
 * @param {Object} props - Component props
 * @param {Function} props.onToggleInfoBar - Function called when settings button is pressed
 * @param {Function} props.onDebugPress - Function called when debug button is pressed
 * @param {boolean} props.showMeta - Whether meta headers are shown
 * @param {Function} props.onToggleMeta - Function called when meta toggle is pressed
 */
const DrawerBottomBar = ({ onToggleInfoBar, onDebugPress, showMeta, onToggleMeta }) => {
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    leftSpacer: {
      width: 24,
    },
    buttonRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    settingsButton: {
      padding: 8,
      marginRight: 4,
    },
    metaButton: {
      padding: 8,
      marginRight: 4,
    },
    metaButtonActive: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 6,
    },
    debugButton: {
      padding: 8,
    },
  });

  return (
    <View style={styles.container}>
      {/* Left spacer for visual balance */}
      <View style={styles.leftSpacer} />

      {/* Action buttons centered */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.settingsButton} onPress={onToggleInfoBar}>
          <Svg width="16" height="16" viewBox="0 0 24 24">
            <Path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
              fill={theme.colors.textSecondary}
            />
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.metaButton, showMeta && styles.metaButtonActive]}
          onPress={onToggleMeta}
        >
          <Svg width="16" height="16" viewBox="0 0 24 24">
            <Path
              d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
              fill={showMeta ? theme.colors.accent : theme.colors.textSecondary}
            />
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity style={styles.debugButton} onPress={onDebugPress}>
          <Svg width="16" height="16" viewBox="0 0 24 24">
            <Path
              d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5s-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z"
              fill={theme.colors.textSecondary}
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Right spacer for visual balance */}
      <View style={styles.leftSpacer} />
    </View>
  );
};

export default DrawerBottomBar;
