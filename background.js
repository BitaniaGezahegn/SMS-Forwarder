// background.js - Service Worker for sending to Telegram

console.log("SMS Forwarder Background Service Worker Started.");

// Retrieve offline queue from storage
async function getQueue() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['offlineQueue'], (result) => {
      resolve(result.offlineQueue || []);
    });
  });
}

// Save queue to storage
async function saveQueue(queue) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ offlineQueue: queue }, resolve);
  });
}

// Log successful forwards
function logSuccess(messageData) {
  chrome.storage.local.get(['forwardHistory'], (result) => {
    let history = result.forwardHistory || [];
    history.unshift({
      time: new Date().toLocaleString(),
      contact: messageData.contact,
      text: messageData.text
    });
    if (history.length > 10) history = history.slice(0, 10);
    chrome.storage.local.set({ forwardHistory: history });
  });
}

// Add message to queue
async function enqueueMessage(messageData) {
  const queue = await getQueue();
  queue.push(messageData);
  await saveQueue(queue);
  console.log("SMS Forwarder: Message queued. Queue size:", queue.length);
}

// Function to send message to Telegram API
async function sendToTelegram(messageData, botToken, channelId, retryCount = 0) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  // Format message
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  const text = `Forwarded using https://www.sms-fw.com\nFrom: '${messageData.contact}'\nTo: '#phonenumber-sim2'\nWhen: ${formattedDate}\n************\n${messageData.text}`;
  
  const payload = {
    chat_id: channelId,
    text: text
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log("SMS Forwarder: Message successfully forwarded to Telegram.");
      logSuccess(messageData);
      return true;
    }

    // Handle Rate Limiting (429)
    if (response.status === 429) {
      let retryAfter = 5;
      try {
        const body = await response.json();
        if (body && body.parameters && body.parameters.retry_after) {
           retryAfter = body.parameters.retry_after;
        }
      } catch (e) {
        retryAfter = response.headers.get('Retry-After') || 5;
      }
      
      const delayMs = (parseInt(retryAfter) + 1) * 1000; // Add 1 second buffer
      console.warn(`SMS Forwarder: Rate limited (429). Retrying after ${delayMs}ms.`);
      
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return await sendToTelegram(messageData, botToken, channelId, retryCount);
    }

    // Handle Server Errors (5xx) with Exponential Backoff
    if (response.status >= 500 && response.status < 600) {
      if (retryCount < 5) {
        const backoffMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, 8s, 16s
        console.warn(`SMS Forwarder: Server error ${response.status}. Retrying in ${backoffMs}ms. (Attempt ${retryCount + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return await sendToTelegram(messageData, botToken, channelId, retryCount + 1);
      } else {
        console.error("SMS Forwarder: Max retries reached for 5xx errors.");
        return false;
      }
    }

    // Other errors (e.g., 400 Bad Request - wrong token or channel id)
    console.error(`SMS Forwarder: Failed to send. Status: ${response.status}. Body:`, await response.text());
    return false;

  } catch (error) {
    // Network error (offline or completely unreachable)
    console.error("SMS Forwarder: Fetch error (network/offline):", error);
    return false;
  }
}

let isFlushing = false;

// Attempt to flush the queue sequentially
async function flushQueue() {
  if (isFlushing) return;
  if (!navigator.onLine) return;

  isFlushing = true;

  chrome.storage.local.get(['botToken', 'channelId'], async (result) => {
    if (!result.botToken || !result.channelId) {
        isFlushing = false;
        return;
    }

    let queue = await getQueue();

    while (queue.length > 0) {
      if (!navigator.onLine) break;

      const msgData = queue[0];
      const success = await sendToTelegram(msgData, result.botToken, result.channelId);

      if (success) {
        queue.shift();
        await saveQueue(queue);
        // Small delay to prevent jitter (content.js handles the primary 3.1s pacing)
        await new Promise(resolve => setTimeout(resolve, 500)); 
      } else {
        console.error("SMS Forwarder: Dropping unrecoverable message from queue.");
        queue.shift();
        await saveQueue(queue);
      }
      
      // Re-fetch queue in case new messages were added during the async wait
      queue = await getQueue();
    }

    isFlushing = false;
  });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "TEST_MESSAGE") {
    chrome.storage.local.get(['botToken', 'channelId', 'targetContact'], async (result) => {
      if (!result.botToken || !result.channelId) {
        sendResponse({ success: false, error: "Credentials not configured." });
        return;
      }
      const testData = {
        contact: result.targetContact || "Test Contact",
        timestamp: new Date().toLocaleTimeString(),
        text: "This is a test message to verify the SMS Forwarder extension is working!"
      };
      const success = await sendToTelegram(testData, result.botToken, result.channelId);
      sendResponse({ success: success });
    });
    return true; // Keep message channel open for async response
  }

  if (request.type === "FORWARD_MESSAGE") {
    // Unconditionally add to the queue and flush to guarantee sequential delivery
    enqueueMessage(request.payload).then(() => {
        flushQueue();
    });
  }
});

// Alarm to periodically check and flush queue
chrome.alarms.create("flushQueueAlarm", { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "flushQueueAlarm") {
    flushQueue();
  }
});

flushQueue();
