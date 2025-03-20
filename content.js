// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'ping') {
    // Simple ping to check if content script is available
    console.log('Ping received from background script');
    sendResponse({ success: true, message: 'Content script is active' });
    return true;
  } else if (request.action === 'toggleSidebar') {
    // Toggle the sidebar visibility when extension icon is clicked
    toggleSidebar();
    sendResponse({ success: true });
    return true;
  }
});

// Function to insert text into ChatGPT's input field
function insertPromptText(text, autoSubmit = false) {
  try {
    console.log('Attempting to insert prompt text', autoSubmit ? 'with auto-submit' : 'without auto-submit');
    
    // Add a newline at the end of the text to position cursor on a new line
    text = text + '\n\n';
    
    // Try to find contenteditable div first (new ChatGPT interface)
    let inputElement = document.getElementById('prompt-textarea');
    
    // If not found, try other contenteditable selectors
    if (!inputElement) {
      // Try multiple potential selectors for ChatGPT interfaces
      const possibleDivSelectors = [
        '.ProseMirror',
        'div[contenteditable="true"]',
        '[role="textbox"]',
        'div.w-full[data-slate-editor="true"]',
        'div[data-lexical-editor="true"]'
      ];
      
      for (const selector of possibleDivSelectors) {
        if (!inputElement) {
          inputElement = document.querySelector(selector);
        } else {
          break;
        }
      }
    }

    // Fall back to textarea selectors (old ChatGPT interface)
    if (!inputElement) {
      const possibleTextareaSelectors = [
        'textarea[data-id="root"]',
        'textarea[placeholder="Send a message"]',
        'textarea.w-full',
        'textarea',
        'form textarea'
      ];
      
      for (const selector of possibleTextareaSelectors) {
        if (!inputElement) {
          inputElement = document.querySelector(selector);
        } else {
          break;
        }
      }
    }
    
    if (!inputElement) {
      console.error('Could not find ChatGPT input field');
      return false;
    }

    console.log('Found input element:', inputElement.tagName, inputElement.className);
    
    // Method for ProseMirror editor specifically (chatgpt.com uses this)
    if (inputElement.classList.contains('ProseMirror')) {
      console.log('Using ProseMirror specific method');
      
      // Clear existing content
      inputElement.innerHTML = '';
      
      // Handle text with newlines - split into paragraphs
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const paragraph = document.createElement('p');
        
        if (lines[i].trim() === '') {
          // For empty lines, use a <br> to maintain the space
          paragraph.innerHTML = '<br>';
        } else {
          paragraph.textContent = lines[i];
        }
        
        inputElement.appendChild(paragraph);
      }
      
      // Dispatch input event
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true
      });
      inputElement.dispatchEvent(inputEvent);
      
      // Focus the element and move cursor to the end
      inputElement.focus();
      
      // Place cursor at the very end
      const selection = window.getSelection();
      const range = document.createRange();
      
      // Select the last paragraph
      const lastParagraphIndex = Math.max(0, inputElement.childNodes.length - 1);
      const lastParagraph = inputElement.childNodes[lastParagraphIndex];
      
      range.selectNodeContents(lastParagraph);
      range.collapse(false); // collapse to end
      selection.removeAllRanges();
      selection.addRange(range);
      
      console.log('Used ProseMirror method');
      
      // Find and potentially click the send button if auto-submit is enabled
      if (autoSubmit) {
        handleAutoSubmit();
      }
      
      return true;
    }
    
    // Method 1: Try using clipboard API for contenteditable
    async function pasteViaClipboard() {
      try {
        // Check if we have clipboard permissions
        const permissionStatus = await navigator.permissions.query({name: 'clipboard-write'});
        if (permissionStatus.state !== 'granted') {
          console.log('No clipboard permission');
          return false;
        }
        
        const originalClipboard = await navigator.clipboard.readText().catch(() => '');
        await navigator.clipboard.writeText(text);
        
        // Focus the element
        inputElement.focus();
        
        // Use document.execCommand to paste
        const success = document.execCommand('paste');
        
        // Restore original clipboard content
        await navigator.clipboard.writeText(originalClipboard).catch(() => {});
        
        return success;
      } catch (err) {
        console.log('Clipboard method failed:', err);
        return false;
      }
    }
    
    // Handle different input types (contenteditable div vs textarea)
    if (inputElement.tagName.toLowerCase() === 'textarea') {
      // For textarea elements
      inputElement.value = text;
      const inputEvent = new Event('input', { bubbles: true });
      inputElement.dispatchEvent(inputEvent);
      
      // Move cursor to the end of the textarea
      inputElement.focus();
      inputElement.selectionStart = inputElement.selectionEnd = inputElement.value.length;
      
      console.log('Used textarea method');
      
      // Find and potentially click the send button if auto-submit is enabled
      if (autoSubmit) {
        handleAutoSubmit();
      }
    } else {
      // For contenteditable divs - try multiple methods
      
      // Method 2: Try to modify React props directly
      // This is a more invasive approach but might work better
      let reactKey = '';
      for (const key in inputElement) {
        if (key.startsWith('__reactFiber$') || key.startsWith('__reactProps$')) {
          reactKey = key;
          break;
        }
      }
      
      if (reactKey && reactKey.startsWith('__reactProps$')) {
        // Try to find onChange handler
        const props = inputElement[reactKey];
        if (props && props.onChange) {
          // Create a synthetic event that looks like what React expects
          const syntheticEvent = {
            target: {
              value: text
            },
            preventDefault: function() {},
            stopPropagation: function() {}
          };
          
          // Call the onChange handler
          props.onChange(syntheticEvent);
          console.log('Used React props method');
        }
      }
      
      // Method 3: Try direct text insertion via execCommand
      inputElement.focus();
      const selectSuccess = document.execCommand('selectAll', false, null);
      const insertSuccess = document.execCommand('insertText', false, text);
      
      if (insertSuccess) {
        console.log('Used execCommand method');
      } else {
        // Method 4: Try clipboard API method
        pasteViaClipboard().then(success => {
          if (success) {
            console.log('Used clipboard method');
          } else {
            // Method 5: Fallback to innerHTML as a last resort
            // Clear existing content first
            inputElement.innerHTML = '';
            
            // Create and insert text node with proper formatting
            const lines = text.split('\n');
            
            // For each line of text
            for (let i = 0; i < lines.length; i++) {
              const paragraph = document.createElement('p');
              if (lines[i].trim() === '') {
                paragraph.innerHTML = '<br>';
              } else {
                paragraph.textContent = lines[i];
              }
              inputElement.appendChild(paragraph);
            }
            
            console.log('Used innerHTML method');
          }
        });
      }
      
      // Trigger multiple events to try to get ChatGPT to recognize the change
      ['input', 'change', 'keydown', 'keyup', 'keypress'].forEach(eventType => {
        let event;
        if (eventType === 'input') {
          event = new InputEvent(eventType, {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: text
          });
        } else if (eventType.startsWith('key')) {
          event = new KeyboardEvent(eventType, {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            keyCode: 13
          });
        } else {
          event = new Event(eventType, { bubbles: true });
        }
        inputElement.dispatchEvent(event);
      });
      
      // Focus the input element and move cursor to the end
      inputElement.focus();
      
      // Move cursor to end for contenteditable div
      const selection = window.getSelection();
      const range = document.createRange();
      
      if (inputElement.lastChild) {
        range.selectNodeContents(inputElement.lastChild);
        range.collapse(false); // collapse to end
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Find and potentially click the send button if auto-submit is enabled
      if (autoSubmit) {
        handleAutoSubmit();
      }
    }
    
    // Function to handle auto-submit
    function handleAutoSubmit() {
      setTimeout(() => {
        try {
          // Find the send button
          const sendButton = document.querySelector('button[data-testid="send-button"]') || 
                            document.querySelector('button.absolute.p-1') ||
                            document.querySelector('button.absolute.bottom-2.right-2') ||
                            document.querySelector('button[aria-label="Send message"]') ||
                            Array.from(document.querySelectorAll('button')).find(btn => 
                              btn.textContent.includes('Send') || 
                              btn.innerHTML.includes('paper-airplane') ||
                              btn.innerHTML.includes('send')
                            );
          
          if (sendButton) {
            console.log('Found send button for auto-submit:', sendButton);
            
            // Enable the button if it's disabled
            if (sendButton.disabled === true) {
              console.log('Enabling disabled send button');
              sendButton.disabled = false;
            }
            
            // Click the send button
            console.log('Auto-submitting prompt');
            sendButton.click();
          } else {
            console.log('No send button found for auto-submit');
          }
        } catch (e) {
          console.error('Error during auto-submit:', e);
        }
      }, 500); // Wait a bit for the input to be properly registered
    }
    
    console.log('Prompt insertion complete');
    return true;
  } catch (error) {
    console.error('Error inserting prompt text:', error);
    return false;
  }
}

