// Action queue to store pending actions
let actionQueue: any[] = [];

// Listener 1: Append actions to action queue
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'APPEND_ACTION') {
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