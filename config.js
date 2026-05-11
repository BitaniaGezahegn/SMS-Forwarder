// Centralized Configuration for CSS Selectors
// Update these if Google Messages Web changes its UI structure.

window.SMSForwarderConfig = {
  // Selectors for identifying the active conversation
  // The header element containing the contact's name/number.
  chatHeaderSelector: 'mws-conversation-header .name, [data-e2e-conversation-name], .conversation-title, .mws-top-bar .title, mws-top-bar .title, h3', 
  
  // The main container that holds all messages in the active chat
  messageListSelector: 'mws-messages-list, .msg-list',
  
  // Selector for an individual message wrapper/container
  messageWrapperSelector: 'mws-message-wrapper',
  
  // Selector to identify incoming messages (vs outgoing)
  // Usually, Google Messages has a class like 'incoming' or 'received' or a specific attribute.
  // Alternatively, we can check for the absence of 'outgoing' / 'sent'.
  incomingMessageSelector: 'mws-message-wrapper:not(.outgoing):not([is-sender="true"])',

  // Selector for the actual text content of the message
  messageTextSelector: '.text-msg-content, .message-text, mws-message-part [dir="auto"]',
  
  // Selector for the timestamp or metadata element (useful for deduplication hashing)
  messageTimestampSelector: '.message-timestamp, [data-e2e-message-timestamp], .timestamp, time, mws-tooltip, .status-text, [aria-label*=" AM"], [aria-label*=" PM"]',
  
  // Selector to identify if a message is SMS/MMS vs RCS
  // This can be tricky. Often, the metadata or an icon indicates "SMS" or "RCS".
  // Alternatively, we can look at the input box placeholder "Text message" vs "Chat message".
  messageTypeIndicatorSelector: '.message-status, .metadata-text, mws-tooltip'
};