// Check and load sidebar state
function loadSidebarState(callback) {
  chrome.storage.local.get('sidebarState', function(data) {
    const isCollapsed = data.sidebarState?.collapsed === true;
    callback(isCollapsed);
  });
}

// Save sidebar state
function saveSidebarState(isCollapsed) {
  console.log('Saving sidebar state, collapsed: ' + isCollapsed);
  chrome.storage.local.set({
    sidebarState: { 
      collapsed: isCollapsed,
      timestamp: Date.now()
    } 
  }, function() {
    if (chrome.runtime.lastError) {
      console.error('Error saving sidebar state:', chrome.runtime.lastError);
    } else {
      console.log('Sidebar state saved successfully');
    }
  });
}

// Toggle sidebar collapsed state
function toggleSidebar() {
  const sidebar = document.getElementById('prompt-bank-sidebar');
  const body = document.body;
  
  if (!sidebar) {
    console.log('Sidebar element not found, cannot toggle');
    return;
  }
  
  const isCurrentlyCollapsed = sidebar.classList.contains('collapsed');
  
  // Toggle collapsed state
  if (isCurrentlyCollapsed) {
    sidebar.classList.remove('collapsed');
    body.classList.remove('prompt-bank-collapsed');
    console.log('Expanding sidebar');
  } else {
    sidebar.classList.add('collapsed');
    body.classList.add('prompt-bank-collapsed');
    console.log('Collapsing sidebar');
  }
  
  // Update toggle button text - PB when collapsed, × when expanded
  const toggleButton = document.querySelector('.prompt-bank-toggle');
  if (toggleButton) {
    const newCollapsedState = !isCurrentlyCollapsed;
    toggleButton.innerHTML = newCollapsedState ? 'PB' : '×';
    console.log('Updated toggle button text to:', newCollapsedState ? 'PB (collapsed)' : '× (expanded)');
  } else {
    console.log('Toggle button not found');
  }
  
  // Save the state with the CURRENT collapsed value (after toggle), not the opposite
  const newCollapsedState = !isCurrentlyCollapsed;
  console.log('Saving new collapsed state:', newCollapsedState);
  saveSidebarState(newCollapsedState);
}

