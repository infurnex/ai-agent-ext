export interface SearchResult {
  success: boolean;
  message: string;
  elementsFound?: number;
}

export async function searchAction(query: string): Promise<SearchResult> {
  if (!query.trim()) {
    return {
      success: false,
      message: 'Search query cannot be empty'
    };
  }

  try {
    // Common search input selectors
    const searchSelectors = [
      'input[type="search"]',
      'input[name*="search" i]',
      'input[placeholder*="search" i]',
      'input[id*="search" i]',
      'input[class*="search" i]',
      '.search-input',
      '#search',
      '[data-testid*="search" i]',
      '[aria-label*="search" i]',
      'input[type="text"]' // Fallback for general text inputs
    ];

    let searchInput: HTMLInputElement | null = null;
    
    // Try to find a search input using various selectors
    for (const selector of searchSelectors) {
      const elements = document.querySelectorAll(selector) as NodeListOf<HTMLInputElement>;
      if (elements.length > 0) {
        // Prefer visible inputs
        for (const element of elements) {
          const rect = element.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && 
                           window.getComputedStyle(element).visibility !== 'hidden' &&
                           window.getComputedStyle(element).display !== 'none';
          
          if (isVisible) {
            searchInput = element;
            break;
          }
        }
        if (searchInput) break;
      }
    }

    if (!searchInput) {
      return {
        success: false,
        message: 'No search input found on this page'
      };
    }

    // Focus the input
    searchInput.focus();
    
    // Clear existing value
    searchInput.value = '';
    
    // Set the search query
    searchInput.value = query;
    
    // Trigger input events to ensure the page recognizes the change
    const inputEvent = new Event('input', { bubbles: true });
    const changeEvent = new Event('change', { bubbles: true });
    
    searchInput.dispatchEvent(inputEvent);
    searchInput.dispatchEvent(changeEvent);

    // Try to find and click a search button
    const searchButtonSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button[aria-label*="search" i]',
      'button[title*="search" i]',
      '.search-button',
      '[data-testid*="search" i] button',
      'form button:first-of-type'
    ];

    let searchButton: HTMLElement | null = null;
    
    // Look for search button near the input
    const form = searchInput.closest('form');
    if (form) {
      for (const selector of searchButtonSelectors) {
        const button = form.querySelector(selector) as HTMLElement;
        if (button) {
          const rect = button.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && 
                           window.getComputedStyle(button).visibility !== 'hidden' &&
                           window.getComputedStyle(button).display !== 'none';
          if (isVisible) {
            searchButton = button;
            break;
          }
        }
      }
    }

    // If no button found in form, search globally
    if (!searchButton) {
      for (const selector of searchButtonSelectors) {
        const buttons = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
        for (const button of buttons) {
          const rect = button.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && 
                           window.getComputedStyle(button).visibility !== 'hidden' &&
                           window.getComputedStyle(button).display !== 'none';
          if (isVisible) {
            searchButton = button;
            break;
          }
        }
        if (searchButton) break;
      }
    }

    // Perform the search
    if (searchButton) {
      // Click the search button
      searchButton.click();
    } else {
      // Try submitting the form if no button found
      if (form) {
        form.submit();
      } else {
        // Simulate Enter key press
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        });
        searchInput.dispatchEvent(enterEvent);
      }
    }

    // Wait a bit for the search to process
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      message: `Search performed for "${query}"`,
      elementsFound: 1
    };

  } catch (error) {
    console.error('Search action failed:', error);
    return {
      success: false,
      message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}