export interface Product {
  title: string;
  price: string;
  description: string;
  image: string;
  selector: string;
  addToCartButtonSelector: string;
}

export interface FetchProductsResult {
  success: boolean;
  message: string;
  products?: Product[];
  count?: number;
}

export async function fetchDOMProductsAction(): Promise<FetchProductsResult> {
  try {
    const products: Product[] = [];

    // Common product container selectors
    const productSelectors = [
      '[data-testid*="product" i]',
      '.product',
      '.product-item',
      '.product-card',
      '.product-tile',
      '.item',
      '.listing',
      '.card',
      '[class*="product" i]',
      '[id*="product" i]',
      '.grid-item',
      '.shop-item',
      '.merchandise',
      '.goods',
      '[data-product-id]',
      '[data-item-id]',
      '.catalog-item'
    ];

    // Find all potential product containers
    let productElements: Element[] = [];
    
    for (const selector of productSelectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      if (elements.length > 0) {
        // Filter out elements that are too small (likely not product cards)
        const validElements = elements.filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 100 && rect.height > 100;
        });
        
        if (validElements.length > 0) {
          productElements = validElements;
          break;
        }
      }
    }

    // If no specific product containers found, look for generic containers with product-like content
    if (productElements.length === 0) {
      const genericSelectors = [
        'article',
        '.card',
        '.tile',
        '.box',
        '[class*="item" i]',
        '[class*="card" i]'
      ];

      for (const selector of genericSelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        const productLikeElements = elements.filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          const hasPrice = /[\$₹€£¥][\d,.]/.test(text) || /price|cost|amount/i.test(text);
          const hasProductTerms = /buy|add to cart|purchase|shop|product/i.test(text);
          const rect = el.getBoundingClientRect();
          const isValidSize = rect.width > 150 && rect.height > 150;
          
          return (hasPrice || hasProductTerms) && isValidSize;
        });

        if (productLikeElements.length > 0) {
          productElements = productLikeElements.slice(0, 20); // Limit to 20 products
          break;
        }
      }
    }

    // Extract product information from each container
    for (let i = 0; i < Math.min(productElements.length, 20); i++) {
      const element = productElements[i];
      const product = extractProductInfo(element, i);
      
      if (product.title || product.price) {
        products.push(product);
      }
    }

    if (products.length === 0) {
      return {
        success: false,
        message: 'No products found on this page. The page might not contain product listings or use a different structure.',
        count: 0
      };
    }

    return {
      success: true,
      message: `Successfully found ${products.length} product${products.length === 1 ? '' : 's'}`,
      products,
      count: products.length
    };

  } catch (error) {
    console.error('Fetch products action failed:', error);
    return {
      success: false,
      message: `Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`,
      count: 0
    };
  }
}

function extractProductInfo(element: Element, index: number): Product {
  // Generate unique selector for the element
  const selector = generateUniqueSelector(element);

  // Extract title
  const title = extractTitle(element);

  // Extract price
  const price = extractPrice(element);

  // Extract description
  const description = extractDescription(element);

  // Extract image
  const image = extractImage(element);

  // Find add to cart button
  const addToCartButtonSelector = findAddToCartButton(element);

  return {
    title,
    price,
    description,
    image,
    selector,
    addToCartButtonSelector
  };
}

function extractTitle(element: Element): string {
  const titleSelectors = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    '.title', '.name', '.product-title', '.product-name',
    '[data-testid*="title" i]', '[data-testid*="name" i]',
    '.heading', '.header', '.product-heading',
    '[class*="title" i]', '[class*="name" i]',
    'a[href*="product"]', 'a[href*="item"]'
  ];

  for (const selector of titleSelectors) {
    const titleElement = element.querySelector(selector);
    if (titleElement) {
      const text = titleElement.textContent?.trim();
      if (text && text.length > 3 && text.length < 200) {
        return text;
      }
    }
  }

  // Fallback: look for the longest meaningful text
  const textNodes = Array.from(element.querySelectorAll('*'))
    .map(el => el.textContent?.trim())
    .filter(text => text && text.length > 5 && text.length < 100)
    .sort((a, b) => (b?.length || 0) - (a?.length || 0));

  return textNodes[0] || 'Product';
}

