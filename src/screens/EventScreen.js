import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Keyboard, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
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
  const [showInfoBar, setShowInfoBar] = useState(false);

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
    createSession,
    clearError,
    sendMessage,
  } = useSSE();
  




  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <View style={{ flex: 1 }}>
            <StatusBar
              isConnected={isConnected}
              isConnecting={isConnecting}
              isServerReachable={isServerReachable}
              showInfoBar={showInfoBar}
              onToggleInfoBar={() => setShowInfoBar(!showInfoBar)}
              projectSessions={projectSessions}
              selectedSession={selectedSession}
              onSessionSelect={selectSession}
              onCreateSession={createSession}
              baseUrl={inputUrl.replace('/global/event', '')}
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

            <MessageFilter
              events={events}
              selectedSession={selectedSession}
              groupedUnclassifiedMessages={groupedUnclassifiedMessages}
              onClearError={clearError}
              allUnclassifiedMessages={groupedUnclassifiedMessages}
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

            <URLInput
              inputUrl={inputUrl}
              onUrlChange={setInputUrl}
              onConnect={connectToEvents}
              onSendMessage={(text, mode) => sendMessage(text, mode)}
              isConnecting={isConnecting}
              isConnected={isConnected}
              isServerReachable={isServerReachable}
            />
          </View>
        </KeyboardAvoidingView>

        <LogViewer
          visible={showLogs}
          onClose={() => setShowLogs(false)}
        />
      </SafeAreaView>

      <View style={[styles.overlayContainer, { bottom: 70 }]}>
        <SessionStatusToggle isBusy={isSessionBusy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  touchableArea: {
    // Area for keyboard dismiss
  },
  overlayContainer: {
    alignItems: 'center',
    pointerEvents: 'none',
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

