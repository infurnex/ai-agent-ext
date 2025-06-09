import { FloatingFrameManager } from "./FrameManager";
import { buyNowAction } from "./actions/buyNowAction";
import { cashOnDeliveryPaymentAction } from "./actions/cashOnDeliveryPaymentAction";
import { placeYourOrderAction } from "./actions/placeYourOrderAction";

// Check authentication before initializing
async function checkAuthentication(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['isAuthenticated'], (result) => {
      resolve(result.isAuthenticated === true);
    });
  });
}

// Initialize the floating frame manager only if authenticated
async function initializeExtension() {
  const isAuthenticated = await checkAuthentication();
  
  if (!isAuthenticated) {
    console.log('User not authenticated. Extension features disabled.');
    return;
  }

  // Ensure we only inject once per page
  if (typeof window !== 'undefined' && !window.floatingFrameManager) {
    window.floatingFrameManager = new FloatingFrameManager();
    console.log('Extension initialized for authenticated user.');
  }
}

// Listen for authentication state changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.isAuthenticated) {
    if (changes.isAuthenticated.newValue === true) {
      // User just logged in, initialize extension
      initializeExtension();
    } else if (changes.isAuthenticated.newValue === false) {
      // User logged out, cleanup extension
      if (window.floatingFrameManager) {
        // Remove floating frame if it exists
        try {
          window.floatingFrameManager.cleanup?.();
        } catch (error) {
          console.error('Error cleaning up extension:', error);
        }
        window.floatingFrameManager = null;
      }
      console.log('User logged out. Extension features disabled.');
    }
  }
});

// Action execution loop - only run if authenticated
async function executeActionLoop() {
  while (true) {
    try {
      // Check authentication before executing actions
      const isAuthenticated = await checkAuthentication();
      
      if (!isAuthenticated) {
        // Wait longer if not authenticated
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Fetch action from background
      const response = await new Promise<{success: boolean, action: string | null, queueLength: number}>((resolve) => {
        chrome.runtime.sendMessage({
          type: 'POP_ACTION'
        }, resolve);
      });

      if (response.success && response.action) {
        console.log(`Executing action: ${response.action}`);
        
        // Perform action based on type
        switch (response.action) {
          case 'buy_now':
            await buyNowAction();
            break;
          case 'cash_on_delivery':
            await cashOnDeliveryPaymentAction();
            break;
          case 'place_order':
            await placeYourOrderAction();
            break;
          default:
            console.warn(`Unknown action: ${response.action}`);
        }
        
        // Small delay between actions
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // No actions in queue, wait before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error('Action execution error:', error);
      // Wait before retrying on error
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

// Initialize extension on load
initializeExtension();

// Start action execution loop
executeActionLoop();

// Make it available globally for debugging
declare global {
  interface Window {
    floatingFrameManager: FloatingFrameManager | null;
  }
}