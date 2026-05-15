document.addEventListener('DOMContentLoaded', () => {
  const botTokenInput = document.getElementById('botToken');
  const channelIdInput = document.getElementById('channelId');
  const targetContactInput = document.getElementById('targetContact');
  const batchTxIdInput = document.getElementById('batchTxId');
  const startForwardingBtn = document.getElementById('startForwardingBtn');
  const singleForwardBtn = document.getElementById('singleForwardBtn');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');
  const testBtn = document.getElementById('testBtn');
  const historyList = document.getElementById('historyList');

  // Load history
  function loadHistory() {
    chrome.storage.local.get(['forwardHistory'], (result) => {
      const history = result.forwardHistory || [];
      if (history.length === 0) {
        historyList.innerHTML = '<li class="empty-state">No recent forwards</li>';
        return;
      }
      
      historyList.innerHTML = '';
      history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'history-item-time';
        timeDiv.textContent = item.time;
        
        const textDiv = document.createElement('div');
        textDiv.className = 'history-item-text';
        textDiv.textContent = `To ${item.contact}: ${item.text}`;
        
        li.appendChild(timeDiv);
        li.appendChild(textDiv);
        historyList.appendChild(li);
      });
    });
  }

  // Load saved settings
  chrome.storage.local.get(['botToken', 'channelId', 'targetContact'], (result) => {
    if (result.botToken) botTokenInput.value = result.botToken;
    if (result.channelId) channelIdInput.value = result.channelId;
    if (result.targetContact) targetContactInput.value = result.targetContact;
  });

  loadHistory();

  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = 'status-message show ' + (isError ? 'error' : 'success');
    setTimeout(() => {
      statusDiv.classList.remove('show');
    }, 3000);
  }

  // Save settings
  saveBtn.addEventListener('click', () => {
    const botToken = botTokenInput.value.trim();
    const channelId = channelIdInput.value.trim();
    const targetContact = targetContactInput.value.trim();

    if (!botToken || !channelId || !targetContact) {
      showStatus('Bot Token, Channel ID, and Target Contact are required.', true);
      return;
    }

    chrome.storage.local.set({
      botToken: botToken,
      channelId: channelId,
      targetContact: targetContact
    }, () => {
      showStatus('Settings saved successfully!');
    });
  });

  startForwardingBtn.addEventListener('click', () => {
    const txId = batchTxIdInput.value.trim();
    if (!txId) {
      showStatus('Please enter a Transaction ID to start from.', true);
      return;
    }
    
    startForwardingBtn.disabled = true;
    startForwardingBtn.innerText = "Forwarding...";
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "BATCH_FORWARD_FROM_TX", txId: txId }, (response) => {
          startForwardingBtn.disabled = false;
          startForwardingBtn.innerText = "Batch Forward";
          
          if (chrome.runtime.lastError) {
             showStatus("Error: Could not reach Google Messages tab. Please refresh it.", true);
          } else if (response && response.success) {
             showStatus(`Successfully started forwarding ${response.count} messages!`);
          } else {
             showStatus(`Could not find Transaction ID ${txId} on the screen.`, true);
          }
        });
      } else {
        startForwardingBtn.disabled = false;
        startForwardingBtn.innerText = "Batch Forward";
        showStatus("Please open Google Messages to use this.", true);
      }
    });
  });

  singleForwardBtn.addEventListener('click', () => {
    const txId = batchTxIdInput.value.trim();
    if (!txId) {
      showStatus('Please enter a Transaction ID.', true);
      return;
    }
    
    singleForwardBtn.disabled = true;
    singleForwardBtn.innerText = "Sending...";
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "SINGLE_FORWARD_TX", txId: txId }, (response) => {
          singleForwardBtn.disabled = false;
          singleForwardBtn.innerText = "Single TX";
          
          if (chrome.runtime.lastError) {
             showStatus("Error: Could not reach Google Messages tab. Please refresh it.", true);
          } else if (response && response.success) {
             showStatus(`Successfully forwarded 1 message!`);
          } else {
             showStatus(`Could not find Transaction ID ${txId} on the screen.`, true);
          }
        });
      } else {
        singleForwardBtn.disabled = false;
        singleForwardBtn.innerText = "Single TX";
        showStatus("Please open Google Messages to use this.", true);
      }
    });
  });

  // Test button
  testBtn.addEventListener('click', () => {
    testBtn.disabled = true;
    testBtn.textContent = 'Sending...';
    
    chrome.runtime.sendMessage({ type: "TEST_MESSAGE" }, (response) => {
      testBtn.disabled = false;
      testBtn.textContent = 'Test Message';
      
      if (chrome.runtime.lastError) {
        showStatus('Error communicating with background script.', true);
        return;
      }
      
      if (response && response.success) {
        showStatus('Test message sent!');
        setTimeout(loadHistory, 1000); // Reload history to show test message
      } else {
        showStatus('Failed to send test message: ' + (response?.error || 'Unknown error'), true);
      }
    });
  });
});
