import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Keyboard, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EventScreen(props) {
  const [showLogs, setShowLogs] = useState(false);
  const [showInfoBar, setShowInfoBar] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  const [sessionModalVisible, setSessionModalVisible] = useState(true);

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
    todos,
    providers,
    selectedModel,
    modelsLoading,
    onModelSelect,
    loadModels,
    deleteSession,
    connectToEvents,
    disconnectFromEvents,
    selectProject,
    selectSession,
    refreshSession,
    createSession,
    clearError,
    sendMessage,
    todoDrawerExpanded,
    setTodoDrawerExpanded,
  } = props;
  




  return (
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
            selectedProject={selectedProject}
            selectedSession={selectedSession}
            onProjectPress={() => { selectProject(null); selectSession(null); }}
            onSessionPress={() => { selectSession(null); }}
            projectSessions={projectSessions}
            onSessionSelect={selectSession}
            onRefreshSession={refreshSession}
            onCreateSession={createSession}
            deleteSession={deleteSession}
            baseUrl={inputUrl.replace('/global/event', '')}
            isSessionBusy={isSessionBusy}
            groupedUnclassifiedMessages={groupedUnclassifiedMessages}
            onDebugPress={() => setDebugVisible(true)}
          />

          {/* <TodoDrawer todos={todos} expanded={todoDrawerExpanded} setExpanded={setTodoDrawerExpanded} /> */}

          {showInfoBar && (
            <InfoBar
              isConnected={isConnected}
              isConnecting={isConnecting}
              onReconnect={connectToEvents}
              onDisconnect={disconnectFromEvents}
              selectedProject={selectedProject}
              selectedSession={selectedSession}
              serverUrl={inputUrl}
              providers={providers}
              selectedModel={selectedModel}
              onModelSelect={onModelSelect}
              modelsLoading={modelsLoading}
              onFetchModels={loadModels}
              groupedUnclassifiedMessages={groupedUnclassifiedMessages}
              onDebugPress={() => setDebugVisible(true)}
              isSessionBusy={isSessionBusy}
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
            visible={isConnected && selectedProject && projectSessions.length > 0 && !selectedSession && sessionModalVisible}
            onSessionSelect={selectSession}
            onClose={() => setSessionModalVisible(false)}
            deleteSession={deleteSession}
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

      <DebugScreen
        unclassifiedMessages={groupedUnclassifiedMessages}
        visible={debugVisible}
        onClose={() => setDebugVisible(false)}
      />

      <SessionIndicator isThinking={isSessionBusy} />
    </SafeAreaView>
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

