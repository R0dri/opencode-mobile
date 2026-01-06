// Feature modules - centralized exports
export { useSSEConnection, useConnectionManager, useAppState } from './connection';
export { useCommands } from './commands';
export { useMessageProcessing, useEventManager } from './messaging';
export { useProjectManager } from './projects';
export { useModelManager } from './models';
export { useTodoManager } from './todos';
export { useNotificationManager } from './notifications';

// Commonly used utility functions moved to shared

export {
  sendMessageToSession,
  clearSession,
  hasActiveSession,
  setCurrentSession,
  deleteSession
} from './sessions/services/sessionService';