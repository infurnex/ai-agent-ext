export interface PlaceOrderResult {
  success: boolean;
  message: string;
  buttonFound?: boolean;
  buttonText?: string;
  selector?: string;
  isOrderReviewPage?: boolean;
}

export async function placeYourOrderAction(): Promise<PlaceOrderResult> {
  try {
    // Check if we're on Amazon
    const isAmazon = window.location.hostname.includes('amazon');
    
    if (!isAmazon) {
      return {
        success: false,
        message: 'This action is designed specifically for Amazon. Please navigate to an Amazon order review page.',
        buttonFound: false,
        isOrderReviewPage: false
      };
    }

    // Check if we're on an order review/checkout page
    const isOrderReviewPage = window.location.pathname.includes('checkout') || 
                             window.location.pathname.includes('order') ||
                             window.location.pathname.includes('review') ||
                             document.title.toLowerCase().includes('review') ||
                             document.title.toLowerCase().includes('order') ||
                             document.body.textContent?.includes('Place your order') ||
                             document.body.textContent?.includes('Review your order');

    if (!isOrderReviewPage) {
      return {
        success: false,
        message: 'Please navigate to the Amazon order review page first. This action should be used on the final checkout step.',
        buttonFound: false,
        isOrderReviewPage: false
      };
    }

    // Amazon-specific "Place Your Order" button selectors
    const placeOrderSelectors = [
      // Primary place order button selectors
      '#placeYourOrder',
      '#place-your-order-button',
      'input[name="placeYourOrder1"]',
      'input[name="placeYourOrder"]',
      'button[name="placeYourOrder"]',
      
      // Alternative place order selectors
      'input[value*="Place your order" i]',
      'input[value*="Place order" i]',
      'button[aria-label*="Place your order" i]',
      'button[aria-label*="Place order" i]',
      
      // Complete order selectors
      'input[value*="Complete order" i]',
      'button[aria-label*="Complete order" i]',
      'input[name*="complete-order"]',
      'button[name*="complete-order"]',
      
      // Submit order selectors
      'input[value*="Submit order" i]',
      'button[aria-label*="Submit order" i]',
      'input[name*="submit-order"]',
      'button[name*="submit-order"]',
      
      // Finalize order selectors
      'input[value*="Finalize order" i]',
      'button[aria-label*="Finalize order" i]',
      
      // Buy now final step selectors
      'input[value*="Buy now" i]',
      'button[aria-label*="Buy now" i]',
      
      // Data attribute selectors
      '[data-testid*="place-order"]',
      '[data-testid*="place-your-order"]',
      '[data-testid*="complete-order"]',
      '[data-testid*="submit-order"]',
      
      // Class-based selectors
      '.place-order-button',
      '.place-your-order',
      '.complete-order-button',
      '.submit-order-button',
      
      // Amazon-specific form selectors
      'form[name="orderReviewForm"] input[type="submit"]',
      'form[action*="order"] input[type="submit"]',
      'form[action*="place"] input[type="submit"]',
      
      // Generic order completion selectors
      'input[type="submit"][class*="order"]',
      'button[class*="order"][class*="place"]',
      'input[type="submit"][id*="order"]',
      'button[id*="order"][id*="place"]'
    ];

    let placeOrderButton: HTMLElement | null = null;
    let buttonSelector = '';
    let buttonText = '';

    // Try to find place order button using Amazon-specific selectors
    for (const selector of placeOrderSelectors) {
      try {
        const elements = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
        
        for (const element of elements) {
          // Check if element is visible and clickable
          const rect = element.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(element);
          
          const isVisible = rect.width > 0 && 
                           rect.height > 0 && 
                           computedStyle.visibility !== 'hidden' && 
                           computedStyle.display !== 'none' &&
                           computedStyle.opacity !== '0';

          const isClickable = !element.hasAttribute('disabled') && 
                             computedStyle.pointerEvents !== 'none';

          if (isVisible && isClickable) {
            // Get button text for verification
            const text = element.textContent?.trim() || 
                        element.getAttribute('value') || 
                        element.getAttribute('aria-label') || 
                        element.getAttribute('title') || '';

            // Verify this is actually a place order button
            if (/place.*order|complete.*order|submit.*order|finalize.*order|buy.*now|confirm.*order/i.test(text) || 
                selector.includes('place') || 
                selector.includes('order') ||
                selector.includes('placeYourOrder')) {
              
              placeOrderButton = element;
              buttonSelector = selector;
              buttonText = text;
              break;
            }
          }
        }
        
        if (placeOrderButton) break;
      } catch (error) {
        // Skip invalid selectors and continue
        continue;
      }
    }

    // If no specific place order button found, look for buttons with order-related text
    if (!placeOrderButton) {
      const allButtons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"]') as NodeListOf<HTMLElement>;
      
      for (const button of allButtons) {
        const rect = button.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(button);
        
        const isVisible = rect.width > 0 && 
                         rect.height > 0 && 
                         computedStyle.visibility !== 'hidden' && 
                         computedStyle.display !== 'none' &&
                         computedStyle.opacity !== '0';

        const isClickable = !button.hasAttribute('disabled') && 
                           computedStyle.pointerEvents !== 'none';

        if (isVisible && isClickable) {
          const text = button.textContent?.trim() || 
                      button.getAttribute('value') || 
                      button.getAttribute('aria-label') || 
                      button.getAttribute('title') || '';

          // Look for place order patterns in text
          if (/place\s*your\s*order|place\s*order|complete\s*order|submit\s*order|finalize\s*order|confirm\s*order|order\s*now/i.test(text)) {
            placeOrderButton = button;
            buttonSelector = generateUniqueSelector(button);
            buttonText = text;
            break;
          }
        }
      }
    }

    if (!placeOrderButton) {
      return {
        success: false,
        message: 'No "Place Your Order" button found on this page. Make sure you are on the final order review page and all required information is filled.',
        buttonFound: false,
        isOrderReviewPage: true
      };
    }

    // Show confirmation warning before placing order
    const confirmOrder = confirm(
      `⚠️ IMPORTANT: You are about to place an order!\n\n` +
      `Button found: "${buttonText}"\n\n` +
      `This will complete your purchase and charge your payment method.\n\n` +
      `Are you sure you want to proceed?`
    );

    if (!confirmOrder) {
      return {
        success: false,
        message: 'Order placement cancelled by user. No order was placed.',
        buttonFound: true,
        buttonText: buttonText,
        selector: buttonSelector,
        isOrderReviewPage: true
      };
    }

    // Scroll button into view if needed
    placeOrderButton.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });

    // Wait a moment for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Focus the button
    if (placeOrderButton.focus) {
      placeOrderButton.focus();
    }

    // Add a small delay to ensure user can see what's happening
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click the place order button
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });

    placeOrderButton.dispatchEvent(clickEvent);

    // Also try direct click method
    if (placeOrderButton.click) {
      placeOrderButton.click();
    }

    // Wait a moment to see if the click was successful
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: true,
      message: `Successfully clicked "${buttonText}" button. Your order is being processed. Please wait for confirmation.`,
      buttonFound: true,
      buttonText: buttonText,
      selector: buttonSelector,
      isOrderReviewPage: true
    };

  } catch (error) {
    console.error('Place order action failed:', error);
    return {
      success: false,
      message: `Place order action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      buttonFound: false,
      isOrderReviewPage: false
    };
  }
}

function generateUniqueSelector(element: Element): string {
  // Try ID first
  if (element.id) {
    return `#${element.id}`;
  }

  // Try unique class combination
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(' ').filter(c => c.trim());
    if (classes.length > 0) {
      const classSelector = '.' + classes.join('.');
      try {
        if (document.querySelectorAll(classSelector).length === 1) {
          return classSelector;
        }
      } catch (error) {
        // Skip invalid class selectors
      }
    }
  }

  // Try data attributes
  const dataAttrs = Array.from(element.attributes)
    .filter(attr => attr.name.startsWith('data-'))
    .map(attr => `[${attr.name}="${attr.value}"]`);
  
  for (const dataAttr of dataAttrs) {
    try {
      if (document.querySelectorAll(dataAttr).length === 1) {
        return dataAttr;
      }
    } catch (error) {
      continue;
    }
  }

  // Try name attribute for inputs
  if (element.getAttribute('name')) {
    const nameSelector = `${element.tagName.toLowerCase()}[name="${element.getAttribute('name')}"]`;
    try {
      if (document.querySelectorAll(nameSelector).length === 1) {
        return nameSelector;
      }
    } catch (error) {
      // Skip invalid name selectors
    }
  }

  // Generate path-based selector
  const path: string[] = [];
  let currentElement: Element | null = element;
  
  while (currentElement && currentElement !== document.body) {
    const tagName = currentElement.tagName.toLowerCase();
    const parent = currentElement.parentElement;
    
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName.toLowerCase() === tagName
      );
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(currentElement) + 1;
        path.unshift(`${tagName}:nth-of-type(${index})`);
      } else {
        path.unshift(tagName);
      }
    } else {
      path.unshift(tagName);
    }
    
    currentElement = parent;
  }

  return path.join(' > ');
}