// Load and initialize sidebar
function createPromptSidebar() {
  // Check if sidebar already exists
  if (document.getElementById('prompt-bank-sidebar')) {
    return;
  }
  
  // First check the saved state before creating the sidebar
  chrome.storage.local.get('sidebarState', function(data) {
    const isCollapsed = data.sidebarState?.collapsed === true;
    
    // Create sidebar container with the correct initial state
    const sidebar = document.createElement('div');
    sidebar.id = 'prompt-bank-sidebar';
    if (isCollapsed) {
      sidebar.classList.add('collapsed');
    }
    
    // Create header
    const header = document.createElement('div');
    header.className = 'prompt-bank-header';
    
    const title = document.createElement('h2');
    title.textContent = 'Prompt Bank';
    
    header.appendChild(title);
    
    // Create "Add New Prompt" toggle
    const addPromptToggle = document.createElement('div');
    addPromptToggle.className = 'add-prompt-toggle collapsed';
    
    const toggleText = document.createElement('span');
    toggleText.textContent = 'Add New Prompt';
    
    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'toggle-icon';
    toggleIcon.innerHTML = '&#9650;'; // Upward arrow
    
    addPromptToggle.appendChild(toggleText);
    addPromptToggle.appendChild(toggleIcon);
    
    // Add event listener to toggle
    addPromptToggle.addEventListener('click', function() {
      const form = document.querySelector('.prompt-bank-form');
      const isFormCollapsed = this.classList.contains('collapsed');
      
      if (isFormCollapsed) {
        this.classList.remove('collapsed');
        form.classList.remove('collapsed');
      } else {
        this.classList.add('collapsed');
        form.classList.add('collapsed');
      }
    });
    
    // Create save form (initially collapsed)
    const saveForm = document.createElement('div');
    saveForm.className = 'prompt-bank-form collapsed';
    
    // Create prompt name input
    const nameInputContainer = document.createElement('div');
    nameInputContainer.className = 'input-container';
    
    const promptNameInput = document.createElement('input');
    promptNameInput.type = 'text';
    promptNameInput.id = 'sidebar-prompt-name';
    promptNameInput.placeholder = 'Prompt Name';
    
    nameInputContainer.appendChild(promptNameInput);
    
    // Create prompt text input
    const textInputContainer = document.createElement('div');
    textInputContainer.className = 'input-container';
    
    const promptTextInput = document.createElement('textarea');
    promptTextInput.id = 'sidebar-prompt-text';
    promptTextInput.placeholder = 'Prompt Text';
    
    textInputContainer.appendChild(promptTextInput);
    
    // Create save button
    const saveButtonContainer = document.createElement('div');
    saveButtonContainer.className = 'button-container';
    
    const saveButton = document.createElement('button');
    saveButton.id = 'sidebar-save-button';
    saveButton.className = 'save-btn';
    saveButton.textContent = 'Save Prompt';
    
    // Add cancel button (hidden by default, shown during edit)
    const cancelButton = document.createElement('button');
    cancelButton.id = 'sidebar-cancel-button';
    cancelButton.className = 'cancel-btn';
    cancelButton.textContent = 'Cancel';
    cancelButton.style.display = 'none';
    
    saveButtonContainer.appendChild(saveButton);
    saveButtonContainer.appendChild(cancelButton);
    
    // Add status message
    const statusMessage = document.createElement('div');
    statusMessage.id = 'sidebar-status-message';
    statusMessage.className = 'status-message';
    
    // Add elements to save form
    saveForm.appendChild(nameInputContainer);
    saveForm.appendChild(textInputContainer);
    saveForm.appendChild(saveButtonContainer);
    saveForm.appendChild(statusMessage);
    
    // Create prompt list container with a title
    const promptListContainer = document.createElement('div');
    promptListContainer.className = 'prompt-bank-list-container';
    
    const promptListTitle = document.createElement('h3');
    promptListTitle.textContent = 'Saved Prompts';
    promptListTitle.className = 'prompt-list-title';
    
    const promptList = document.createElement('div');
    promptList.id = 'prompt-bank-list';
    
    promptListContainer.appendChild(promptListTitle);
    promptListContainer.appendChild(promptList);
    
    // Add elements to sidebar
    sidebar.appendChild(header);
    sidebar.appendChild(addPromptToggle);
    sidebar.appendChild(saveForm);
    sidebar.appendChild(promptListContainer);
    
    // Create toggle button for mobile/collapsed state
    const toggleButton = document.createElement('div');
    toggleButton.className = 'prompt-bank-toggle';

    // Make sure the label is correct - PB when collapsed, × when expanded
    toggleButton.innerHTML = isCollapsed ? 'PB' : '×';
    console.log('Creating toggle button with initial state:', isCollapsed ? 'collapsed (PB)' : 'expanded (×)');

    // Use a direct click handler instead of separate function reference
    toggleButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      toggleSidebar();
      console.log('Toggle button clicked');
    });
    
    // Apply the correct body class before inserting the sidebar
    if (isCollapsed) {
      document.body.classList.add('prompt-bank-collapsed');
    }
    
    // Try to find the best place to insert the sidebar
    const insertSidebar = () => {
      // Try different selectors to find a suitable parent element
      const chatContainer = document.querySelector('main') || 
                            document.querySelector('#__next') ||
                            document.querySelector('.chat-page');
      
      if (chatContainer) {
        // Option 1: Insert after main container
        if (chatContainer.parentNode) {
          chatContainer.parentNode.insertBefore(sidebar, chatContainer.nextSibling);
          document.body.appendChild(toggleButton);
          return true;
        }
      }
      
      // Option 2: Append to body as a fallback
      document.body.appendChild(sidebar);
      document.body.appendChild(toggleButton);
      return true;
    };
    
    if (insertSidebar()) {
      // Set up save button event listener
      setupSaveButtonListener();
      
      // Set up cancel button event listener
      setupCancelButtonListener();
      
      // Load and display prompts
      loadPrompts();
    }
  });
}

