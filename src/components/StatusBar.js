import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';

/**
 * StatusBar component showing app title and connection status
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Whether SSE is connected
 * @param {boolean} props.isConnecting - Whether SSE is connecting
 * @param {boolean|null} props.isServerReachable - Whether server is reachable (null = not tested)
 */
const StatusBar = ({ isConnected, isConnecting, isServerReachable, showInfoBar, onToggleInfoBar }) => {
  return (
    <View style={styles.statusBar}>
      <Text style={styles.appTitle}>SSE Chat</Text>
      <View style={styles.rightContainer}>
        <TouchableOpacity
          style={styles.infoToggle}
          onPress={onToggleInfoBar}
        >
          <Text style={styles.infoToggleText}>{showInfoBar ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, {
            backgroundColor: isConnected ? '#4CAF50' :
                             isConnecting ? '#2196F3' :
                             isServerReachable === true ? '#FF9800' :  // Orange for server reachable but not connected
                             isServerReachable === false ? '#F44336' : '#9E9E9E' // Gray for not tested
          }]} />
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
          {isConnecting && <ActivityIndicator size="small" color="#333" style={styles.loadingIndicator} />}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statusBar: {
    backgroundColor: '#c0c0c0',
    paddingTop: Platform.OS === 'ios' ? 40 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#a0a0a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoToggleText: {
    fontSize: 16,
    color: '#333',
  },
  appTitle: {
    color: '#333',
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
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingIndicator: {
    marginLeft: 8,
  },

});



export default StatusBar;