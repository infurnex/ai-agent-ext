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
        selector += `[${key}="${value}"]`;
      } else {
        selector += `[${key}]`;
      }
    }

    // Find the element
    const element = document.querySelector(selector) as HTMLElement;

    if (!element) {
      return {
        success: false,
        message: `Element not found with selector: ${selector}`,
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

    // Scroll element into view
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });

    // Wait for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Focus the element
    if (element.focus) {
      element.focus();
    }

    // Click the element using multiple methods
    try {
      // Method 1: Dispatch click event
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

      // Wait to see if click was successful
      await new Promise(resolve => setTimeout(resolve, 500));

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