// Set up the save button listener
function setupSaveButtonListener() {
  const saveButton = document.getElementById('sidebar-save-button');
  const promptNameInput = document.getElementById('sidebar-prompt-name');
  const promptTextInput = document.getElementById('sidebar-prompt-text');
  const statusMessage = document.getElementById('sidebar-status-message');
  const cancelButton = document.getElementById('sidebar-cancel-button');
  
  if (!saveButton || !promptNameInput || !promptTextInput || !statusMessage) return;
  
  saveButton.addEventListener('click', function() {
    const name = promptNameInput.value.trim();
    const text = promptTextInput.value.trim();
    
    if (!name || !text) {
      statusMessage.textContent = 'Please enter both a name and prompt text.';
      statusMessage.className = 'status-message error';
      return;
    }
    
    chrome.storage.local.get('prompts', function(data) {
      const prompts = data.prompts || {};
      
      // Check if we're editing an existing prompt
      const isEditing = saveButton.getAttribute('data-editing') === 'true';
      const originalName = saveButton.getAttribute('data-original-name');
      
      // If editing and name changed, remove the old prompt
      if (isEditing && originalName && originalName !== name) {
        delete prompts[originalName];
      }
      
      // Check if prompt name already exists and we're not editing the same name
      if (!isEditing && prompts[name] && !confirm(`A prompt named "${name}" already exists. Do you want to overwrite it?`)) {
        return;
      }
      
      // Save the prompt
      prompts[name] = text;
      
      chrome.storage.local.set({ prompts: prompts }, function() {
        // Show success message
        statusMessage.textContent = 'Prompt saved successfully!';
        statusMessage.className = 'status-message success';
        
        // Clear inputs
        promptNameInput.value = '';
        promptTextInput.value = '';
        
        // Reset editing state
        saveButton.textContent = 'Save Prompt';
        saveButton.removeAttribute('data-editing');
        saveButton.removeAttribute('data-original-name');
        cancelButton.style.display = 'none';
        
        // Clear message after delay
        setTimeout(function() {
          statusMessage.textContent = '';
          statusMessage.className = 'status-message';
        }, 3000);
        
        // Reload prompts list
        loadPrompts();
      });
    });
  });
}

