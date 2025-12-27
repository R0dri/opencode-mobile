import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity, Modal, FlatList, Dimensions, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import SessionStatusToggle from './SessionStatusToggle';
import BreadcrumbSlider from './BreadcrumbSlider';

/**
 * StatusBar component showing app title and connection status
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Whether SSE is connected
 * @param {boolean} props.isConnecting - Whether SSE is connecting
 * @param {boolean|null} props.isServerReachable - Whether server is reachable (null = not tested)
 * @param {import('../utils/opencode-types.js').Project|null} props.selectedProject - Currently selected project
 * @param {import('../utils/opencode-types.js').Session|null} props.selectedSession - Currently selected session
 * @param {Function} props.onProjectPress - Function called when project breadcrumb is pressed
 * @param {Function} props.onSessionPress - Function called when session breadcrumb is pressed
 */
const StatusBar = ({
  isConnected,
  isConnecting,
  isServerReachable,
  showInfoBar,
  onToggleInfoBar,
  selectedProject,
  selectedSession,
  onProjectPress,
  onSessionPress,
  projectSessions,
  onSessionSelect,
  onRefreshSession,
  onCreateSession,
  deleteSession,
  baseUrl,
  isSessionBusy,
  groupedUnclassifiedMessages,
  onDebugPress
}) => {
  const navigation = useNavigation();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [showConnectedText, setShowConnectedText] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isConnected && showConnectedText) {
      const timer = setTimeout(() => {
        setShowConnectedText(false);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (!isConnected) {
      setShowConnectedText(true);
    }
  }, [isConnected, showConnectedText]);

  const truncateTitle = (title, maxLength = 20) => {
    if (!title) return 'SSE Chat';
    return title.length > maxLength ? title.slice(0, maxLength) + '...' : title;
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const handleCreateSession = async () => {
    if (creating) return;
    setCreating(true);
    try {
      await onCreateSession();
      setDropdownVisible(false);
    } catch (error) {
      console.error('Create session failed:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleSessionSelect = (session) => {
    onSessionSelect(session);
    setDropdownVisible(false);
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
              setDropdownVisible(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete session. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderSessionItem = ({ item }) => {
    if (item.type === 'create') {
      return (
        <TouchableOpacity
          style={[styles.sessionItem, styles.createItem]}
          onPress={handleCreateSession}
          disabled={creating}
        >
          <View style={styles.sessionInfo}>
            <Text style={styles.createTitle}>
              {creating ? 'Creating...' : '➕ Create New Session'}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    const isActive = selectedSession && selectedSession.id === item.id;
    return (
      <View style={[styles.sessionItem, isActive && styles.activeSessionItem]}>
        <TouchableOpacity
          style={styles.sessionContent}
          onPress={() => handleSessionSelect(item)}
        >
          <View style={styles.sessionInfo}>
            <Text style={[styles.sessionTitle, isActive && styles.activeSessionTitle]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.sessionMeta}>
              ID: {item.id.slice(0, 8)}... • {new Date(item.time.updated).toLocaleDateString()}
            </Text>
          </View>
          {isActive && (
            <Svg width="16" height="16" viewBox="0 0 24 24" style={styles.activeIndicator}>
              <Path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#1976d2" />
            </Svg>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteSession(item)}
        >
          <Svg width="16" height="16" viewBox="0 0 24 24" style={styles.deleteIcon}>
            <Path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#f44336" />
          </Svg>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.statusBar}>
      {/* Top Row: Status and Controls */}
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.statusContainer} onPress={onToggleInfoBar}>
          <View style={[styles.statusDot, {
            backgroundColor: isConnected ? '#4CAF50' :
                           isConnecting ? '#2196F3' :
                           isServerReachable === true ? '#FF9800' :  // Orange for server reachable but not connected
                           isServerReachable === false ? '#F44336' : '#9E9E9E' // Gray for not tested
          }]} />
          {(showConnectedText || !isConnected) && (
            <Text style={[styles.statusText, {
              color: isConnected ? '#4CAF50' :
                    isConnecting ? '#2196F3' :
                    isServerReachable === true ? '#FF9800' :
                    isServerReachable === false ? '#F44336' : '#9E9E9E'
            }]}>
              {isConnected ? 'Connected' :
               isConnecting ? 'Connecting...' :
               isServerReachable === true ? 'Server Ready' :
               isServerReachable === false ? 'Server Unreachable' :
               'Checking...'}
            </Text>
          )}

          {isConnecting && <ActivityIndicator size="small" color="#333333" style={styles.loadingIndicator} />}
        </TouchableOpacity>

        <View style={styles.topControls}>
          <TouchableOpacity style={styles.menuButton} onPress={() => navigation.openDrawer()}>
            <Svg width="16" height="16" viewBox="0 0 24 24">
              <Path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="#666666" />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton} onPress={onToggleInfoBar}>
            <Svg width="16" height="16" viewBox="0 0 24 24">
              <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="#666666" />
            </Svg>
          </TouchableOpacity>

          <TouchableOpacity style={styles.debugButton} onPress={onDebugPress}>
            <Svg width="16" height="16" viewBox="0 0 24 24">
              <Path d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5s-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z" fill="#666666" />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      {/* Middle Row: Breadcrumb */}
      <View style={styles.middleRow}>
        <BreadcrumbSlider
          selectedProject={selectedProject}
          selectedSession={selectedSession}
          onProjectPress={onProjectPress}
          onSessionPress={onSessionPress}
        />
      </View>

      {/* Bottom Row: Session Title and Actions */}
      <View style={styles.bottomRow}>
        <TouchableOpacity style={styles.titleContainer} onPress={toggleDropdown}>
          <Text style={styles.appTitle} numberOfLines={1}>{truncateTitle(selectedSession?.title)}</Text>
          <Svg width="12" height="12" viewBox="0 0 24 24" style={styles.dropdownArrow}>
            <Path d={dropdownVisible ? "M7 10l5 5 5-5z" : "M10 7l5 5-5 5z"} fill="#666666" />
          </Svg>
        </TouchableOpacity>

        <View style={styles.rightContainer}>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefreshSession}>
            <Svg width="16" height="16" viewBox="0 0 24 24">
              <Path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </TouchableOpacity>

          <SessionStatusToggle isBusy={isSessionBusy} />
        </View>
      </View>

      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdownContainer}>
            <FlatList
              data={[{ id: 'create', type: 'create' }, ...projectSessions]}
              keyExtractor={(item) => item.id}
              renderItem={renderSessionItem}
              showsVerticalScrollIndicator={false}
              style={styles.sessionList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  statusBar: {
    backgroundColor: '#ffffff',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: 'column',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoToggle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoToggleText: {
    fontSize: 18,
    color: '#666666',
  },
  appTitle: {
    color: '#333333',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dropdownArrow: {
    marginLeft: 4,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'flex-start',
    paddingTop: 60, // Below status bar
  },
  dropdownContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 8,
    maxHeight: 300,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  sessionList: {
    maxHeight: 300,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sessionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteIcon: {
    marginLeft: 8,
  },
  activeSessionItem: {
    backgroundColor: '#e3f2fd',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  activeSessionTitle: {
    color: '#1976d2',
    fontWeight: '600',
  },
  sessionMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activeIndicator: {
    marginRight: 8,
  },
  createItem: {
    backgroundColor: '#e8f5e8',
    borderBottomWidth: 1,
    borderBottomColor: '#4caf50',
  },
  createTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
  },
  menuButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },


});



export default StatusBar;