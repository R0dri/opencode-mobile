import React, { useMemo } from 'react';
import EventList from './EventList';

/**
 * Component that filters messages by session ID
 * @param {Object} props - Component props
 * @param {Array} props.events - Array of all events
 * @param {Object|null} props.selectedSession - Currently selected session
 * @param {Object} props.groupedUnclassifiedMessages - Grouped unclassified messages
 * @param {Function} props.onClearError - Function to clear errors
 */
const MessageFilter = ({
  events,
  selectedSession,
  groupedUnclassifiedMessages,
  onClearError,
  allUnclassifiedMessages, // Pass original unclassified messages for debug button
  isThinking
}) => {


  // Filter events by session ID
  const filteredEvents = useMemo(() => {
    console.log('Filtering events for session:', selectedSession?.id, 'total events:', events.length);
    const filtered = [];

    events.forEach(event => {
      // Filter by session ID if a session is selected
      if (selectedSession && event.sessionId && event.sessionId !== selectedSession.id) {
        console.log('Filtering out event from session:', event.sessionId);
        // Silently filter out messages from other sessions
        return; // Don't show messages from other sessions
      }

      // Don't show connection messages
      if (event.type === 'connection') {
        return;
      }

      // Don't show internal messages (session status is now handled by SessionStatusToggle)
      if (event.category === 'internal') {
        return;
      }

      // Don't show session status messages as regular messages (handled by indicator)
      if (event.type === 'session_status') {
        return;
      }

      // Don't show unclassified messages in main UI (only in debug screen)
      if (event.category === 'unclassified') {
        return;
      }

      filtered.push(event);
    });

    console.log('Filtered events count:', filtered.length);
    return filtered;
  }, [events, selectedSession]);

  // Filter unclassified messages (exclude session status that were handled)
  const filteredUnclassified = useMemo(() => {
    const filtered = {};

    Object.entries(groupedUnclassifiedMessages).forEach(([type, messages]) => {
      filtered[type] = messages.filter(message => {
        // Exclude session.status messages that are busy/idle (handled internally)
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
    <EventList
      events={filteredEvents}
      groupedUnclassifiedMessages={allUnclassifiedMessages} // Pass original for debug button
      error={null} // Handle errors separately
      onClearError={onClearError}
      isThinking={isThinking}
    />
  );
};

export default MessageFilter;