// Set up the cancel button listener
function setupCancelButtonListener() {
  const cancelButton = document.getElementById('sidebar-cancel-button');
  const saveButton = document.getElementById('sidebar-save-button');
  const promptNameInput = document.getElementById('sidebar-prompt-name');
  const promptTextInput = document.getElementById('sidebar-prompt-text');
  const statusMessage = document.getElementById('sidebar-status-message');
  
  if (!cancelButton || !saveButton || !promptNameInput || !promptTextInput || !statusMessage) return;
  
  cancelButton.addEventListener('click', function() {
    // Clear inputs
    promptNameInput.value = '';
    promptTextInput.value = '';
    
    // Reset editing state
    saveButton.textContent = 'Save Prompt';
    saveButton.removeAttribute('data-editing');
    saveButton.removeAttribute('data-original-name');
    cancelButton.style.display = 'none';
    
    // Clear message
    statusMessage.textContent = '';
    statusMessage.className = 'status-message';
    
    // Toggle form if we're just canceling an edit
    const form = document.querySelector('.prompt-bank-form');
    const toggle = document.querySelector('.add-prompt-toggle');
    form.classList.add('collapsed');
    toggle.classList.add('collapsed');
  });
}

// Edit a prompt from the sidebar
function editPrompt(name, text) {
  const promptNameInput = document.getElementById('sidebar-prompt-name');
  const promptTextInput = document.getElementById('sidebar-prompt-text');
  const saveButton = document.getElementById('sidebar-save-button');
  const cancelButton = document.getElementById('sidebar-cancel-button');
  const statusMessage = document.getElementById('sidebar-status-message');
  
  if (!promptNameInput || !promptTextInput || !saveButton || !statusMessage || !cancelButton) return;
  
  // Make sure form is visible
  const form = document.querySelector('.prompt-bank-form');
  const toggle = document.querySelector('.add-prompt-toggle');
  if (form.classList.contains('collapsed')) {
    form.classList.remove('collapsed');
    toggle.classList.remove('collapsed');
  }
  
  // Fill in the form with existing prompt
  promptNameInput.value = name;
  promptTextInput.value = text;
  
  // Set editing state
  saveButton.textContent = 'Update Prompt';
  saveButton.setAttribute('data-editing', 'true');
  saveButton.setAttribute('data-original-name', name);
  cancelButton.style.display = 'inline-block';
  
  // Show message to user
  statusMessage.textContent = 'Editing prompt: "' + name + '".';
  statusMessage.className = 'status-message info';
  
  // Scroll to the top of the sidebar to see the form
  const sidebar = document.getElementById('prompt-bank-sidebar');
  if (sidebar) sidebar.scrollTop = 0;
}

