document.addEventListener('DOMContentLoaded', function() {
  // Tab switching functionality
  const depositTab = document.getElementById('depositTab');
  const withdrawTab = document.getElementById('withdrawTab');
  const debugTab = document.getElementById('debugTab');
  const depositPanel = document.getElementById('depositPanel');
  const withdrawPanel = document.getElementById('withdrawPanel');
  const debugPanel = document.getElementById('debugPanel');
  
  depositTab.addEventListener('click', function() {
    depositTab.classList.add('active');
    withdrawTab.classList.remove('active');
    debugTab.classList.remove('active');
    depositPanel.classList.add('active');
    withdrawPanel.classList.remove('active');
    debugPanel.classList.remove('active');
  });
  
  withdrawTab.addEventListener('click', function() {
    withdrawTab.classList.add('active');
    depositTab.classList.remove('active');
    debugTab.classList.remove('active');
    withdrawPanel.classList.add('active');
    depositPanel.classList.remove('active');
    debugPanel.classList.remove('active');
    loadPrompts();
  });
  
  debugTab.addEventListener('click', function() {
    debugTab.classList.add('active');
    depositTab.classList.remove('active');
    withdrawTab.classList.remove('active');
    debugPanel.classList.add('active');
    depositPanel.classList.remove('active');
    withdrawPanel.classList.remove('active');
  });
  
  // Save prompt functionality
  const saveButton = document.getElementById('savePrompt');
  const promptNameInput = document.getElementById('promptName');
  const promptTextInput = document.getElementById('promptText');
  const saveMessage = document.getElementById('saveMessage');
  
  saveButton.addEventListener('click', function() {
    const name = promptNameInput.value.trim();
    const text = promptTextInput.value.trim();
    
    if (!name || !text) {
      saveMessage.textContent = 'Please enter both a name and prompt text.';
      return;
    }
    
    chrome.storage.local.get('prompts', function(data) {
      const prompts = data.prompts || {};
      
      // Check if prompt name already exists
      if (prompts[name] && !confirm(`A prompt named "${name}" already exists. Do you want to overwrite it?`)) {
        return;
      }
      
      prompts[name] = text;
      
      chrome.storage.local.set({ prompts: prompts }, function() {
        saveMessage.textContent = 'Prompt saved successfully!';
        promptNameInput.value = '';
        promptTextInput.value = '';
        
        setTimeout(function() {
          saveMessage.textContent = '';
        }, 3000);
      });
    });
  });
  
  // Load and display prompts
  function loadPrompts() {
    const promptList = document.getElementById('promptList');
    promptList.innerHTML = '';
    
    chrome.storage.local.get('prompts', function(data) {
      const prompts = data.prompts || {};
      
      if (Object.keys(prompts).length === 0) {
        promptList.innerHTML = '<p>No prompts saved yet.</p>';
        return;
      }
      
      for (const name in prompts) {
        const promptItem = document.createElement('div');
        promptItem.className = 'prompt-item';
        
        const promptName = document.createElement('div');
        promptName.className = 'prompt-name';
        promptName.textContent = name;
        
        const promptActions = document.createElement('div');
        promptActions.className = 'prompt-actions';
        
        // Edit button
        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', function(e) {
          e.stopPropagation();
          editPrompt(name, prompts[name]);
        });
        
        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', function(e) {
          e.stopPropagation();
          deletePrompt(name);
        });
        
        promptActions.appendChild(editButton);
        promptActions.appendChild(deleteButton);
        promptItem.appendChild(promptName);
        promptItem.appendChild(promptActions);
        
        promptItem.addEventListener('click', function() {
          usePrompt(name, prompts[name]);
        });
        
        promptList.appendChild(promptItem);
      }
    });
  }
  
  // Edit a prompt
  function editPrompt(name, text) {
    // Switch to deposit tab
    depositTab.click();
    
    // Fill in the form with existing prompt
    promptNameInput.value = name;
    promptTextInput.value = text;
    
    // Show message to user
    saveMessage.textContent = 'Editing prompt: "' + name + '". Changes will overwrite the existing prompt.';
  }
  
  // Delete a prompt
  function deletePrompt(name) {
    if (confirm(`Are you sure you want to delete the prompt "${name}"?`)) {
      chrome.storage.local.get('prompts', function(data) {
        const prompts = data.prompts || {};
        
        if (prompts[name]) {
          delete prompts[name];
          
          chrome.storage.local.set({ prompts: prompts }, function() {
            loadPrompts();
          });
        }
      });
    }
  }
  
  // Insert a prompt into ChatGPT
  function usePrompt(name, text) {
    console.log('Attempting to use prompt:', name);
    
    // Display a status message
    saveMessage.textContent = 'Inserting prompt...';
    
    // Send message to content script to insert the prompt
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        saveMessage.textContent = 'Error: Cannot access current tab';
        console.error('No active tab found');
        return;
      }
      
      console.log('Found active tab:', tabs[0].url);
      
      // Check if we're on a ChatGPT page
      const isChatGPT = tabs[0].url && (
        tabs[0].url.includes('chat.openai.com') ||
        tabs[0].url.includes('chatgpt.com')
      );
      
      if (!isChatGPT) {
        saveMessage.textContent = 'Please navigate to ChatGPT to use prompts';
        console.error('Not on ChatGPT site:', tabs[0].url);
        return;
      }
      
      console.log('Sending message to content script');
      
      // Send message to content script
      chrome.tabs.sendMessage(tabs[0].id, { action: 'insertPrompt', text: text }, function(response) {
        // Handle error if message sending fails
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', chrome.runtime.lastError.message);
          
          // Try using background script as a relay instead
          console.log('Trying relay through background script');
          chrome.runtime.sendMessage({
            action: 'relayToContent',
            data: { action: 'insertPrompt', text: text }
          }, function(relayResponse) {
            if (chrome.runtime.lastError || !relayResponse || !relayResponse.success) {
              console.error('Relay failed:', chrome.runtime.lastError ? chrome.runtime.lastError.message : 'No success response');
              saveMessage.textContent = 'Please reload the ChatGPT page and try again';
              return;
            }
            
            console.log('Relay successful');
            saveMessage.textContent = 'Prompt inserted!';
            setTimeout(() => window.close(), 1000);
          });
          return;
        }
        
        if (!response || !response.success) {
          console.error('Content script reported failure');
          saveMessage.textContent = 'Failed to insert prompt';
          return;
        }
        
        // Success!
        console.log('Insert successful');
        saveMessage.textContent = 'Prompt inserted!';
        
        // Close popup after sending
        setTimeout(() => window.close(), 1000);
      });
    });
  }
  
  // Debug panel functionality
  const testInsertButton = document.getElementById('testInsert');
  const reloadPageButton = document.getElementById('reloadPage');
  const checkConnectionButton = document.getElementById('checkConnection');
  const debugStatus = document.getElementById('debugStatus');
  const debugLogs = document.getElementById('debugLogs');
  
  // Log function that writes to the debug panel
  function debugLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    
    // Add to the log display
    debugLogs.textContent = logEntry + '\n' + debugLogs.textContent;
    
    // Also log to the console
    console[type](message);
  }
  
  // Update status display
  function updateStatus(message, type = 'normal') {
    debugStatus.textContent = message;
    
    // Remove existing status classes
    debugStatus.classList.remove('status-success', 'status-error', 'status-warning');
    
    // Add appropriate class
    if (type === 'success') {
      debugStatus.classList.add('status-success');
    } else if (type === 'error') {
      debugStatus.classList.add('status-error');
    } else if (type === 'warning') {
      debugStatus.classList.add('status-warning');
    }
  }
  
  // Test insert button
  testInsertButton.addEventListener('click', function() {
    updateStatus('Testing insertion...', 'normal');
    debugLog('Starting insertion test');
    
    // Send a test message to the content script
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        updateStatus('Error: Cannot access current tab', 'error');
        debugLog('No active tab found', 'error');
        return;
      }
      
      debugLog(`Found active tab: ${tabs[0].url}`);
      
      // Check if we're on a ChatGPT page
      const isChatGPT = tabs[0].url && (
        tabs[0].url.includes('chat.openai.com') ||
        tabs[0].url.includes('chatgpt.com')
      );
      
      if (!isChatGPT) {
        updateStatus('Please navigate to ChatGPT to run tests', 'warning');
        debugLog('Not on ChatGPT site: ' + tabs[0].url, 'warning');
        return;
      }
      
      const testText = 'This is a test message from Prompt Bank extension. If you can see this, the extension is working correctly!';
      
      debugLog('Sending test message to content script');
      
      // Send message to content script
      chrome.tabs.sendMessage(tabs[0].id, { action: 'insertPrompt', text: testText }, function(response) {
        if (chrome.runtime.lastError) {
          debugLog('Error sending message: ' + chrome.runtime.lastError.message, 'error');
          updateStatus('Connection test failed. Try reloading the page.', 'error');
          
          // Try relay method
          debugLog('Attempting relay through background script');
          chrome.runtime.sendMessage({
            action: 'relayToContent',
            data: { action: 'insertPrompt', text: testText }
          }, function(relayResponse) {
            if (chrome.runtime.lastError || !relayResponse || !relayResponse.success) {
              debugLog('Relay failed: ' + (chrome.runtime.lastError ? chrome.runtime.lastError.message : 'No success response'), 'error');
              updateStatus('Both direct and relay tests failed', 'error');
            } else {
              debugLog('Relay successful!');
              updateStatus('Direct connection failed, but relay worked', 'warning');
            }
          });
          
          return;
        }
        
        if (!response || !response.success) {
          debugLog('Content script reported failure', 'error');
          updateStatus('Connection is good, but insertion failed', 'warning');
          return;
        }
        
        debugLog('Test successful!');
        updateStatus('Connection and insertion test passed!', 'success');
      });
    });
  });
  
  // Reload page button
  reloadPageButton.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.reload(tabs[0].id);
        updateStatus('Reloading ChatGPT page...', 'normal');
        debugLog('Triggered page reload');
      } else {
        updateStatus('Error: Cannot access current tab', 'error');
        debugLog('Cannot access tab for reload', 'error');
      }
    });
  });
  
  // Check connection button
  checkConnectionButton.addEventListener('click', function() {
    updateStatus('Checking connection...', 'normal');
    debugLog('Starting connection check');
    
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        updateStatus('Error: Cannot access current tab', 'error');
        debugLog('No active tab found', 'error');
        return;
      }
      
      debugLog(`Found active tab: ${tabs[0].url}`);
      
      // Check if we're on a ChatGPT page
      const isChatGPT = tabs[0].url && (
        tabs[0].url.includes('chat.openai.com') ||
        tabs[0].url.includes('chatgpt.com')
      );
      
      if (!isChatGPT) {
        updateStatus('Not on ChatGPT site', 'warning');
        debugLog('Not on ChatGPT site: ' + tabs[0].url, 'warning');
        return;
      }
      
      // Just try to send a ping message
      chrome.tabs.sendMessage(tabs[0].id, { action: 'ping' }, function(response) {
        if (chrome.runtime.lastError) {
          debugLog('Connection failed: ' + chrome.runtime.lastError.message, 'error');
          updateStatus('Content script is not accessible. Try reloading the page.', 'error');
          return;
        }
        
        debugLog('Connection successful!');
        updateStatus('Connected to content script successfully', 'success');
      });
    });
  });
  
  // Load prompts on initial load if on withdraw tab
  if (withdrawTab.classList.contains('active')) {
    loadPrompts();
  }
  
  // Initialize debug panel
  debugLog('Debug panel initialized');
  updateStatus('Ready to run tests');
}); 