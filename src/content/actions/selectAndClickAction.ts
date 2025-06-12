export interface SelectAndClickResult {
  success: boolean;
  message: string;
  elementFound?: boolean;
  elementClicked?: boolean;
  selector?: string;
  elementTag?: string;
  elementText?: string;
}

export interface SelectAndClickParams {
  tag: string;
  attributes: Record<string, string>;
}

export async function selectAndClickAction(params: SelectAndClickParams): Promise<SelectAndClickResult> {
  try {
    const { tag, attributes } = params;

    if (!tag) {
      return {
        success: false,
        message: 'Tag parameter is required',
        elementFound: false,
        elementClicked: false
      };
    }

    // Build selector from tag and attributes
    let selector = tag.toLowerCase();
    
    // Add attribute selectors
    for (const [key, value] of Object.entries(attributes || {})) {
      if (value) {
        // Escape quotes in attribute values
        const escapedValue = value.replace(/"/g, '\\"');
        selector += `[${key}="${escapedValue}"]`;
      } else {
        selector += `[${key}]`;
      }
    }

    console.log(`Looking for element with selector: ${selector}`);

    // Find the element with retries
    let element: HTMLElement | null = null;
    const maxRetries = 5;
    
    for (let retry = 0; retry < maxRetries; retry++) {
      element = document.querySelector(selector) as HTMLElement;
      
      if (element) {
        console.log(`Element found on attempt ${retry + 1}`);
        break;
      }
      
      console.log(`Element not found, attempt ${retry + 1}/${maxRetries}. Waiting...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!element) {
      // Try alternative selectors for common Amazon elements
      const alternativeSelectors = generateAlternativeSelectors(attributes);
      
      for (const altSelector of alternativeSelectors) {
        console.log(`Trying alternative selector: ${altSelector}`);
        element = document.querySelector(altSelector) as HTMLElement;
        if (element) {
          selector = altSelector;
          console.log(`Element found with alternative selector: ${altSelector}`);
          break;
        }
      }
    }

    if (!element) {
      return {
        success: false,
        message: `Element not found with selector: ${selector}. Tried ${maxRetries} attempts and alternative selectors.`,
        elementFound: false,
        elementClicked: false,
        selector: selector
      };
    }

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

    if (!isVisible) {
      return {
        success: false,
        message: `Element found but not visible: ${selector}`,
        elementFound: true,
        elementClicked: false,
        selector: selector,
        elementTag: element.tagName.toLowerCase()
      };
    }

    if (!isClickable) {
      return {
        success: false,
        message: `Element found but not clickable (disabled or pointer-events: none): ${selector}`,
        elementFound: true,
        elementClicked: false,
        selector: selector,
        elementTag: element.tagName.toLowerCase()
      };
    }

    // Get element text for confirmation
    const elementText = element.textContent?.trim() || 
                       element.getAttribute('value') || 
                       element.getAttribute('aria-label') || 
                       element.getAttribute('title') || '';

    console.log(`Element details:`, {
      tag: element.tagName.toLowerCase(),
      text: elementText,
      id: element.id,
      className: element.className,
      type: element.getAttribute('type'),
      value: element.getAttribute('value')
    });

    // Scroll element into view
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });

    // Wait for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Focus the element
    if (element.focus) {
      element.focus();
    }

    // Highlight element briefly for debugging
    const originalBorder = element.style.border;
    element.style.border = '3px solid red';
    setTimeout(() => {
      element.style.border = originalBorder;
    }, 2000);

    // Click the element using multiple methods
    try {
      // Method 1: Dispatch mouse events
      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      element.dispatchEvent(mouseDownEvent);

      const mouseUpEvent = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      element.dispatchEvent(mouseUpEvent);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      element.dispatchEvent(clickEvent);

      // Method 2: Direct click if available
      if (element.click) {
        element.click();
      }

      // Method 3: For form elements, try triggering change/submit events
      if (element.tagName.toLowerCase() === 'input' && element.getAttribute('type') === 'submit') {
        const form = element.closest('form');
        if (form) {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        }
      }

      // Wait to see if click was successful
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`Successfully clicked element: ${elementText || selector}`);

      return {
        success: true,
        message: `Successfully clicked element: ${elementText || selector}`,
        elementFound: true,
        elementClicked: true,
        selector: selector,
        elementTag: element.tagName.toLowerCase(),
        elementText: elementText
      };

    } catch (clickError) {
      console.error('Click error:', clickError);
      return {
        success: false,
        message: `Element found but click failed: ${clickError instanceof Error ? clickError.message : 'Unknown click error'}`,
        elementFound: true,
        elementClicked: false,
        selector: selector,
        elementTag: element.tagName.toLowerCase(),
        elementText: elementText
      };
    }

  } catch (error) {
    console.error('Select and click action failed:', error);
    return {
      success: false,
      message: `Select and click action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      elementFound: false,
      elementClicked: false
    };
  }
}

// Generate alternative selectors for common Amazon elements
function generateAlternativeSelectors(attributes: Record<string, string>): string[] {
  const alternatives: string[] = [];
  
  // For buy-now button alternatives
  if (attributes.id === 'buy-now-button') {
    alternatives.push(
      'input[name="submit.buy-now"]',
      'input[id*="buy-now"]',
      'input[value*="Buy Now"]',
      'button[id*="buy-now"]',
      'input[aria-labelledby*="buy-now"]',
      '#buyNow',
      '.a-button-buyNow input',
      'input[data-action="buy-now"]'
    );
  }
  
  // For COD payment method alternatives
  if (attributes.value && attributes.value.includes('COD')) {
    alternatives.push(
      'input[value*="COD"]',
      'input[value*="Cash"]',
      'input[name*="paymentMethod"][value*="COD"]',
      'input[type="radio"][value*="Cash"]',
      'input[id*="cod"]',
      'input[id*="cash"]'
    );
  }
  
  // For payment continue button alternatives
  if (attributes['aria-labelledby'] && attributes['aria-labelledby'].includes('continue')) {
    alternatives.push(
      'input[aria-labelledby*="continue"]',
      'input[name*="continue"]',
      'input[value*="Continue"]',
      'button[aria-label*="Continue"]',
      '#continue',
      '.a-button-primary input[type="submit"]',
      'input[data-action="continue"]'
    );
  }
  
  // For place order button alternatives
  if (attributes.id === 'placeOrder') {
    alternatives.push(
      'input[name="placeOrder"]',
      'input[value*="Place"]',
      'input[value*="Order"]',
      'button[id*="place"]',
      'button[id*="order"]',
      '#placeYourOrder',
      '.place-order-button',
      'input[aria-label*="Place"]',
      'input[data-action="place-order"]'
    );
  }
  
  return alternatives;
}