// Delete a prompt from the sidebar
function deletePrompt(name) {
  if (confirm(`Are you sure you want to delete the prompt "${name}"?`)) {
    chrome.storage.local.get('prompts', function(data) {
      const prompts = data.prompts || {};
      
      if (prompts[name]) {
        delete prompts[name];
        
        chrome.storage.local.set({ prompts: prompts }, function() {
          // Reload prompts
          loadPrompts();
          
          // Show success message
          const statusMessage = document.getElementById('sidebar-status-message');
          if (statusMessage) {
            statusMessage.textContent = `Deleted prompt: "${name}"`;
            statusMessage.className = 'status-message success';
            
            setTimeout(function() {
              statusMessage.textContent = '';
              statusMessage.className = 'status-message';
            }, 3000);
          }
        });
      }
    });
  }
}

// Load prompts from storage and display in sidebar
function loadPrompts() {
  const promptList = document.getElementById('prompt-bank-list');
  if (!promptList) return;
  
  // Load settings for compact mode and auto-submit
  chrome.storage.local.get(['prompts', 'compactMode', 'autoSubmit'], function(data) {
    const prompts = data.prompts || {};
    const compactMode = data.compactMode || false;
    const autoSubmit = data.autoSubmit || false;
    
    if (Object.keys(prompts).length === 0) {
      promptList.innerHTML = '<p class="prompt-bank-empty">No prompts saved yet.</p>';
      return;
    }
    
    promptList.innerHTML = '';
    
    // Create settings section with toggles
    const settingsSection = document.createElement('div');
    settingsSection.className = 'sidebar-settings';
    
    // Compact mode toggle
    const compactToggle = document.createElement('div');
    compactToggle.className = 'sidebar-toggle';
    compactToggle.innerHTML = `
      <label class="toggle-label">
        <input type="checkbox" id="compact-mode-toggle" ${compactMode ? 'checked' : ''}>
        <span>Compact View</span>
      </label>
    `;
    
    // Auto-submit toggle
    const autoSubmitToggle = document.createElement('div');
    autoSubmitToggle.className = 'sidebar-toggle';
    autoSubmitToggle.innerHTML = `
      <label class="toggle-label">
        <input type="checkbox" id="auto-submit-toggle" ${autoSubmit ? 'checked' : ''}>
        <span>Auto-Submit Prompts</span>
      </label>
    `;
    
    // Add toggles to settings section
    settingsSection.appendChild(compactToggle);
    settingsSection.appendChild(autoSubmitToggle);
    
    // Add settings section to the list
    promptList.appendChild(settingsSection);
    
    // Add event listener to compact mode toggle
    const compactToggleCheckbox = compactToggle.querySelector('#compact-mode-toggle');
    compactToggleCheckbox.addEventListener('change', function(e) {
      const isCompact = e.target.checked;
      
      // Save the setting
      chrome.storage.local.set({ compactMode: isCompact });
      
      // Apply compact mode to all items
      const items = document.querySelectorAll('.prompt-bank-item');
      items.forEach(item => {
        const preview = item.querySelector('.prompt-preview');
        if (preview) {
          preview.style.display = isCompact ? 'none' : 'block';
        }
      });
    });
    
    // Add event listener to auto-submit toggle
    const autoSubmitToggleCheckbox = autoSubmitToggle.querySelector('#auto-submit-toggle');
    autoSubmitToggleCheckbox.addEventListener('change', function(e) {
      const isAutoSubmit = e.target.checked;
      
      // Save the setting
      chrome.storage.local.set({ autoSubmit: isAutoSubmit });
    });
    
    // Create and add each prompt item
    for (const name in prompts) {
      const promptItem = document.createElement('div');
      promptItem.className = 'prompt-bank-item';
      
      // Create prompt name element
      const promptName = document.createElement('div');
      promptName.className = 'prompt-name';
      promptName.textContent = name;
      
      // Create actions container
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'prompt-actions';
      
      // Create edit button with title
      const editButton = document.createElement('button');
      editButton.className = 'prompt-edit-btn';
      editButton.title = 'Edit this prompt';
      editButton.innerHTML = '✎'; // Pencil icon
      
      // Create delete button with title
      const deleteButton = document.createElement('button');
      deleteButton.className = 'prompt-delete-btn';
      deleteButton.title = 'Delete this prompt';
      deleteButton.innerHTML = '×'; // X icon
      
      // Add event listeners
      editButton.addEventListener('click', function(e) {
        e.stopPropagation();
        editPrompt(name, prompts[name]);
      });
      
      deleteButton.addEventListener('click', function(e) {
        e.stopPropagation();
        deletePrompt(name);
      });
      
      // Create a preview of the prompt text
      const promptPreview = document.createElement('div');
      promptPreview.className = 'prompt-preview';
      // Truncate text for preview
      const previewText = prompts[name].length > 100 
        ? prompts[name].substring(0, 100) + '...' 
        : prompts[name];
      promptPreview.textContent = previewText;
      
      // Apply compact mode to the preview if needed
      if (compactMode) {
        promptPreview.style.display = 'none';
      }
      
      // Add elements to containers
      actionsContainer.appendChild(editButton);
      actionsContainer.appendChild(deleteButton);
      
      promptItem.appendChild(promptName);
      promptItem.appendChild(promptPreview);
      promptItem.appendChild(actionsContainer);
      
      // Add title attribute for hover to show full prompt text
      promptItem.setAttribute('title', prompts[name]);
      
      // Add click event to insert the prompt
      promptItem.addEventListener('click', function() {
        // Check if auto-submit is enabled (read from current state of checkbox)
        const autoSubmitEnabled = document.getElementById('auto-submit-toggle')?.checked || false;
        insertPromptText(prompts[name], autoSubmitEnabled);
      });
      
      promptList.appendChild(promptItem);
    }
  });
}

