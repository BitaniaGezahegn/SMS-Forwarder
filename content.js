// content.js - Injected into Google Messages Web

console.log("SMS Forwarder content script loaded.");

let targetContact = null;
let originalTargetContact = null;
let recentMessageHashes = new Set();
let observer = null;
let isReady = false;

// Read config from injected window object (from config.js)
const Selectors = window.SMSForwarderConfig;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "BATCH_FORWARD_FROM_TX") {
    handleBatchForward(request.txId, sendResponse);
    return true; // keep alive for async
  }
});

function handleBatchForward(targetTxId, sendResponse) {
  console.log(`[DEBUG] Received manual batch forward request starting from TX: ${targetTxId}`);
  const wrappers = Array.from(document.querySelectorAll(Selectors.messageWrapperSelector));
  const tempForwardList = [];
  let found = false;

  // Search backwards (most recent to older)
  for (let i = wrappers.length - 1; i >= 0; i--) {
     const msgEl = wrappers[i];
     const textEl = msgEl.querySelector(Selectors.messageTextSelector);
     const text = textEl ? textEl.innerText.trim() : "";
     
     tempForwardList.unshift(msgEl); // prepend to keep chronological order
     
     if (text.includes(targetTxId)) {
        found = true;
        console.log(`[DEBUG] Found starting TX ID: ${targetTxId}. Built temporary list of ${tempForwardList.length} messages.`);
        break;
     }
  }

  if (found) {
     const total = tempForwardList.length;
     let current = 0;
     
     function processNext() {
        if (tempForwardList.length === 0) {
           UI.setStatus('Batch complete. Listening for new transactions...', 'waiting');
           return;
        }
        
        const msgEl = tempForwardList.shift();
        current++;
        
        // Extract TX ID to show in UI
        const textEl = msgEl.querySelector(Selectors.messageTextSelector);
        const text = textEl ? textEl.innerText.trim() : "";
        const txMatch = text.match(/(?:Ref:|Transfer ID:)\s*(\d+)/i);
        const txId = txMatch ? txMatch[1] : "Unknown";
        
        const remaining = tempForwardList.length;
        const estSec = Math.ceil(remaining * 3.1);
        const estMin = Math.floor(estSec / 60);
        const estRemSec = Math.floor(estSec % 60);
        const estStr = estMin > 0 ? `${estMin}m ${estRemSec}s` : `${estRemSec}s`;
        
        const msg = remaining > 0 
           ? `Forwarding TX: ${txId} | ${current}/${total} | EST: ${estStr}`
           : `Forwarding TX: ${txId} | ${current}/${total}`;
           
        UI.setStatus(msg, 'active');
        
        processNewMessage(msgEl, true, true); // true = bypass normal checks, true = skip default UI
        
        if (tempForwardList.length > 0) {
           setTimeout(processNext, 3100); // Wait 3.1 seconds before sending next to avoid Telegram limits
        } else {
           setTimeout(() => {
              UI.setStatus('Batch complete. Listening for new transactions...', 'waiting');
           }, 3000);
        }
     }
     
     processNext();
     sendResponse({ success: true, count: total });
  } else {
     UI.setStatus(`Could not find TX: ${targetTxId}`, 'error');
     setTimeout(() => {
        UI.setStatus('Listening for new messages...', 'waiting');
     }, 3000);
     sendResponse({ success: false, count: 0 });
  }
}

