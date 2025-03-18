// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Prompt Bank extension installed');
});

// When users click the extension icon, navigate to ChatGPT if not already there
chrome.action.onClicked.addListener((tab) => {
  const isChatGPT = tab.url && (tab.url.includes('chat.openai.com') || tab.url.includes('chatgpt.com'));
  
  if (isChatGPT) {
    // We're already on ChatGPT, toggle the sidebar
    chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
  } else {
    // Navigate to ChatGPT
    chrome.tabs.create({ url: 'https://chat.openai.com/' });
  }
});

// Listen for tab updates to inject content scripts when on ChatGPT
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isChatGPT = tab.url.includes('chat.openai.com') || tab.url.includes('chatgpt.com');
    
    if (isChatGPT) {
      console.log('ChatGPT page detected, ensuring content script is loaded');
      
      // Try to ping the content script to see if it's already loaded
      chrome.tabs.sendMessage(tabId, { action: 'ping' }, response => {
        if (chrome.runtime.lastError) {
          // Content script is not loaded, inject it
          console.log('Content script not responding, injecting it');
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          }).catch(err => console.error('Error injecting content script:', err));
          
          // Also inject the CSS
          chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ['styles.css']
          }).catch(err => console.error('Error injecting CSS:', err));
        } else {
          console.log('Content script is already loaded');
        }
      });
    }
  }
}); 