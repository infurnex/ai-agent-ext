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

// Action execution loop
async function executeActionLoop() {
  while (true) {
    try {
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

// Start action execution loop
executeActionLoop();

// Make it available globally for debugging
declare global {
  interface Window {
    floatingFrameManager: FloatingFrameManager;
  }
}