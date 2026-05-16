// Centralized Configuration for CSS Selectors
// Update these if Google Messages Web changes its UI structure.

window.SMSForwarderConfig = {
  // Selectors for identifying the active conversation
  // Added generic h1, h2, span fallbacks and aria-labels
  // Selectors for identifying the active conversation
  // Focused on the main header area to avoid global "Messages" titles
  chatHeaderSelector: 'mws-conversation-header h2, .mws-conversation-header h2, h2[dir="auto"], .mws-contact-name', 
  
  // The main container that holds all messages in the active chat
  messageListSelector: 'mws-messages-list, [data-e2e-message-list]',
  
  // Selector for an individual message wrapper/container
  messageWrapperSelector: 'mws-message-wrapper, [data-e2e-message]',
  
  // Selector to identify incoming messages (vs outgoing)
  incomingMessageSelector: 'mws-message-wrapper:not(.outgoing):not([is-sender="true"]), [data-e2e-is-sender="false"]',
  
  // Selector for the actual text content of the message
  messageTextSelector: '.text-msg-content, mws-message-part [dir="auto"], [data-e2e-message-text]',
  
  // Selector for the timestamp or metadata element
  messageTimestampSelector: '.message-timestamp, [data-e2e-message-timestamp], .timestamp',
  
  // Selector to identify if a message is SMS/MMS vs RCS
  messageTypeIndicatorSelector: '.message-status, .metadata-text, mws-tooltip, [aria-label*="RCS"], [aria-label*="SMS"]',

  // Selectors for chat discovery and sidebar monitoring
  conversationListItemSelector: 'mws-conversation-list-item, [role="listitem"], a.list-item',
  activeConversationListItemSelector: 'a.selected, [aria-selected="true"].selected, mws-conversation-list-item[aria-selected="true"]',
  conversationNameSelector: '.name, [data-e2e-conversation-name], .conversation-name',
  unreadLineSelector: '.unread, .unread-count, [aria-label*="unread"]'
};
