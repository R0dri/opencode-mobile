/**
 * @fileoverview Error boundary for SessionDrawer components
 * Provides graceful failure handling and debugging information
 */
import React from 'react';
import { View, Text } from 'react-native';

/**
 * Error boundary component for drawer components
 */
class SessionDrawerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SessionDrawer Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#ffebee',
          padding: 20
        }}>
          <Text style={{
            color: '#d32f2f',
            fontSize: 16,
            textAlign: 'center',
            marginBottom: 10
          }}>
            Session Drawer Error
          </Text>
          <Text style={{
            color: '#d32f2f',
            fontSize: 12,
            textAlign: 'center'
          }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default SessionDrawerErrorBoundary;