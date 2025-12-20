/**
 * OpenCode API Types - Key types for session management and messaging
 * Based on OpenAPI specification
 */

/**
 * @typedef {Object} Session
 * @property {string} id - Unique session identifier (e.g., "202501181111-3519")
 * @property {string} projectID - Project identifier (UUID format)
 * @property {string} directory - Working directory path
 * @property {string} [parentID] - Parent session ID for conversation branches
 * @property {Object} [summary] - Session summary statistics
 * @property {number} summary.additions - Lines added to codebase
 * @property {number} summary.deletions - Lines deleted from codebase
 * @property {number} summary.files - Number of files changed
 * @property {Array<Object>} [summary.diffs] - File diff information
 * @property {Object} [share] - Sharing capabilities and URLs
 * @property {string} share.url - Shareable URL for session
 * @property {string} title - Human-readable session title
 * @property {string} version - Session version identifier
 * @property {Object} time - Timestamp information for lifecycle events
 * @property {number} time.created - Unix timestamp when session was created
 * @property {number} time.updated - Unix timestamp of last session update
 * @property {number} [time.compacting] - Unix timestamp when session was compacted
 * @property {Object} [revert] - Revert state management
 * @property {string} revert.messageID - Message ID to revert conversation to
 * @property {string} [revert.partID] - Specific part ID to revert to
 * @property {string} [revert.snapshot] - Snapshot ID to revert to
 * @property {string} [revert.diff] - Diff ID to revert to
 * 
 * @example
 * // Example session object:
 * {
 *   "id": "202501181111-3519",
 *   "projectID": "12345678-1234-1234-1234-123456789abc",
 *   "directory": "/Users/user/project",
 *   "title": "Implement user authentication",
 *   "version": "v1.0",
 *   "time": {
 *     "created": 1737184267000,
 *     "updated": 1737184569000
 *   },
 *   "summary": {
 *     "additions": 150,
 *     "deletions": 25,
 *     "files": 8
 *   }
 * }
 */

/**
 * @typedef {Object} Message
 * @property {string} id - Message ID
 * @property {string} sessionID - Session ID
 * @property {"user"|"assistant"} role - Message role
 * @property {Object} time - Timestamps
 * @property {number} time.created - Creation timestamp
 * @property {number} [time.completed] - Completion timestamp
 * @property {Object} [error] - Error information
 * @property {string} error.name - Error name
 * @property {*} error.data - Error data
 * @property {string} [parentID] - Parent message ID
 * @property {string} [modelID] - Model ID
 * @property {string} [providerID] - Provider ID
 * @property {string} [mode] - Mode
 * @property {Object} [path] - Path information
 * @property {string} path.cwd - Current working directory
 * @property {string} path.root - Root directory
 * @property {boolean} [summary] - Is summary message
 * @property {number} [cost] - Cost
 * @property {Object} [tokens] - Token usage
 * @property {number} tokens.input - Input tokens
 * @property {number} tokens.output - Output tokens
 * @property {number} tokens.reasoning - Reasoning tokens
 * @property {Object} tokens.cache - Cache tokens
 * @property {number} tokens.cache.read - Cache read tokens
 * @property {number} tokens.cache.write - Cache write tokens
 * @property {string} [finish] - Finish reason
 */

/**
 * @typedef {Object} Part
 * @property {string} id - Part ID
 * @property {string} sessionID - Session ID
 * @property {string} messageID - Message ID
 * @property {"text"|"file"|"tool"|"reasoning"|"step-start"|"step-finish"|"snapshot"|"patch"|"agent"|"retry"|"compaction"|"subtask"} type - Part type
 */

/**
 * @typedef {Object} TextPartInput
 * @property {string} [id] - Part ID
 * @property {"text"} type - Part type
 * @property {string} text - Text content
 * @property {boolean} [synthetic] - Is synthetic
 * @property {boolean} [ignored] - Is ignored
 * @property {Object} [time] - Timestamps
 * @property {number} time.start - Start timestamp
 * @property {number} [time.end] - End timestamp
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} FilePartInput
 * @property {string} [id] - Part ID
 * @property {"file"} type - Part type
 * @property {string} mime - MIME type
 * @property {string} [filename] - Filename
 * @property {string} url - File URL
 * @property {Object} [source] - Source information
 */

/**
 * @typedef {Object} AgentPartInput
 * @property {string} [id] - Part ID
 * @property {"agent"} type - Part type
 * @property {string} name - Agent name
 * @property {Object} [source] - Source information
 */

/**
 * @typedef {Object} SubtaskPartInput
 * @property {string} [id] - Part ID
 * @property {"subtask"} type - Part type
 * @property {string} prompt - Subtask prompt
 * @property {string} description - Subtask description
 * @property {string} agent - Agent name
 */

/**
 * @typedef {Object} Event
 * @property {string} type - Event type
 * @property {Object} properties - Event properties
 */

/**
 * @typedef {Object} GlobalEvent
 * @property {string} directory - Directory
 * @property {Event} payload - Event payload
 */

/**
 * @typedef {Object} SessionCreateRequest
 * @property {string} [parentID] - Parent session ID
 * @property {string} [title] - Session title
 */

/**
 * @typedef {Object} SessionMessageRequest
 * @property {string} [messageID] - Message ID
 * @property {Object} [model] - Model information
 * @property {string} model.providerID - Provider ID
 * @property {string} model.modelID - Model ID
 * @property {string} [agent] - Agent name
 * @property {boolean} [noReply] - Don't reply
 * @property {string} [system] - System message
 * @property {Object} [tools] - Tool settings
 * @property {Array<TextPartInput|FilePartInput|AgentPartInput|SubtaskPartInput>} parts - Message parts
 */

/**
 * @typedef {Object} SessionMessageResponse
 * @property {Message} info - Message information
 * @property {Array<Part>} parts - Message parts
 */

// Export empty object to make this a valid module
export {};