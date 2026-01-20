/**
 * Session notification handler
 * 
 * Fetches the last assistant message from a session to form push notifications.
 * 
 * USAGE: Uncomment and integrate into main plugin when ready.
 * 
 * Integration example:
 * 
 * import { handleSessionNotification } from "./notification-handler";
 * 
 * export const PushNotificationPlugin: Plugin = async (ctx) => {
 *   return {
 *     event: async ({ event }) => {
 *       if (event.type === "chat.message") {
 *         await handleSessionNotification(ctx, event);
 *       }
 *     },
 *   };
 * };
 */

import type { PluginInput } from "@opencode-ai/plugin";
// import { createLogger } from "../../sdk-logger";
// 
// const logger = createLogger("NotificationHandler");

export interface AssistantMessageInfo {
  id: string;
  content: string;
  model: string;
  provider: string;
  created: string;
  tokens: {
    input: number;
    output: number;
    reasoning: number;
  };
  cost: number;
}

/**
 * Handle session notification - fetch last assistant message for context
 * 
 * This enables push notifications that include the assistant's response content,
 * allowing users to see what the AI said without opening the app.
 */
export async function handleSessionNotification(
  ctx: PluginInput,
  event: { sessionID: string; messageID?: string; type: string }
): Promise<AssistantMessageInfo | null> {
  // UNCOMMENT WHEN READY:
  // const client = (ctx as any).client;
  // if (!client) {
  //   logger.warn("No client available for session notification");
  //   return null;
  // }
  // 
  // try {
  //   const response = await client.Session.messages({
  //     path: { id: event.sessionID },
  //     query: { limit: 50 }
  //   });
  // 
  //   if (!response.data || response.data.length === 0) {
  //     logger.warn("No messages found in session");
  //     return null;
  //   }
  // 
  //   // Filter for assistant messages and get the last one
  //   const assistantMessages = response.data.filter(
  //     (msg: any) => msg.info.role === "assistant"
  //   );
  // 
  //   if (assistantMessages.length === 0) {
  //     logger.warn("No assistant messages found in session");
  //     return null;
  //   }
  // 
  //   const lastAssistant = assistantMessages[assistantMessages.length - 1];
  //   const info = lastAssistant.info as any;
  // 
  //   // Extract text content from parts
  //   const textContent = lastAssistant.parts
  //     .filter((part: any) => part.type === "text")
  //     .map((part: any) => part.text)
  //     .join("\n");
  // 
  //   const result: AssistantMessageInfo = {
  //     id: info.id,
  //     content: textContent.slice(0, 200) + (textContent.length > 200 ? "..." : ""),
  //     model: `${info.providerID}/${info.modelID}`,
  //     provider: info.providerID,
  //     created: new Date(info.time.created).toISOString(),
  //     tokens: info.tokens || { input: 0, output: 0, reasoning: 0 },
  //     cost: info.cost || 0,
  //   };
  // 
  //   logger.info("Retrieved last assistant message for notification", {
  //     messageID: result.id,
  //     model: result.model,
  //     contentPreview: result.content.slice(0, 50)
  //   });
  // 
  //   return result;
  // 
  // } catch (error) {
  //   logger.error("Failed to fetch assistant message for notification", error);
  //   return null;
  // }

  return null;
}

/**
 * Format assistant message for push notification
 * 
 * Creates a notification payload from the assistant message info.
 */
export function formatAssistantNotification(
  assistant: AssistantMessageInfo,
  sessionName?: string
): { title: string; body: string; data?: Record<string, string> } {
  const title = sessionName ? `Assistant (${sessionName})` : "Assistant Response";
  const body = `Model: ${assistant.model}\n${assistant.content}`;
  
  return {
    title,
    body: body.slice(0, 150) + (body.length > 150 ? "..." : ""),
    data: {
      type: "assistant_message",
      messageID: assistant.id,
      sessionID: assistant.id,
      model: assistant.model,
    },
  };
}

export default handleSessionNotification;
