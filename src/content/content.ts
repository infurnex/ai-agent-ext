import { FloatingFrameManager } from "./FrameManager";
import { buyNowAction } from "./actions/buyNowAction";
import { cashOnDeliveryPaymentAction } from "./actions/cashOnDeliveryPaymentAction";
import { placeYourOrderAction } from "./actions/placeYourOrderAction";

// Check if current URL is Amazon
function isAmazonURL(): boolean {
  const hostname = window.location.hostname.toLowerCase();
  return hostname.includes('amazon.') || 
         hostname.includes('amazon.com') || 
         hostname.includes('amazon.in') ||
         hostname.includes('amazon.co.uk') ||
         hostname.includes('amazon.de') ||
         hostname.includes('amazon.fr') ||
         hostname.includes('amazon.it') ||
         hostname.includes('amazon.es') ||
         hostname.includes('amazon.ca') ||
         hostname.includes('amazon.com.au') ||
         hostname.includes('amazon.co.jp');
}

// Initialize the floating frame manager only on Amazon URLs
if (typeof window !== 'undefined' && isAmazonURL()) {
  // Ensure we only inject once per page
  if (!window.floatingFrameManager) {
    console.log('Initializing floating frame on Amazon URL:', window.location.href);
    window.floatingFrameManager = new FloatingFrameManager();
  }
} else {
  console.log('Floating frame not initialized - not on Amazon URL:', window.location.href);
}

// Action execution loop
async function executeActionLoop() {
  while (true) {
    try {
      // Only execute actions if we're on Amazon
      if (!isAmazonURL()) {
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

// Start action execution loop only on Amazon
if (isAmazonURL()) {
  executeActionLoop();
}

// Make it available globally for debugging
declare global {
  interface Window {
    floatingFrameManager: FloatingFrameManager;
  }
}