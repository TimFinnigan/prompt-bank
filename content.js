// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'insertPrompt') {
    console.log('Received request to insert prompt:', request.text.substring(0, 20) + '...');
    const success = insertPromptText(request.text);
    sendResponse({ success: success });
    return true; // Keep the message channel open for the async response
  } else if (request.action === 'ping') {
    // Simple ping to check if content script is available
    console.log('Ping received from popup');
    sendResponse({ success: true, message: 'Content script is active' });
    return true;
  }
});

// Function to insert text into ChatGPT's input field
function insertPromptText(text) {
  try {
    console.log('Attempting to insert prompt text');
    
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
      
      // ProseMirror uses <p> elements for paragraphs
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      inputElement.appendChild(paragraph);
      
      // Dispatch input event
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true
      });
      inputElement.dispatchEvent(inputEvent);
      
      // Focus the element
      inputElement.focus();
      
      console.log('Used ProseMirror method');
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
      console.log('Used textarea method');
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
            
            // For the first line
            if (lines.length > 0) {
              const firstParagraph = document.createElement('p');
              firstParagraph.textContent = lines[0];
              inputElement.appendChild(firstParagraph);
              
              // For additional lines
              for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() !== '') {
                  const paragraph = document.createElement('p');
                  paragraph.textContent = lines[i];
                  inputElement.appendChild(paragraph);
                } else {
                  // For empty lines
                  inputElement.appendChild(document.createElement('br'));
                }
              }
            } else {
              // If the input is empty, insert a paragraph anyway
              const paragraph = document.createElement('p');
              paragraph.innerHTML = '<br>';
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
    }
    
    // Focus the input element
    inputElement.focus();
    
    // Try to find and enable the send button if it exists
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
      console.log('Found send button:', sendButton);
      if (sendButton.disabled === true) {
        console.log('Enabling disabled send button');
        sendButton.disabled = false;
      }
      
      // Try to click the send button automatically
      setTimeout(() => {
        try {
          // Uncomment this if you want the extension to automatically send the message
          // sendButton.click();
          console.log('Ready to send');
        } catch (e) {
          console.error('Error clicking send button:', e);
        }
      }, 500);
    } else {
      console.log('No send button found');
    }
    
    console.log('Prompt insertion complete');
    return true;
  } catch (error) {
    console.error('Error inserting prompt text:', error);
    return false;
  }
}

// Add a sidebar for prompts
function createPromptSidebar() {
  // Check if sidebar already exists
  if (document.getElementById('prompt-bank-sidebar')) {
    return;
  }
  
  // Create sidebar container
  const sidebar = document.createElement('div');
  sidebar.id = 'prompt-bank-sidebar';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'prompt-bank-header';
  header.innerHTML = '<h2>Prompt Bank</h2>';
  
  // Create prompt list container
  const promptList = document.createElement('div');
  promptList.id = 'prompt-bank-list';
  
  // Add elements to sidebar
  sidebar.appendChild(header);
  sidebar.appendChild(promptList);
  
  // Create toggle button for mobile
  const toggleButton = document.createElement('div');
  toggleButton.className = 'prompt-bank-toggle';
  toggleButton.innerHTML = 'PB';
  toggleButton.addEventListener('click', function() {
    sidebar.classList.toggle('active');
  });
  
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
    // Load and display prompts
    loadPrompts();
  }
}

// Load prompts from storage and display in sidebar
function loadPrompts() {
  const promptList = document.getElementById('prompt-bank-list');
  if (!promptList) return;
  
  chrome.storage.local.get('prompts', function(data) {
    const prompts = data.prompts || {};
    
    if (Object.keys(prompts).length === 0) {
      promptList.innerHTML = '<p class="prompt-bank-empty">No prompts saved yet.</p>';
      return;
    }
    
    promptList.innerHTML = '';
    
    for (const name in prompts) {
      const promptItem = document.createElement('div');
      promptItem.className = 'prompt-bank-item';
      promptItem.textContent = name;
      
      promptItem.addEventListener('click', function() {
        insertPromptText(prompts[name]);
      });
      
      promptList.appendChild(promptItem);
    }
  });
}

// Listen for storage changes to update sidebar
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && changes.prompts) {
    loadPrompts();
  }
});

// Initialize when DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createPromptSidebar);
} else {
  createPromptSidebar();
}

// Also add a MutationObserver to handle dynamic page changes in SPAs
const observer = new MutationObserver(function(mutations) {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      createPromptSidebar();
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true }); 