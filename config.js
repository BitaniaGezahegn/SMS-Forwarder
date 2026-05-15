// Centralized Configuration for CSS Selectors
// Update these if Google Messages Web changes its UI structure.

window.SMSForwarderConfig = {
  // Selectors for identifying the active conversation
  // Added generic h1, h2, span fallbacks and aria-labels
  chatHeaderSelector: 'mws-conversation-header .name, [data-e2e-conversation-name], .conversation-title, .mws-top-bar .title, mws-top-bar .title, h3, h2, h1, [aria-label="Conversation Title"], mws-conversation-header span', 
  
  // The main container that holds all messages in the active chat
  messageListSelector: 'mws-messages-list, .msg-list, [data-e2e-message-list], .message-list-container',
  
  // Selector for an individual message wrapper/container
  // Adding [data-e2e-message] and generic bubble classes
  messageWrapperSelector: 'mws-message-wrapper, .message-bubble, [data-e2e-message], .msg-container',
  
  // Selector to identify incoming messages (vs outgoing)
  // We check for absence of typical outgoing flags, or presence of incoming flags
  incomingMessageSelector: 'mws-message-wrapper:not(.outgoing):not([is-sender="true"]):not([class*="sent"]), .message-bubble:not(.outgoing):not([is-sender="true"]), [data-e2e-is-sender="false"]',

  // Selector for the actual text content of the message
  // Adding generic [dir="auto"] which Google uses heavily for text
  messageTextSelector: '.text-msg-content, .message-text, mws-message-part [dir="auto"], [data-e2e-message-text], div[dir="auto"]',
  
  // Selector for the timestamp or metadata element (useful for deduplication hashing)
  messageTimestampSelector: '.message-timestamp, [data-e2e-message-timestamp], .timestamp, time, mws-tooltip, .status-text, [aria-label*=" AM"], [aria-label*=" PM"]',
  
  // Selector to identify if a message is SMS/MMS vs RCS
  messageTypeIndicatorSelector: '.message-status, .metadata-text, mws-tooltip, [aria-label*="RCS"], [aria-label*="SMS"]'
};
