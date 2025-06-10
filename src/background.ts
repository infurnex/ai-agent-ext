// Action queue to store pending actions
let actionQueue: any[] = [];

// Extension state
let isExtensionEnabled = true;

// Initialize extension state from storage
chrome.storage.local.get(['extensionEnabled']).then((result) => {
  isExtensionEnabled = result.extensionEnabled !== false; // Default to true
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.extensionEnabled) {
    isExtensionEnabled = changes.extensionEnabled.newValue !== false;
    
    // If extension is disabled, clear the queue
    if (!isExtensionEnabled) {
      actionQueue = [];
      console.log('Extension disabled, action queue cleared');
    }
  }
});

// Listener 1: Append actions to action queue
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'APPEND_ACTION') {
    // Check if extension is enabled
    if (!isExtensionEnabled) {
      sendResponse({ 
        success: false, 
        error: 'Extension is disabled. Enable it from the popup to queue actions.' 
      });
      return true;
    }

    const { action } = request;
    
    if (action && typeof action === 'object') {
      actionQueue.push(action);
      sendResponse({ success: true, queueLength: actionQueue.length });
    } else {
      sendResponse({ success: false, error: 'Action must be an object' });
    }
    
    return true; // Keep message channel open for async response
  }
});

// Listener 2: Pop/remove first available task from action queue and return
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'POP_ACTION') {
    // Check if extension is enabled
    if (!isExtensionEnabled) {
      sendResponse({ 
        success: true, 
        action: null, 
        queueLength: 0 
      });
      return true;
    }

    const action = actionQueue.shift(); // Remove and return first element
    
    sendResponse({ 
      success: true, 
      action: action || null, 
      queueLength: actionQueue.length 
    });
    
    return true; // Keep message channel open for async response
  }
});

// Listener 3: Clear/empty the entire action queue
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CLEAR_QUEUE') {
    const previousLength = actionQueue.length;
    actionQueue = []; // Clear the entire queue
    
    sendResponse({ 
      success: true, 
      message: `Queue cleared. Removed ${previousLength} action(s).`,
      previousLength: previousLength,
      queueLength: 0 
    });
    
    return true; // Keep message channel open for async response
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  // Set default enabled state
  chrome.storage.local.set({ extensionEnabled: true });
  isExtensionEnabled = true;
  console.log('AI Shopping Assistant extension installed and enabled');
});