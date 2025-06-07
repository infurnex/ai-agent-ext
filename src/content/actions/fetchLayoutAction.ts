export interface LayoutElement {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  attributes: Record<string, string>;
  selector: string;
  semanticRole: string;
  children: LayoutElement[];
  depth: number;
  isVisible: boolean;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface FetchLayoutResult {
  success: boolean;
  message: string;
  layout?: LayoutElement;
  totalElements?: number;
  semanticSummary?: {
    headers: number;
    navigation: number;
    main: number;
    sections: number;
    articles: number;
    forms: number;
    buttons: number;
    links: number;
    images: number;
    lists: number;
  };
}

export async function fetchLayoutAction(): Promise<FetchLayoutResult> {
  try {
    console.log('Starting DOM layout extraction...');
    
    // Start from document.body or document.documentElement
    const rootElement = document.body || document.documentElement;
    
    if (!rootElement) {
      return {
        success: false,
        message: 'No root element found in the document',
        totalElements: 0
      };
    }

    // Extract the layout tree
    const layoutTree = extractLayoutTree(rootElement, 0);
    
    // Generate semantic summary
    const semanticSummary = generateSemanticSummary(layoutTree);
    
    // Count total elements
    const totalElements = countElements(layoutTree);

    return {
      success: true,
      message: `Successfully extracted layout with ${totalElements} elements`,
      layout: layoutTree,
      totalElements,
      semanticSummary
    };

  } catch (error) {
    console.error('Fetch layout action failed:', error);
    return {
      success: false,
      message: `Failed to extract layout: ${error instanceof Error ? error.message : 'Unknown error'}`,
      totalElements: 0
    };
  }
}

function extractLayoutTree(element: Element, depth: number): LayoutElement {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  
  // Determine if element is visible
  const isVisible = rect.width > 0 && 
                   rect.height > 0 && 
                   computedStyle.visibility !== 'hidden' && 
                   computedStyle.display !== 'none' &&
                   computedStyle.opacity !== '0';

  // Extract attributes
  const attributes: Record<string, string> = {};
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    attributes[attr.name] = attr.value;
  }

  // Determine semantic role
  const semanticRole = determineSemanticRole(element);

  // Generate unique selector
  const selector = generateUniqueSelector(element);

  // Get meaningful text content (first 100 chars, excluding child element text)
  const textContent = getDirectTextContent(element).slice(0, 100);

  // Create layout element
  const layoutElement: LayoutElement = {
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    className: element.className || undefined,
    textContent: textContent || undefined,
    attributes,
    selector,
    semanticRole,
    children: [],
    depth,
    isVisible,
    boundingBox: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  };

  // Recursively process children (limit depth to prevent infinite recursion)
  if (depth < 10) {
    const children = Array.from(element.children);
    for (const child of children) {
      // Skip script, style, and other non-semantic elements
      if (!shouldSkipElement(child)) {
        const childLayout = extractLayoutTree(child, depth + 1);
        layoutElement.children.push(childLayout);
      }
    }
  }

  return layoutElement;
}

function determineSemanticRole(element: Element): string {
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute('role');
  const className = element.className?.toLowerCase() || '';
  const id = element.id?.toLowerCase() || '';

  // Explicit ARIA role
  if (role) {
    return `aria-${role}`;
  }

  // Semantic HTML elements
  switch (tagName) {
    case 'header':
      return 'header';
    case 'nav':
      return 'navigation';
    case 'main':
      return 'main-content';
    case 'section':
      return 'section';
    case 'article':
      return 'article';
    case 'aside':
      return 'sidebar';
    case 'footer':
      return 'footer';
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return `heading-${tagName.charAt(1)}`;
    case 'form':
      return 'form';
    case 'button':
      return 'button';
    case 'input':
      const inputType = element.getAttribute('type') || 'text';
      return `input-${inputType}`;
    case 'select':
      return 'select';
    case 'textarea':
      return 'textarea';
    case 'a':
      return 'link';
    case 'img':
      return 'image';
    case 'video':
      return 'video';
    case 'audio':
      return 'audio';
    case 'ul':
    case 'ol':
      return 'list';
    case 'li':
      return 'list-item';
    case 'table':
      return 'table';
    case 'tr':
      return 'table-row';
    case 'td':
    case 'th':
      return 'table-cell';
    case 'div':
      // Try to infer semantic meaning from class/id
      if (/header|top|banner/i.test(className + id)) return 'header-container';
      if (/nav|menu|navigation/i.test(className + id)) return 'navigation-container';
      if (/main|content|body/i.test(className + id)) return 'main-container';
      if (/sidebar|aside|secondary/i.test(className + id)) return 'sidebar-container';
      if (/footer|bottom/i.test(className + id)) return 'footer-container';
      if (/card|item|product|post/i.test(className + id)) return 'content-card';
      if (/modal|dialog|popup/i.test(className + id)) return 'modal';
      if (/grid|list|container/i.test(className + id)) return 'layout-container';
      return 'generic-container';
    case 'span':
      if (/label|tag|badge/i.test(className + id)) return 'label';
      if (/icon|symbol/i.test(className + id)) return 'icon';
      return 'inline-text';
    case 'p':
      return 'paragraph';
    default:
      return `element-${tagName}`;
  }
}

function shouldSkipElement(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  const skipTags = ['script', 'style', 'noscript', 'meta', 'link', 'title'];
  
  return skipTags.includes(tagName);
}

function getDirectTextContent(element: Element): string {
  let text = '';
  
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    }
  }
  
  return text.trim();
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

function generateSemanticSummary(layout: LayoutElement): {
  headers: number;
  navigation: number;
  main: number;
  sections: number;
  articles: number;
  forms: number;
  buttons: number;
  links: number;
  images: number;
  lists: number;
} {
  const summary = {
    headers: 0,
    navigation: 0,
    main: 0,
    sections: 0,
    articles: 0,
    forms: 0,
    buttons: 0,
    links: 0,
    images: 0,
    lists: 0
  };

  function countSemanticElements(element: LayoutElement) {
    // Count current element
    if (element.semanticRole.startsWith('heading-')) summary.headers++;
    if (element.semanticRole.includes('navigation')) summary.navigation++;
    if (element.semanticRole.includes('main')) summary.main++;
    if (element.semanticRole === 'section') summary.sections++;
    if (element.semanticRole === 'article') summary.articles++;
    if (element.semanticRole === 'form') summary.forms++;
    if (element.semanticRole === 'button') summary.buttons++;
    if (element.semanticRole === 'link') summary.links++;
    if (element.semanticRole === 'image') summary.images++;
    if (element.semanticRole === 'list') summary.lists++;

    // Recursively count children
    for (const child of element.children) {
      countSemanticElements(child);
    }
  }

  countSemanticElements(layout);
  return summary;
}

function countElements(layout: LayoutElement): number {
  let count = 1; // Count current element
  
  for (const child of layout.children) {
    count += countElements(child);
  }
  
  return count;
}