export interface CashOnDeliveryResult {
  success: boolean;
  message: string;
  codOptionFound?: boolean;
  codOptionSelected?: boolean;
  continueButtonFound?: boolean;
  continueButtonClicked?: boolean;
  codSelector?: string;
  continueSelector?: string;
  alreadySelected?: boolean;
}

export async function cashOnDeliveryPaymentAction(): Promise<CashOnDeliveryResult> {
  try {
    // Check if we're on Amazon
    const isAmazon = window.location.hostname.includes('amazon');
    
    if (!isAmazon) {
      return {
        success: false,
        message: 'This action is designed specifically for Amazon. Please navigate to an Amazon checkout page.',
        codOptionFound: false,
        codOptionSelected: false,
        continueButtonFound: false,
        continueButtonClicked: false
      };
    }

    // Check if we're on a checkout/payment page
    const isCheckoutPage = window.location.pathname.includes('checkout') || 
                          window.location.pathname.includes('payment') ||
                          window.location.pathname.includes('order') ||
                          document.title.toLowerCase().includes('checkout') ||
                          document.title.toLowerCase().includes('payment');

    if (!isCheckoutPage) {
      return {
        success: false,
        message: 'Please navigate to the Amazon checkout/payment page first.',
        codOptionFound: false,
        codOptionSelected: false,
        continueButtonFound: false,
        continueButtonClicked: false
      };
    }

    let result: CashOnDeliveryResult = {
      success: false,
      message: '',
      codOptionFound: false,
      codOptionSelected: false,
      continueButtonFound: false,
      continueButtonClicked: false,
      alreadySelected: false
    };

    // Step 1: Find and check Cash on Delivery option
    const codResult = await selectCashOnDelivery();
    result.codOptionFound = codResult.found;
    result.codOptionSelected = codResult.selected;
    result.codSelector = codResult.selector;
    result.alreadySelected = codResult.alreadySelected;

    if (!codResult.found) {
      result.message = 'Cash on Delivery option not found. This might not be available for your location or the selected items.';
      return result;
    }

    if (codResult.alreadySelected) {
      result.success = true;
      result.message = 'Cash on Delivery is already selected. Proceeding to next step.';
    } else if (!codResult.selected) {
      result.message = 'Found Cash on Delivery option but failed to select it.';
      return result;
    }

    // Wait a moment for the page to update after COD selection (only if we just selected it)
    if (!codResult.alreadySelected) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 2: Find and click Continue/Next button
    const continueResult = await clickContinueButton();
    result.continueButtonFound = continueResult.found;
    result.continueButtonClicked = continueResult.clicked;
    result.continueSelector = continueResult.selector;

    if ((result.codOptionSelected || result.alreadySelected) && result.continueButtonClicked) {
      result.success = true;
      result.message = result.alreadySelected 
        ? 'Cash on Delivery was already selected. Successfully proceeded to next step.'
        : 'Successfully selected Cash on Delivery and proceeded to next step.';
    } else if ((result.codOptionSelected || result.alreadySelected) && !result.continueButtonFound) {
      result.success = true;
      result.message = result.alreadySelected
        ? 'Cash on Delivery was already selected. Continue button not found - you may need to manually proceed.'
        : 'Successfully selected Cash on Delivery. Continue button not found - you may need to manually proceed.';
    } else {
      result.message = 'Selected Cash on Delivery but failed to click continue button.';
    }

    return result;

  } catch (error) {
    console.error('Cash on Delivery payment action failed:', error);
    return {
      success: false,
      message: `Cash on Delivery action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      codOptionFound: false,
      codOptionSelected: false,
      continueButtonFound: false,
      continueButtonClicked: false
    };
  }
}

async function selectCashOnDelivery(): Promise<{found: boolean, selected: boolean, selector?: string, alreadySelected?: boolean}> {
  // Amazon Cash on Delivery selectors
  const codSelectors = [
    // Radio button selectors
    'input[type="radio"][value*="cod" i]',
    'input[type="radio"][value*="cash" i]',
    'input[type="radio"][name*="payment"][value*="delivery" i]',
    'input[type="radio"][data-testid*="cod"]',
    'input[type="radio"][id*="cod"]',
    'input[type="radio"][id*="cash-on-delivery"]',
    
    // Label-based selectors
    'label[for*="cod"]',
    'label[for*="cash-on-delivery"]',
    'label[for*="cash_on_delivery"]',
    
    // Container-based selectors
    '[data-testid*="cod"] input[type="radio"]',
    '[data-testid*="cash-on-delivery"] input[type="radio"]',
    '.payment-method-cod input[type="radio"]',
    '.cod-payment input[type="radio"]',
    
    // Amazon-specific selectors
    'input[name="ppw-instrumentRowSelection"][value*="cod" i]',
    'input[name="paymentMethod"][value*="cod" i]',
    'input[name="payment-method"][value*="cash" i]',
    
    // Generic payment method selectors with COD text
    '.payment-option input[type="radio"]',
    '.payment-method input[type="radio"]',
    '.payment-row input[type="radio"]'
  ];

  let codOption: HTMLInputElement | null = null;
  let codSelector = '';

  // Try specific COD selectors first
  for (const selector of codSelectors) {
    try {
      const elements = document.querySelectorAll(selector) as NodeListOf<HTMLInputElement>;
      
      for (const element of elements) {
        if (element.type === 'radio' && isElementVisible(element)) {
          // For radio buttons, check associated text
          const associatedText = getAssociatedText(element);
          
          if (/cash.*on.*delivery|cod|pay.*on.*delivery|cash.*at.*delivery|delivery.*payment/i.test(associatedText)) {
            codOption = element;
            codSelector = selector;
            break;
          }
        }
      }
      
      if (codOption) break;
    } catch (error) {
      continue;
    }
  }

  // If no specific COD option found, search by text content
  if (!codOption) {
    const allRadioButtons = document.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    
    for (const radio of allRadioButtons) {
      if (isElementVisible(radio)) {
        const associatedText = getAssociatedText(radio);
        
        if (/cash.*on.*delivery|cod|pay.*on.*delivery|cash.*at.*delivery|delivery.*payment/i.test(associatedText)) {
          codOption = radio;
          codSelector = generateUniqueSelector(radio);
          break;
        }
      }
    }
  }

  if (!codOption) {
    return { found: false, selected: false };
  }

  // Check if COD is already selected
  if (codOption.checked) {
    console.log('Cash on Delivery is already selected');
    return { 
      found: true, 
      selected: true, 
      selector: codSelector,
      alreadySelected: true
    };
  }

  // Select the COD option only if it's not already selected
  try {
    // Scroll into view
    codOption.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 300));

    // Focus and select
    codOption.focus();
    
    // Click the radio button
    codOption.click();
    
    // Also try clicking the associated label
    const label = document.querySelector(`label[for="${codOption.id}"]`) as HTMLElement;
    if (label) {
      label.click();
    }
    
    // Dispatch change event
    const changeEvent = new Event('change', { bubbles: true });
    codOption.dispatchEvent(changeEvent);
    
    // Dispatch click event
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    codOption.dispatchEvent(clickEvent);

    // Wait a moment and check if it's selected
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const isSelected = codOption.checked;
    
    return { 
      found: true, 
      selected: isSelected, 
      selector: codSelector,
      alreadySelected: false
    };
    
  } catch (error) {
    console.error('Failed to select COD option:', error);
    return { 
      found: true, 
      selected: false, 
      selector: codSelector,
      alreadySelected: false
    };
  }
}

async function clickContinueButton(): Promise<{found: boolean, clicked: boolean, selector?: string}> {
  // Amazon continue/next button selectors
  const continueSelectors = [
    // Primary continue button selectors
    'input[type="submit"][name*="continue"]',
    'button[name*="continue"]',
    'input[value*="continue" i]',
    'button[aria-label*="continue" i]',
    
    // Next step selectors
    'input[type="submit"][name*="next"]',
    'button[name*="next"]',
    'input[value*="next" i]',
    'button[aria-label*="next" i]',
    
    // Proceed selectors
    'input[value*="proceed" i]',
    'button[aria-label*="proceed" i]',
    
    // Amazon-specific selectors
    '#continue-top',
    '#continue-bottom',
    '#placeYourOrder',
    '#place-your-order-button',
    'input[name="placeYourOrder1"]',
    'input[name="continue-top"]',
    'input[name="continue-bottom"]',
    
    // Generic submit buttons
    'input[type="submit"][class*="continue"]',
    'button[class*="continue"]',
    'input[type="submit"][class*="next"]',
    'button[class*="next"]',
    'input[type="submit"][class*="proceed"]',
    'button[class*="proceed"]',
    
    // Data attribute selectors
    '[data-testid*="continue"]',
    '[data-testid*="next"]',
    '[data-testid*="proceed"]'
  ];

  let continueButton: HTMLElement | null = null;
  let continueSelector = '';

  // Try specific continue button selectors
  for (const selector of continueSelectors) {
    try {
      const elements = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
      
      for (const element of elements) {
        if (isElementVisible(element) && !element.hasAttribute('disabled')) {
          continueButton = element;
          continueSelector = selector;
          break;
        }
      }
      
      if (continueButton) break;
    } catch (error) {
      continue;
    }
  }

  // If no specific continue button found, search by text content
  if (!continueButton) {
    const allButtons = document.querySelectorAll('button, input[type="submit"], input[type="button"]') as NodeListOf<HTMLElement>;
    
    for (const button of allButtons) {
      if (isElementVisible(button) && !button.hasAttribute('disabled')) {
        const text = button.textContent?.trim() || 
                    button.getAttribute('value') || 
                    button.getAttribute('aria-label') || 
                    button.getAttribute('title') || '';

        if (/continue|next|proceed|place.*order|review.*order|complete.*order/i.test(text)) {
          continueButton = button;
          continueSelector = generateUniqueSelector(button);
          break;
        }
      }
    }
  }

  if (!continueButton) {
    return { found: false, clicked: false };
  }

  // Click the continue button
  try {
    // Scroll into view
    continueButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 300));

    // Focus and click
    continueButton.focus();
    
    // Try multiple click methods
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    continueButton.dispatchEvent(clickEvent);
    
    if (continueButton.click) {
      continueButton.click();
    }

    // Wait a moment to see if the click was successful
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { 
      found: true, 
      clicked: true, 
      selector: continueSelector 
    };
    
  } catch (error) {
    console.error('Failed to click continue button:', error);
    return { found: true, clicked: false, selector: continueSelector };
  }
}

function isElementVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  
  return rect.width > 0 && 
         rect.height > 0 && 
         computedStyle.visibility !== 'hidden' && 
         computedStyle.display !== 'none' &&
         computedStyle.opacity !== '0';
}

function getAssociatedText(radioButton: HTMLInputElement): string {
  let text = '';
  
  // Check label associated with radio button
  if (radioButton.id) {
    const label = document.querySelector(`label[for="${radioButton.id}"]`);
    if (label) {
      text += ' ' + (label.textContent || '');
    }
  }
  
  // Check parent label
  const parentLabel = radioButton.closest('label');
  if (parentLabel) {
    text += ' ' + (parentLabel.textContent || '');
  }
  
  // Check siblings and nearby text
  const parent = radioButton.parentElement;
  if (parent) {
    text += ' ' + (parent.textContent || '');
  }
  
  // Check data attributes
  text += ' ' + (radioButton.getAttribute('data-label') || '');
  text += ' ' + (radioButton.getAttribute('aria-label') || '');
  text += ' ' + (radioButton.getAttribute('title') || '');
  text += ' ' + (radioButton.getAttribute('value') || '');
  
  return text.toLowerCase();
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