// Listen for storage changes to update sidebar
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local') {
    if (changes.prompts) {
      loadPrompts();
    }
    
    if (changes.compactMode && document.getElementById('prompt-bank-sidebar')) {
      const isCompact = changes.compactMode.newValue;
      const items = document.querySelectorAll('.prompt-bank-item .prompt-preview');
      items.forEach(preview => {
        preview.style.display = isCompact ? 'none' : 'block';
      });
      
      const toggle = document.getElementById('compact-mode-toggle');
      if (toggle) {
        toggle.checked = isCompact;
      }
    }
    
    if (changes.autoSubmit && document.getElementById('prompt-bank-sidebar')) {
      const isAutoSubmit = changes.autoSubmit.newValue;
      const toggle = document.getElementById('auto-submit-toggle');
      if (toggle) {
        toggle.checked = isAutoSubmit;
      }
    }
    
    if (changes.sidebarState) {
      // Only update if the change wasn't triggered by this instance
      const timestamp = changes.sidebarState.newValue?.timestamp;
      const currentTimestamp = Date.now();
      
      console.log('Sidebar state changed in storage:', changes.sidebarState.newValue);
      
      // Update the UI regardless of timestamp to ensure state consistency
      const isCollapsed = changes.sidebarState.newValue?.collapsed === true;
      const sidebar = document.getElementById('prompt-bank-sidebar');
      const toggleButton = document.querySelector('.prompt-bank-toggle');
      
      if (sidebar) {
        if (isCollapsed) {
          sidebar.classList.add('collapsed');
          document.body.classList.add('prompt-bank-collapsed');
        } else {
          sidebar.classList.remove('collapsed');
          document.body.classList.remove('prompt-bank-collapsed');
        }
        
        if (toggleButton) {
          // PB when collapsed, × when expanded
          toggleButton.innerHTML = isCollapsed ? 'PB' : '×';
          console.log('Updated toggle button from storage change to:', isCollapsed ? 'PB (collapsed)' : '× (expanded)');
        }
      }
    }
  }
});

// Initialize when DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePromptBank);
} else {
  initializePromptBank();
}

