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

// Check if we're on Amazon
function isAmazonWebsite(): boolean {
  return window.location.hostname.includes('amazon');
}

// Action execution loop
async function executeActionLoop() {
  while (true) {
    try {
      // Only execute actions on Amazon websites
      if (!isAmazonWebsite()) {
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
        console.log(`Executing action on Amazon: ${response.action}`);
        
        let result;
        
        // Perform action based on type
        switch (response.action) {
          case 'buy_now':
            result = await buyNowAction();
            console.log('Buy Now Action Result:', result);
            break;
          case 'cash_on_delivery':
            result = await cashOnDeliveryPaymentAction();
            console.log('Cash on Delivery Action Result:', result);
            break;
          case 'place_order':
            result = await placeYourOrderAction();
            console.log('Place Order Action Result:', result);
            break;
          default:
            console.warn(`Unknown action: ${response.action}`);
        }
        
        // Show result notification
        if (result) {
          showActionNotification(response.action, result);
        }
        
        // Small delay between actions
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // No actions in queue, wait before checking again
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error('Action execution error:', error);
      // Wait before retrying on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Show action notification
function showActionNotification(action: string, result: any) {
  const actionNames = {
    'buy_now': 'Buy Now',
    'cash_on_delivery': 'Cash on Delivery',
    'place_order': 'Place Order'
  };
  
  const actionName = actionNames[action as keyof typeof actionNames] || action;
  const message = result.success ? 
    `✅ ${actionName}: ${result.message}` : 
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

// Start action execution loop
executeActionLoop();

// Make it available globally for debugging
declare global {
  interface Window {
    floatingFrameManager: FloatingFrameManager;
  }
}