const UI = {
  container: null,
  text: null,
  dot: null,
  timeout: null,
  
  init() {
    if (document.getElementById('sms-fw-dynamic-island')) return;
    
    this.container = document.createElement('div');
    this.container.id = 'sms-fw-dynamic-island';
    
    Object.assign(this.container.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%) translateY(-100px)',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(10px)',
      color: '#ffffff',
      padding: '12px 24px',
      borderRadius: '9999px',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
      zIndex: '999999',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      opacity: '0',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    });
    
    const dot = document.createElement('div');
    Object.assign(dot.style, {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: '#10b981',
      boxShadow: '0 0 10px #10b981'
    });
    this.dot = dot;
    
    this.text = document.createElement('div');
    this.text.innerText = 'SMS Forwarder Initializing...';
    
    this.container.appendChild(dot);
    this.container.appendChild(this.text);
    document.body.appendChild(this.container);
    
    setTimeout(() => {
      this.container.style.transform = 'translateX(-50%) translateY(0)';
      this.container.style.opacity = '1';
    }, 100);
  },

  setStatus(message, state = 'waiting') {
    if (!this.container) this.init();
    
    this.text.innerText = message;
    
    if (state === 'waiting') {
       this.dot.style.backgroundColor = '#10b981';
       this.dot.style.boxShadow = '0 0 10px #10b981';
       this.container.style.transform = 'translateX(-50%) translateY(0) scale(1)';
    } else if (state === 'active') {
       this.dot.style.backgroundColor = '#8b5cf6';
       this.dot.style.boxShadow = '0 0 15px #8b5cf6';
       this.container.style.transform = 'translateX(-50%) translateY(0) scale(1.05)';
       setTimeout(() => {
          this.container.style.transform = 'translateX(-50%) translateY(0) scale(1)';
       }, 300);
    }
  }
};

// Initialize
chrome.storage.local.get(['targetContact'], (result) => {
  UI.init();
  if (result.targetContact) {
    originalTargetContact = result.targetContact.trim();
    targetContact = originalTargetContact.toLowerCase();
    startObserver();
  } else {
    console.log("SMS Forwarder: No target contact set. Waiting for config.");
  }
});

// Listen for config changes from popup
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.targetContact) {
      originalTargetContact = changes.targetContact.newValue?.trim();
      targetContact = originalTargetContact?.toLowerCase();
      if (targetContact) {
        startObserver();
      } else {
        stopObserver();
      }
    }
  }
});

function getActiveChatName() {
  const headerEls = document.querySelectorAll(Selectors.chatHeaderSelector);
  for (const el of headerEls) {
    if (el.innerText && el.innerText.trim()) {
      return el.innerText.trim();
    }
  }
  return "";
}

function generateHash(text, timestamp) {
  // Simple string hash function for deduplication
  const str = text + '|' + timestamp;
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    let chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
}

