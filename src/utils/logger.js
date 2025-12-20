import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Logging disabled for now

class Logger {
  constructor() {
    // Disable file logging for now
    this.isFileSystemAvailable = false;
  }

  async initializeLog() {
    // Logging disabled
  }

  async writeLog(level, message, data = null) {
    // Logging disabled - do nothing
  }

  async rotateLog() {
    // Logging disabled
  }

  async getLogs(lines = 100) {
    return 'Logging disabled.';
  }

  async clearLogs() {
    // Logging disabled
  }

  // Convenience methods - disabled
  async info(message, data) { }
  async warn(message, data) { }
  async error(message, data) { }
  async debug(message, data) { }

  // Log app events - disabled
  async logAppStart() { }
  async logScreenView(screenName, params = {}) { }
  async logUserAction(action, details = {}) { }
  async logNetworkRequest(url, method, status, duration) { }
  async logError(error, context = {}) { }
}

export default new Logger();