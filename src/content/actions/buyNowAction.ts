export interface BuyNowResult {
  success: boolean;
  message: string;
  buttonFound?: boolean;
  buttonText?: string;
  selector?: string;
}

export async function buyNowAction(): Promise<BuyNowResult> {
  try {
    // Check if we're on Amazon
    const isAmazon = window.location.hostname.includes('amazon');
    
    if (!isAmazon) {
      return {
        success: false,
        message: 'This action is designed specifically for Amazon. Please navigate to an Amazon product page.',
        buttonFound: false
      };
    }

    // Amazon-specific buy now button selectors
    const amazonBuyNowSelectors = [
      // Primary buy now button selectors
      '#buy-now-button',
      'input[name="submit.buy-now"]',
      'input[aria-labelledby="buy-now-button-announce"]',
      '[data-testid="buy-now-button"]',
      
      // Alternative buy now selectors
      'input[value*="Buy Now" i]',
      'input[title*="Buy Now" i]',
      'button[aria-label*="Buy Now" i]',
      
      // One-click buy selectors
      '#one-click-button',
      'input[name="submit.one-click"]',
      '[data-testid="one-click-button"]',
      
      // Mobile buy now selectors
      '.a-button-oneclick',
      '.a-button-buynow',
      
      // Generic Amazon button patterns
      'input[type="submit"][name*="buy"]',
      'input[type="submit"][value*="now" i]',
      'button[name*="buy-now"]',
      
      // Fallback selectors for different Amazon layouts
      '.a-button input[aria-labelledby*="buy"]',
      '.a-button input[title*="buy" i]'
    ];

    let buyNowButton: HTMLElement | null = null;
    let buttonSelector = '';
    let buttonText = '';

    // Try to find buy now button using Amazon-specific selectors
    for (const selector of amazonBuyNowSelectors) {
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

            // Verify this is actually a buy now button
            if (/buy.*now|one.*click|instant.*buy|quick.*buy/i.test(text) || 
                selector.includes('buy-now') || 
                selector.includes('one-click')) {
              
              buyNowButton = element;
              buttonSelector = selector;
              buttonText = text;
              break;
            }
          }
        }
        
        if (buyNowButton) break;
      } catch (error) {
        // Skip invalid selectors and continue
        continue;
      }
    }

    // If no specific buy now button found, look for buttons with buy now text
    if (!buyNowButton) {
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

          // Look for buy now patterns in text
          if (/buy\s*now|one\s*click|instant\s*buy|quick\s*buy|1\s*click/i.test(text)) {
            buyNowButton = button;
            buttonSelector = generateUniqueSelector(button);
            buttonText = text;
            break;
          }
        }
      }
    }

    if (!buyNowButton) {
      return {
        success: false,
        message: 'No "Buy Now" button found on this Amazon page. Make sure you are on a product page with a buy now option available.',
        buttonFound: false
      };
    }

    // Scroll button into view if needed
    buyNowButton.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });

    // Wait a moment for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Focus the button
    if (buyNowButton.focus) {
      buyNowButton.focus();
    }

    // Click the buy now button
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });

    buyNowButton.dispatchEvent(clickEvent);

    // Also try direct click method
    if (buyNowButton.click) {
      buyNowButton.click();
    }

    // Wait a moment to see if the click was successful
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      message: `Successfully clicked "${buttonText}" button. You should be redirected to the checkout process.`,
      buttonFound: true,
      buttonText: buttonText,
      selector: buttonSelector
    };

  } catch (error) {
    console.error('Buy now action failed:', error);
    return {
      success: false,
      message: `Buy now action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      buttonFound: false
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