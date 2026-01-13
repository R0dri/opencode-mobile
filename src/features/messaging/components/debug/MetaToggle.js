import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/components/ThemeProvider';

const MetaToggle = ({ showMetaHeaders, onToggleMetaHeaders }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Show Meta</Text>
      <Switch
        value={showMetaHeaders}
        onValueChange={onToggleMetaHeaders}
        trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
        thumbColor={showMetaHeaders ? theme.colors.surface : theme.colors.surfaceSecondary}
        ios_backgroundColor={theme.colors.border}
      />
    </View>
  );
};

const getStyles = theme =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    label: {
      fontSize: 14,
      color: theme.colors.textPrimary,
      fontWeight: '500',
    },
  });

export default MetaToggle;