function processNewMessage(node, isManualBatch = false, skipUI = false) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return;

  // 1. Verify this is a message wrapper
  let msgEl = null;
  if (node.matches && node.matches(Selectors.messageWrapperSelector)) {
    msgEl = node;
  } else if (node.closest && node.closest(Selectors.messageWrapperSelector)) {
    msgEl = node.closest(Selectors.messageWrapperSelector);
  } else if (node.querySelector) {
    msgEl = node.querySelector(Selectors.messageWrapperSelector);
  }
  
  if (!msgEl) return;

  // 2. Check if it's an incoming message
  if (!msgEl.matches(Selectors.incomingMessageSelector)) {
    // console.log("[DEBUG] Ignored message: It is outgoing or not an incoming wrapper."); // Too noisy
    return; 
  }

  if (!targetContact) {
      console.log("[DEBUG] Ignored message: No target contact configured.");
      return;
  }

  // 3. Check Targeting Logic: Does the active chat match our Target Contact?
  const currentChatName = getActiveChatName().toLowerCase();
  const targetDigits = targetContact.replace(/\D/g,'');
  const currentDigits = currentChatName.replace(/\D/g,'');
  const digitMatch = targetDigits.length > 0 && targetDigits === currentDigits;

  if (currentChatName !== targetContact && !digitMatch) {
     console.log(`[DEBUG] Ignored message: Contact mismatch. Expected: '${targetContact}', Found: '${currentChatName}'`);
     return;
  }

  // 4. Extract Text and Timestamp
  const textEl = msgEl.querySelector(Selectors.messageTextSelector);
  const text = textEl ? textEl.innerText.trim() : "";
  
  if (!text) {
     console.log("[DEBUG] Ignored message: No text content found in bubble.");
     return;
  }

  // Attempt to extract Transaction ID
  const txMatch = text.match(/(?:Ref:|Transfer ID:)\s*(\d+)/i);
  let txId = txMatch ? txMatch[1] : null;

  const timeEl = msgEl.querySelector(Selectors.messageTimestampSelector) || msgEl.closest('mws-message-wrapper').querySelector(Selectors.messageTimestampSelector);
  let timestamp = timeEl ? timeEl.innerText.trim() : new Date().toLocaleTimeString();

  // 5. Filter Type: Check for SMS/MMS vs RCS
  const statusEls = msgEl.querySelectorAll(Selectors.messageTypeIndicatorSelector);
  let isRCS = false;
  for (const el of statusEls) {
    const statusText = el.innerText.toLowerCase();
    if (statusText.includes('rcs') || statusText.includes('chat message')) {
      isRCS = true;
      break;
    }
  }
  if (isRCS) return;

  // 5.5 Prevent old messages (Initial Load or Scrolling Up)
  let isMessageOld = false;
  
  if (!isManualBatch) {
    if (!isReady) {
      isMessageOld = true;
    } else {
      let nextNode = msgEl.nextElementSibling;
      let subsequentMessages = 0;
      while (nextNode) {
        if (nextNode.matches && nextNode.matches(Selectors.messageWrapperSelector)) subsequentMessages++;
        else if (nextNode.querySelector && nextNode.querySelector(Selectors.messageWrapperSelector)) subsequentMessages++;
        nextNode = nextNode.nextElementSibling;
      }
      if (subsequentMessages > 2) isMessageOld = true;
    }
  }

  const dedupeHash = txId ? ("TX_" + txId) : generateHash(text, "");

  if (isMessageOld) {
    recentMessageHashes.add(dedupeHash);
    return;
  }

  // 6. Session Deduplication
  if (!isManualBatch && recentMessageHashes.has(dedupeHash)) {
    return; 
  }
  
  recentMessageHashes.add(dedupeHash);
  if (recentMessageHashes.size > 200) {
    const iterator = recentMessageHashes.values();
    recentMessageHashes.delete(iterator.next().value);
  }

  // 7. Send to Background Script for forwarding
  const displayId = txId ? `TX: ${txId}` : "new message";
  
  if (!skipUI) {
      UI.setStatus(`Forwarding ${displayId}...`, 'active');
      
      if (!isManualBatch) {
         clearTimeout(UI.timeout);
         UI.timeout = setTimeout(() => {
            UI.setStatus('Waiting for new transactions...', 'waiting');
         }, 3000);
      }
  }

  chrome.runtime.sendMessage({
    type: "FORWARD_MESSAGE",
    payload: {
      text: text,
      contact: originalTargetContact,
      timestamp: timestamp,
      hash: dedupeHash
    }
  });
}

function startObserver() {
  if (observer) return; // Already running

  console.log("SMS Forwarder: Starting observer for contact:", targetContact);
  
  isReady = false;
  UI.setStatus('Waiting for target chat to load...', 'waiting');

  let initialScanDone = false;
  const targetNode = document.body;
  const config = { childList: true, subtree: true };

  observer = new MutationObserver((mutationsList, observer) => {
    // Detect when the target chat actually loads for the first time
    if (!initialScanDone) {
      const currentChatName = getActiveChatName().toLowerCase();
      const targetDigits = targetContact ? targetContact.replace(/\D/g,'') : '';
      const currentDigits = currentChatName.replace(/\D/g,'');
      const digitMatch = targetDigits.length > 0 && targetDigits === currentDigits;
      
      if (currentChatName === targetContact || digitMatch) {
         const existingMessages = document.querySelectorAll(Selectors.messageWrapperSelector);
         if (existingMessages.length > 0) {
            console.log(`[DEBUG] Target chat loaded. Scanning ${existingMessages.length} existing messages...`);
            existingMessages.forEach(node => processNewMessage(node));
            initialScanDone = true;
            
            // Give the DOM a brief moment to settle before listening for real new messages
            setTimeout(() => {
               isReady = true;
               UI.setStatus('Listening for new transactions...', 'waiting');
               console.log("SMS Forwarder: Initialization complete. Now listening.");
            }, 1000);
         }
      }
    }

    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          processNewMessage(node);
        }
      }
    }
  });

  observer.observe(targetNode, config);
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
    isReady = false;
    console.log("SMS Forwarder: Observer stopped.");
  }
}
