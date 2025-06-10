import { FloatingFrameManager } from "./FrameManager";
import { selectAndClickAction } from "./actions/selectAndClickAction";

// Extension state
let extensionEnabled = true;

// Check if we're on Amazon
function isAmazonWebsite(): boolean {
  return window.location.hostname.includes('amazon');
}

// Load extension state from storage
async function loadExtensionState(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['extensionEnabled']);
    extensionEnabled = result.extensionEnabled !== false; // Default to true
  } catch (error) {
    console.error('Failed to load extension state:', error);
    extensionEnabled = true; // Default fallback
  }
}

// Wait for DOM and page content to fully load
async function waitForPageLoad(): Promise<void> {
  return new Promise((resolve) => {
    // If document is already loaded
    if (document.readyState === 'complete') {
      // Additional wait for dynamic content
      setTimeout(resolve, 1000);
      return;
    }

    // Wait for document to be ready
    const checkReady = () => {
      if (document.readyState === 'complete') {
        // Additional wait for dynamic content and scripts
        setTimeout(resolve, 1000);
      } else {
        setTimeout(checkReady, 100);
      }
    };

    checkReady();
  });
}

// Clear action queue function
async function clearActionQueue(): Promise<void> {
  try {
    await new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({
        type: 'CLEAR_QUEUE'
      }, (response) => {
        if (response?.success) {
          console.log('Action queue cleared:', response.message);
        } else {
          console.error('Failed to clear queue:', response?.error);
        }
        resolve();
      });
    });
  } catch (error) {
    console.error('Error clearing queue:', error);
  }
}

// Action execution loop
async function executeActionLoop() {
  while (true) {
    try {
      // Check if extension is enabled
      if (!extensionEnabled) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Only execute actions on Amazon websites
      if (!isAmazonWebsite()) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Fetch action from background
      const response = await new Promise<{success: boolean, action: any | null, queueLength: number}>((resolve) => {
        chrome.runtime.sendMessage({
          type: 'POP_ACTION'
        }, resolve);
      });

      if (response.success && response.action) {
        const actionData = response.action;
        console.log(`Executing action on Amazon:`, actionData);
        
        // Wait for DOM/page content to fully load before performing action
        console.log('Waiting for page to fully load...');
        await waitForPageLoad();
        console.log('Page loaded, proceeding with action...');
        
        let result;
        
        // Execute selectAndClickAction with the provided parameters
        if (actionData.tag && actionData.attributes) {
          result = await selectAndClickAction({
            tag: actionData.tag,
            attributes: actionData.attributes
          });
          
          console.log(`${actionData.action} Result:`, result);
          
          // If action failed, clear the queue to prevent further actions
          if (!result.success) {
            console.warn(`Action "${actionData.action}" failed. Clearing remaining actions from queue.`);
            await clearActionQueue();
            showActionNotification(actionData.action, result);
            // Continue the loop but queue is now empty
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
          
          // Show result notification
          showActionNotification(actionData.action, result);
        } else {
          console.warn(`Invalid action format:`, actionData);
          // Clear queue on invalid action format
          await clearActionQueue();
        }
        
        // Small delay between actions
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // No actions in queue, wait before checking again
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error('Action execution error:', error);
      // Clear queue on execution error
      await clearActionQueue();
      // Wait before retrying on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Show action notification
function showActionNotification(actionName: string, result: any) {
  const message = result.success ? 
    `✅ ${actionName}` : 
    `❌ ${actionName}: ${result.message}`;
  
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${result.success ? '#10b981' : '#ef4444'};
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    max-width: 400px;
    word-wrap: break-word;
    animation: slideIn 0.3s ease-out;
  `;
  
  // Add animation keyframes
  if (!document.getElementById('action-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'action-notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Remove notification after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Listen for extension state changes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTENSION_STATE_CHANGED') {
    extensionEnabled = request.enabled;
    console.log('Extension state changed:', extensionEnabled ? 'enabled' : 'disabled');
    
    // Update floating frame visibility based on state
    if (window.floatingFrameManager) {
      if (extensionEnabled) {
        // Re-inject frame if it was removed
        if (!window.floatingFrameManager.isInjected) {
          window.floatingFrameManager.init();
        }
      } else {
        // Remove frame when disabled
        window.floatingFrameManager.removeFrame();
      }
    }
    
    sendResponse({ success: true });
  }
});

// Initialize extension
async function initializeExtension() {
  // Load extension state first
  await loadExtensionState();
  
  // Start action execution loop FIRST
  executeActionLoop();

  // Initialize the floating frame manager AFTER execution loop (only if enabled)
  if (typeof window !== 'undefined' && extensionEnabled) {
    // Ensure we only inject once per page
    if (!window.floatingFrameManager) {
      window.floatingFrameManager = new FloatingFrameManager();
    }
  }
}

// Start initialization
initializeExtension();

// Make it available globally for debugging
declare global {
  interface Window {
    floatingFrameManager: FloatingFrameManager;
  }
}