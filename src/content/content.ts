import { FloatingFrameManager } from "./FrameManager";
import { selectAndClickAction } from "./actions/selectAndClickAction";

// Check if we're on Amazon
function isAmazonWebsite(): boolean {
  return window.location.hostname.includes('amazon');
}

// Enhanced page load detection
async function waitForPageLoad(): Promise<void> {
  return new Promise((resolve) => {
    // If document is already loaded
    if (document.readyState === 'complete') {
      // Additional wait for dynamic content and scripts
      setTimeout(resolve, 2000);
      return;
    }

    // Wait for document to be ready
    const checkReady = () => {
      if (document.readyState === 'complete') {
        // Additional wait for dynamic content and scripts
        setTimeout(resolve, 2000);
      } else {
        setTimeout(checkReady, 100);
      }
    };

    checkReady();
  });
}

// Wait for page stability (no major DOM changes)
async function waitForPageStability(): Promise<void> {
  return new Promise((resolve) => {
    let changeCount = 0;
    let lastChangeTime = Date.now();
    
    const observer = new MutationObserver(() => {
      changeCount++;
      lastChangeTime = Date.now();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
    
    const checkStability = () => {
      const timeSinceLastChange = Date.now() - lastChangeTime;
      
      // If no changes for 1 second, consider page stable
      if (timeSinceLastChange >= 1000) {
        observer.disconnect();
        resolve();
      } else {
        setTimeout(checkStability, 200);
      }
    };
    
    // Start checking after initial delay
    setTimeout(checkStability, 500);
    
    // Maximum wait time of 10 seconds
    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 10000);
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

// Get queue length
async function getQueueLength(): Promise<number> {
  try {
    const response = await new Promise<{success: boolean, queueLength: number}>((resolve) => {
      chrome.runtime.sendMessage({
        type: 'GET_QUEUE_LENGTH'
      }, resolve);
    });
    
    return response.success ? response.queueLength : 0;
  } catch (error) {
    console.error('Error getting queue length:', error);
    return 0;
  }
}

// Fetch next action from queue
async function fetchNextAction(): Promise<{success: boolean, action: any | null, queueLength: number}> {
  try {
    const response = await new Promise<{success: boolean, action: any | null, queueLength: number}>((resolve) => {
      chrome.runtime.sendMessage({
        type: 'POP_ACTION'
      }, resolve);
    });
    
    return response;
  } catch (error) {
    console.error('Error fetching action:', error);
    return { success: false, action: null, queueLength: 0 };
  }
}

// Action execution loop with proper timing
async function executeActionLoop() {
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 3;
  
  console.log('🚀 Action execution loop started');
  
  while (true) {
    try {
      // Only execute actions on Amazon websites
      if (!isAmazonWebsite()) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // STEP 1: Wait for page to be fully loaded and stable
      console.log('⏳ Waiting for page to be fully loaded...');
      await waitForPageLoad();
      
      console.log('⏳ Waiting for page stability...');
      await waitForPageStability();
      
      console.log('✅ Page is ready, checking for actions...');

      // STEP 2: Fetch next action from queue
      const response = await fetchNextAction();

      if (response.success && response.action) {
        const actionData = response.action;
        console.log(`🎯 Executing action on Amazon:`, actionData);
        
        let result;
        
        // STEP 3: Execute the action
        if (actionData.tag && actionData.attributes) {
          result = await selectAndClickAction({
            tag: actionData.tag,
            attributes: actionData.attributes
          });
          
          console.log(`📊 ${actionData.action} Result:`, result);
          
          // Show result notification
          showActionNotification(actionData.action, result);
          
          if (result.success) {
            // Reset consecutive failures on success
            consecutiveFailures = 0;
            
            console.log(`✅ Action "${actionData.action}" completed successfully`);
            
            // STEP 4: Wait after successful action to allow page transitions
            console.log('⏳ Waiting for page transition after successful action...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // STEP 5: Check if there are more actions in queue
            const queueLength = await getQueueLength();
            if (queueLength > 0) {
              console.log(`📋 ${queueLength} more actions in queue, continuing to next action...`);
              // Continue to next iteration immediately to process next action
              continue;
            } else {
              console.log('🏁 No more actions in queue, waiting for new actions...');
            }
          } else {
            // Increment consecutive failures
            consecutiveFailures++;
            
            console.warn(`❌ Action "${actionData.action}" failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, result.message);
            
            // If we've had too many consecutive failures, clear the queue
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
              console.error(`🚫 Too many consecutive failures (${MAX_CONSECUTIVE_FAILURES}). Clearing queue to prevent infinite retries.`);
              await clearActionQueue();
              consecutiveFailures = 0;
              
              // Show error notification
              showActionNotification('Queue Cleared', {
                success: false,
                message: `Cleared queue after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`
              });
            }
            
            // Wait before trying next action or checking queue again
            console.log('⏳ Waiting before next attempt...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } else {
          console.warn(`⚠️ Invalid action format:`, actionData);
          consecutiveFailures++;
          
          // Clear queue on invalid action format after multiple failures
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            await clearActionQueue();
            consecutiveFailures = 0;
          }
        }
        
        // Small delay between actions
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // No actions in queue, reset consecutive failures and wait before checking again
        consecutiveFailures = 0;
        console.log('💤 No actions in queue, waiting...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error('💥 Action execution error:', error);
      consecutiveFailures++;
      
      // Clear queue only after multiple consecutive errors
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`🚫 Too many consecutive errors. Clearing queue.`);
        await clearActionQueue();
        consecutiveFailures = 0;
      }
      
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

// Initialize extension
async function initializeExtension() {
  // Start action execution loop FIRST
  executeActionLoop();

  // Initialize the floating frame manager AFTER execution loop
  if (typeof window !== 'undefined') {
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