function extractPrice(element: Element): string {
  const priceSelectors = [
    '.price', '.cost', '.amount', '.value',
    '[class*="price" i]', '[class*="cost" i]',
    '[data-testid*="price" i]', '[data-price]',
    '.currency', '.money', '.rate'
  ];

  for (const selector of priceSelectors) {
    const priceElement = element.querySelector(selector);
    if (priceElement) {
      const text = priceElement.textContent?.trim();
      if (text && /[\$₹€£¥][\d,.]/.test(text)) {
        return text;
      }
    }
  }

  // Fallback: search for price patterns in all text
  const allText = element.textContent || '';
  const priceMatches = allText.match(/[\$₹€£¥][\d,]+\.?\d*/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches[0];
  }

  // Look for number patterns that might be prices
  const numberMatches = allText.match(/\b\d{1,6}[,.]?\d{0,2}\s*(?:USD|EUR|INR|GBP|JPY)?\b/g);
  if (numberMatches && numberMatches.length > 0) {
    return numberMatches[0];
  }

  return 'Price not available';
}

function extractDescription(element: Element): string {
  const descriptionSelectors = [
    '.description', '.desc', '.details', '.info',
    '[class*="description" i]', '[class*="detail" i]',
    '.product-description', '.product-details',
    '[data-testid*="description" i]', 'p'
  ];

  for (const selector of descriptionSelectors) {
    const descElement = element.querySelector(selector);
    if (descElement) {
      const text = descElement.textContent?.trim();
      if (text && text.length > 10 && text.length < 500) {
        return text;
      }
    }
  }

  // Fallback: get all paragraph text
  const paragraphs = Array.from(element.querySelectorAll('p'))
    .map(p => p.textContent?.trim())
    .filter(text => text && text.length > 10 && text.length < 300);

  if (paragraphs.length > 0) {
    return paragraphs[0];
  }

  return 'No description available';
}

function extractImage(element: Element): string {
  const images = element.querySelectorAll('img');
  
  for (const img of images) {
    const src = img.getAttribute('src');
    const alt = img.getAttribute('alt');
    
    // Prefer images with product-related alt text or src
    if (alt && /product|item|image/i.test(alt)) {
      return src || alt;
    }
    
    if (src && !/icon|logo|avatar|profile/i.test(src)) {
      return src;
    }
  }

  // Fallback: return first image src or alt
  if (images.length > 0) {
    const firstImg = images[0];
    return firstImg.getAttribute('src') || firstImg.getAttribute('alt') || 'No image';
  }

  return 'No image available';
}

function findAddToCartButton(element: Element): string {
  const buttonSelectors = [
    'button[class*="cart" i]',
    'button[class*="add" i]',
    'button[class*="buy" i]',
    'button[class*="purchase" i]',
    '[data-testid*="cart" i]',
    '[data-testid*="add" i]',
    '.add-to-cart',
    '.buy-now',
    '.purchase',
    'button:contains("Add")',
    'button:contains("Buy")',
    'button:contains("Cart")',
    'input[type="submit"]',
    'button[type="submit"]'
  ];

  for (const selector of buttonSelectors) {
    const button = element.querySelector(selector);
    if (button) {
      return generateUniqueSelector(button);
    }
  }

  // Fallback: look for buttons with cart/buy related text
  const allButtons = element.querySelectorAll('button, input[type="submit"], a[role="button"]');
  for (const button of allButtons) {
    const text = button.textContent?.toLowerCase() || '';
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
    
    if (/add|cart|buy|purchase|order/i.test(text + ' ' + ariaLabel)) {
      return generateUniqueSelector(button);
    }
  }

  return 'No add to cart button found';
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
      if (document.querySelectorAll(classSelector).length === 1) {
        return classSelector;
      }
    }
  }

  // Try data attributes
  const dataAttrs = Array.from(element.attributes)
    .filter(attr => attr.name.startsWith('data-'))
    .map(attr => `[${attr.name}="${attr.value}"]`);
  
  for (const dataAttr of dataAttrs) {
    if (document.querySelectorAll(dataAttr).length === 1) {
      return dataAttr;
    }
  }

  // Fallback: generate nth-child selector
  let selector = element.tagName.toLowerCase();
  let currentElement = element;
  
  while (currentElement.parentElement) {
    const parent = currentElement.parentElement;
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(currentElement) + 1;
    
    selector = `${parent.tagName.toLowerCase()} > ${selector}:nth-child(${index})`;
    
    if (document.querySelectorAll(selector).length === 1) {
      break;
    }
    
    currentElement = parent;
  }

  return selector;
}