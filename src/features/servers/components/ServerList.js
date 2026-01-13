import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '@/shared/components/ThemeProvider';
import { ServerStatusEnum } from '../types/server.types';

const ServerItem = ({ server, onPress, onDelete, isSelected }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const getStatusColor = () => {
    switch (server.status) {
      case ServerStatusEnum.CONNECTED:
        return theme.colors.statusConnected;
      case ServerStatusEnum.CONNECTING:
        return theme.colors.statusConnecting;
      case ServerStatusEnum.ERROR:
        return theme.colors.statusUnreachable;
      default:
        return theme.colors.statusUnknown;
    }
  };

  const formatLastConnected = () => {
    if (!server.lastConnected) return 'Never connected';
    const date = new Date(server.lastConnected);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <TouchableOpacity
      onPress={() => onPress(server)}
      style={[styles.item, isSelected && styles.itemSelected]}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <View style={styles.itemContent}>
          <Text style={styles.itemName} numberOfLines={1}>
            {server.name}
          </Text>
          <Text style={styles.itemUrl} numberOfLines={1}>
            {server.url}
          </Text>
          <Text style={styles.itemMeta}>{formatLastConnected()}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => onDelete(server.id)} style={styles.deleteButton}>
        <Text style={styles.deleteButtonText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const ServerList = ({ servers, onServerSelect, onDeleteServer, selectedServerUrl }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  if (servers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No saved servers</Text>
        <Text style={styles.emptySubtext}>Add a server URL to connect</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={servers}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <ServerItem
          server={item}
          onPress={onServerSelect}
          onDelete={onDeleteServer}
          isSelected={item.url === selectedServerUrl}
        />
      )}
      contentContainerStyle={styles.listContent}
      style={styles.list}
    />
  );
};

const getStyles = theme =>
  StyleSheet.create({
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 12,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      marginVertical: 4,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    itemSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent + '15',
    },
    itemLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 12,
    },
    itemContent: {
      flex: 1,
    },
    itemName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    itemUrl: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    itemMeta: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    deleteButton: {
      padding: 8,
      marginLeft: 8,
    },
    deleteButtonText: {
      fontSize: 16,
      color: theme.colors.textMuted,
    },
  });

export default ServerList;
