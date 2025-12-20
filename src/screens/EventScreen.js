import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useSSE } from '../hooks/useSSE';
import StatusBar from '../components/StatusBar';
import InfoBar from '../components/InfoBar';
import MessageFilter from '../components/MessageFilter';
import SessionStatusToggle from '../components/SessionStatusToggle';
import URLInput from '../components/URLInput';
import ProjectList from '../components/ProjectList';
import SessionList from '../components/SessionList';
import LogViewer from '../components/LogViewer';

export default function EventScreen() {
  const [showLogs, setShowLogs] = useState(false);
  const [showInfoBar, setShowInfoBar] = useState(true);
  
  const {
    events,
    groupedUnclassifiedMessages,
    isConnected,
    isConnecting,
    isServerReachable,
    error,
    inputUrl,
    setInputUrl,
    projects,
    projectSessions,
    selectedProject,
    selectedSession,
    isSessionBusy,
    connectToEvents,
    disconnectFromEvents,
    selectProject,
    selectSession,
    clearError,
    sendMessage,
  } = useSSE();
  




  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <StatusBar
          isConnected={isConnected}
          isConnecting={isConnecting}
          isServerReachable={isServerReachable}
          showInfoBar={showInfoBar}
          onToggleInfoBar={() => setShowInfoBar(!showInfoBar)}
        />

        {showInfoBar && (
          <InfoBar
            isConnected={isConnected}
            isConnecting={isConnecting}
            onReconnect={connectToEvents}
            onDisconnect={disconnectFromEvents}
            selectedProject={selectedProject}
            selectedSession={selectedSession}
            serverUrl={inputUrl}
          />
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={styles.errorClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <MessageFilter
          events={events}
          selectedSession={selectedSession}
          groupedUnclassifiedMessages={groupedUnclassifiedMessages}
          allUnclassifiedMessages={groupedUnclassifiedMessages}
          onClearError={clearError}
        />

        <ProjectList
          projects={projects}
          visible={projects.length > 0 && !selectedProject}
          onProjectSelect={selectProject}
          onClose={() => {}}
        />

        <SessionList
          sessions={projectSessions}
          visible={isConnected && selectedProject && projectSessions.length > 0 && !selectedSession}
          onSessionSelect={selectSession}
          onClose={() => {}}
        />

        <SessionStatusToggle isBusy={isSessionBusy} />

        <URLInput
          inputUrl={inputUrl}
          onUrlChange={setInputUrl}
          onConnect={connectToEvents}
          onSendMessage={sendMessage}
          isConnecting={isConnecting}
          isConnected={isConnected}
          isServerReachable={isServerReachable}
        />

      </KeyboardAvoidingView>

      <LogViewer
        visible={showLogs}
        onClose={() => setShowLogs(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  errorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    flex: 1,
  },
  errorClose: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

