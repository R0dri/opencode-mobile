import React, { useMemo } from 'react';
import MessageEventList from './MessageEventList';
import { logger } from '@/shared/services/logger';

const filterLogger = logger.tag('SessionFilter');

const SessionMessageFilter = ({
  events,
  selectedSession,
  groupedUnclassifiedMessages = {},
  onClearError,
  allUnclassifiedMessages,
  isThinking,
  allMessages,
  onLoadOlderMessages,
  showMeta,
}) => {
  const filteredEvents = useMemo(() => {
    const filtered = [];

    events.forEach((event, index) => {
      if (typeof event.message === 'object' || event.payloadType === 'system-reminder') {
        filterLogger.debugCtx('MESSAGE_PROCESSING', 'Potentially problematic message', {
          index,
          type: event.type,
          category: event.category,
          payloadType: event.payloadType,
        });
      }

      if (selectedSession && event.sessionId && event.sessionId !== selectedSession.id) {
        return;
      }

      if (event.type === 'connection') {
        return;
      }

      if (event.category === 'internal') {
        return;
      }

      if (event.type === 'session_status') {
        return;
      }

      if (event.category === 'unclassified') {
        return;
      }

      filtered.push(event);
    });

    return filtered;
  }, [events, selectedSession]);

  const filteredUnclassified = useMemo(() => {
    const filtered = {};

    if (!groupedUnclassifiedMessages || typeof groupedUnclassifiedMessages !== 'object') {
      filterLogger.warn(
        'groupedUnclassifiedMessages is undefined or not an object',
        groupedUnclassifiedMessages,
      );
      return filtered;
    }

    Object.entries(groupedUnclassifiedMessages).forEach(([type, messages]) => {
      filtered[type] = messages.filter(message => {
        if (message.payloadType === 'session.status') {
          const statusType = message.rawData?.payload?.properties?.status?.type;
          return statusType !== 'busy' && statusType !== 'idle';
        }
        return true;
      });
    });

    return filtered;
  }, [groupedUnclassifiedMessages]);

  return (
    <MessageEventList
      events={filteredEvents}
      groupedUnclassifiedMessages={allUnclassifiedMessages || allMessages}
      error={null}
      onClearError={onClearError}
      isThinking={isThinking}
      onLoadOlderMessages={onLoadOlderMessages}
      showMeta={showMeta}
    />
  );
};

export default SessionMessageFilter;
