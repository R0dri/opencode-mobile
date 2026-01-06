import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/components/ThemeProvider';

const SkeletonItem = React.memo(() => {
  const theme = useTheme();

  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.avatar} />
      <View style={styles.content}>
        <View style={styles.title} />
        <View style={styles.subtitle} />
      </View>
    </View>
  );
});

SkeletonItem.displayName = 'SkeletonItem';

const getStyles = (theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.surface,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  content: {
    flex: 1,
  },
  title: {
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  subtitle: {
    height: 12,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceSecondary,
  },
});

export default SkeletonItem;