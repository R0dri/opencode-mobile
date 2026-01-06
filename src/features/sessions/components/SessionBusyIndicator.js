import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/components/ThemeProvider';
import { formatStatusText } from '../utils/sessionStatusUtils';

/**
 * SessionBusyIndicator component - Loading overlay visualization for busy state
 * @param {Object} props - Component props
 * @param {boolean} props.isBusy - Whether the session is busy
 */
const SessionBusyIndicator = React.memo(({ isBusy }) => {
  const theme = useTheme();

  if (!isBusy) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.text, { color: theme.colors.textPrimary }]}>{formatStatusText(false, true)}</Text>
        <View style={[styles.loader, { borderColor: theme.colors.accentPrimary, borderTopColor: 'transparent' }]} />
      </View>
    </View>
  );
});

SessionBusyIndicator.displayName = 'SessionBusyIndicator';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
  },
  loader: {
    width: 30,
    height: 30,
    borderWidth: 3,
    borderRadius: 15,
  },
});

export default SessionBusyIndicator;