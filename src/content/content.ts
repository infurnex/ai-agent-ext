import { FloatingFrameManager } from "./FrameManager";
import { buyNowAction } from "./actions/buyNowAction";
import { cashOnDeliveryPaymentAction } from "./actions/cashOnDeliveryPaymentAction";
import { placeYourOrderAction } from "./actions/placeYourOrderAction";

// Initialize the floating frame manager
if (typeof window !== 'undefined') {
  // Ensure we only inject once per page
  if (!window.floatingFrameManager) {
    window.floatingFrameManager = new FloatingFrameManager();
  }
}

// Helper function to check if extension context is valid
function isExtensionContextValid(): boolean {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (error) {
    return false;
  }
}

// Helper function to send message with error handling
async function sendMessageSafely(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!isExtensionContextValid()) {
      reject(new Error('Extension context invalidated'));
      return;
    }

    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Action execution loop with improved error handling
async function executeActionLoop() {
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 5;
  const baseRetryDelay = 2000;

  while (true) {
    try {
      // Check if extension context is still valid
      if (!isExtensionContextValid()) {
        console.warn('Extension context invalidated, stopping action loop');
        break;
      }

      // Fetch action from background with timeout
      const response = await Promise.race([
        sendMessageSafely({ type: 'POP_ACTION' }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
      ]) as {success: boolean, action: string | null, queueLength: number};

      if (response.success && response.action) {
        console.log(`Executing action: ${response.action}`);
        
        // Reset error counter on successful communication
        consecutiveErrors = 0;
        
        // Perform action based on type
        try {
          switch (response.action) {
            case 'buy_now':
              const buyResult = await buyNowAction();
              console.log('Buy now result:', buyResult);
              break;
            case 'cash_on_delivery':
              const codResult = await cashOnDeliveryPaymentAction();
              console.log('Cash on delivery result:', codResult);
              break;
            case 'place_order':
              const orderResult = await placeYourOrderAction();
              console.log('Place order result:', orderResult);
              break;
            default:
              console.warn(`Unknown action: ${response.action}`);
          }
        } catch (actionError) {
          console.error(`Action execution failed for ${response.action}:`, actionError);
        }
        
        // Small delay between actions
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // No actions in queue, wait before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      consecutiveErrors++;
      console.error(`Action execution error (${consecutiveErrors}/${maxConsecutiveErrors}):`, error);
      
      // If we hit max consecutive errors, stop the loop
      if (consecutiveErrors >= maxConsecutiveErrors) {
        console.error('Too many consecutive errors, stopping action loop');
        break;
      }
      
      // Exponential backoff for retries
      const retryDelay = Math.min(baseRetryDelay * Math.pow(2, consecutiveErrors - 1), 30000);
      console.log(`Retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  console.log('Action execution loop stopped');
}

// Start action execution loop with initial delay
setTimeout(() => {
  if (isExtensionContextValid()) {
    executeActionLoop();
  } else {
    console.warn('Extension context not available, skipping action loop');
  }
}, 1000);

// Listen for page visibility changes to restart loop if needed
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && isExtensionContextValid()) {
    // Restart action loop if page becomes visible and context is valid
    setTimeout(executeActionLoop, 2000);
  }
});

// Make it available globally for debugging
declare global {
  interface Window {
    floatingFrameManager: FloatingFrameManager;
  }
}