// Initialize the prompt bank
function initializePromptBank() {
  // Add the loading class to prevent the sidebar from flashing
  document.documentElement.classList.add('prompt-bank-loading');
  
  // Create the sidebar (which will check the saved state)
  createPromptSidebar();
  
  // Remove the loading class after a brief delay to ensure smooth transition
  setTimeout(() => {
    document.documentElement.classList.remove('prompt-bank-loading');
    
    // Verify toggle button functionality
    verifyToggleButton();
    
    // Test toggle after initialization
    testToggleFunctionality();
  }, 300);
}

// Verify that the toggle button is working properly
function verifyToggleButton() {
  const toggleButton = document.querySelector('.prompt-bank-toggle');
  if (!toggleButton) {
    console.error('Toggle button not found during verification');
    
    // Try to recreate the toggle button if it doesn't exist
    const sidebar = document.getElementById('prompt-bank-sidebar');
    if (sidebar) {
      chrome.storage.local.get('sidebarState', function(data) {
        const isCollapsed = data.sidebarState?.collapsed === true;
        
        const newToggleButton = document.createElement('div');
        newToggleButton.className = 'prompt-bank-toggle';
        // PB when collapsed, × when expanded
        newToggleButton.innerHTML = isCollapsed ? 'PB' : '×';
        console.log('Creating replacement toggle button with state:', isCollapsed ? 'PB (collapsed)' : '× (expanded)');
        
        newToggleButton.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          toggleSidebar();
          console.log('Recreated toggle button clicked');
        });
        
        document.body.appendChild(newToggleButton);
        console.log('Toggle button recreated');
      });
    }
  } else {
    console.log('Toggle button verified');
    
    // Ensure it has a click handler
    const oldClick = toggleButton.onclick;
    if (!oldClick) {
      toggleButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
        console.log('Fixed toggle button clicked');
      });
      console.log('Added missing click handler to toggle button');
    }
    
    // Double-check that the toggle button has the correct text
    chrome.storage.local.get('sidebarState', function(data) {
      const isCollapsed = data.sidebarState?.collapsed === true;
      const sidebar = document.getElementById('prompt-bank-sidebar');
      
      // If sidebar exists, make sure button text matches sidebar state
      if (sidebar) {
        const sidebarCollapsed = sidebar.classList.contains('collapsed');
        if ((sidebarCollapsed && toggleButton.innerHTML !== 'PB') ||
            (!sidebarCollapsed && toggleButton.innerHTML !== '×')) {
          toggleButton.innerHTML = sidebarCollapsed ? 'PB' : '×';
          console.log('Fixed inconsistent toggle button text to:', sidebarCollapsed ? 'PB (collapsed)' : '× (expanded)');
        }
      }
    });
  }
}

// Test function to validate toggle is working
function testToggleFunctionality() {
  // This function will just test if the toggle button is functioning correctly
  const toggleButton = document.querySelector('.prompt-bank-toggle');
  const sidebar = document.getElementById('prompt-bank-sidebar');
  
  if (toggleButton && sidebar) {
    console.log('Toggle test - sidebar state:', sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
    console.log('Toggle test - toggle button text:', toggleButton.innerHTML);
    console.log('Toggle test - ensure click handler works by checking event listeners');
    
    // Force toggle button to have the correct appearance and z-index
    toggleButton.style.zIndex = '9999';
    toggleButton.style.visibility = 'visible';
    toggleButton.style.opacity = '1';
    
    // Re-assign click handler to ensure it works
    toggleButton.onclick = function(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      toggleSidebar();
      console.log('Toggle clicked from test function');
      return false;
    };
  } else {
    console.error('Toggle test failed - missing elements:', 
                 !toggleButton ? 'toggle button' : '', 
                 !sidebar ? 'sidebar' : '');
  }
}

// Also add a MutationObserver to handle dynamic page changes in SPAs
const observer = new MutationObserver(function(mutations) {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      // Only create a new sidebar if one doesn't exist yet
      if (!document.getElementById('prompt-bank-sidebar')) {
        // Add loading class
        document.documentElement.classList.add('prompt-bank-loading');
        
        // Create sidebar
        createPromptSidebar();
        
        // Remove loading class after brief delay
        setTimeout(() => {
          document.documentElement.classList.remove('prompt-bank-loading');
          
          // Verify toggle button functionality after creating sidebar
          verifyToggleButton();
          
          // Test toggle functionality
          testToggleFunctionality();
        }, 300);
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true }); 