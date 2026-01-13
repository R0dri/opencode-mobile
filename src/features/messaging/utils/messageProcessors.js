/**
 * Message Pre-processors and Unified Processor
 *
 * Architecture for handling different message sources:
 * - SSE Preprocessor: Real-time messages from EventSource
 * - Historical Preprocessor: Messages loaded from /messages API
 * - Unified Processor: Merges both into display-ready format
 *
 * Usage:
 *   import { preprocessSSEMessage, preprocessHistoricalMessage, mergeMessages, formatMessageForDisplay } from '@/features/messaging/utils/messageProcessors';
 */
export { preprocessSSEMessage, preprocessSSEMessages } from './ssePreprocessor';
export {
  preprocessHistoricalMessage,
  preprocessHistoricalMessages,
  sortHistoricalMessagesByTime,
  groupHistoricalMessages,
  loadHistoricalMessages,
} from './historicalPreprocessor';
export {
  mergeMessages,
  formatMessageForDisplay,
  filterMessagesForDisplay,
  getMessageStatistics,
} from './unifiedMessageProcessor';
