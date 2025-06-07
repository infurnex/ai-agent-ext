import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, Minimize2, Maximize2, Search, Package, Layout } from 'lucide-react';
import { SearchResult } from './actions/searchAction';
import { FetchProductsResult, Product } from './actions/fetchDOMProductsAction';
import { FetchLayoutResult, LayoutElement } from './actions/fetchLayoutAction';

interface FloatingFrameProps {
  onClose?: () => void;
  onSearch?: (query: string) => Promise<SearchResult>;
  onFetchProducts?: () => Promise<FetchProductsResult>;
  onFetchLayout?: () => Promise<FetchLayoutResult>;
}

const FloatingFrame: React.FC<FloatingFrameProps> = memo(({ onClose, onSearch, onFetchProducts, onFetchLayout }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [productsResult, setProductsResult] = useState<FetchProductsResult | null>(null);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [layoutResult, setLayoutResult] = useState<FetchLayoutResult | null>(null);
  const [isFetchingLayout, setIsFetchingLayout] = useState(false);
  const [showLayout, setShowLayout] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize component
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Toggle expand/collapse
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // Handle search
  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim() || !onSearch) return;
    
    setIsSearching(true);
    setSearchResult(null);
    
    try {
      const result = await onSearch(searchQuery.trim());
      setSearchResult(result);
      
      // Clear search query on successful search
      if (result.success) {
        setSearchQuery('');
      }
    } catch (error) {
      setSearchResult({
        success: false,
        message: 'Search failed due to an error'
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, onSearch]);

  // Handle fetch products
  const handleFetchProducts = useCallback(async () => {
    if (!onFetchProducts) return;
    
    setIsFetchingProducts(true);
    setProductsResult(null);
    setShowProducts(false);
    
    try {
      const result = await onFetchProducts();
      setProductsResult(result);
      if (result.success && result.products && result.products.length > 0) {
        setShowProducts(true);
      }
    } catch (error) {
      setProductsResult({
        success: false,
        message: 'Failed to fetch products due to an error',
        count: 0
      });
    } finally {
      setIsFetchingProducts(false);
    }
  }, [onFetchProducts]);

  // Handle fetch layout
  const handleFetchLayout = useCallback(async () => {
    if (!onFetchLayout) return;
    
    setIsFetchingLayout(true);
    setLayoutResult(null);
    setShowLayout(false);
    
    try {
      const result = await onFetchLayout();
      setLayoutResult(result);
      if (result.success && result.layout) {
        setShowLayout(true);
      }
    } catch (error) {
      setLayoutResult({
        success: false,
        message: 'Failed to fetch layout due to an error',
        totalElements: 0
      });
    } finally {
      setIsFetchingLayout(false);
    }
  }, [onFetchLayout]);

  // Handle search input change
  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Clear previous search result when typing
    if (searchResult) {
      setSearchResult(null);
    }
  }, [searchResult]);

  // Handle Enter key in search input
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(e as any);
    }
  }, [handleSearch]);

  // Toggle products view
  const toggleProductsView = useCallback(() => {
    setShowProducts(prev => !prev);
  }, []);

  // Toggle layout view
  const toggleLayoutView = useCallback(() => {
    setShowLayout(prev => !prev);
  }, []);

  // Render layout element tree
  const renderLayoutElement = useCallback((element: LayoutElement, index: number = 0): React.ReactNode => {
    const indent = '  '.repeat(element.depth);
    const hasChildren = element.children.length > 0;
    
    return (
      <div key={index} className={`layout-element ${!element.isVisible ? 'element-invisible' : ''}`}>
        <span style={{ marginLeft: `${element.depth * 12}px` }}>
          <span className="element-tag">&lt;{element.tagName}</span>
          {element.id && <span className="element-id"> id="{element.id}"</span>}
          {element.className && <span className="element-class"> class="{element.className.length > 30 ? element.className.substring(0, 30) + '...' : element.className}"</span>}
          <span className="element-tag">&gt;</span>
          <span className="element-role"> [{element.semanticRole}]</span>
          {element.textContent && (
            <span className="element-text">"{element.textContent.length > 20 ? element.textContent.substring(0, 20) + '...' : element.textContent}"</span>
          )}
        </span>
        {hasChildren && element.depth < 3 && element.children.map((child, childIndex) => 
          renderLayoutElement(child, childIndex)
        )}
        {hasChildren && element.depth >= 3 && (
          <div style={{ marginLeft: `${(element.depth + 1) * 12}px`, color: '#9ca3af', fontStyle: 'italic' }}>
            ... {element.children.length} more children
          </div>
        )}
      </div>
    );
  }, []);

  if (isLoading) {
    return (
      <div className="floating-frame-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div
      ref={frameRef}
      className={`floating-frame ${isExpanded ? 'expanded' : 'collapsed'}`}
    >
      {/* Header */}
      <div className="floating-frame-header">
        <div className="header-content">
          <span className="header-title">DOM Assistant</span>
        </div>
        <div className="header-controls">
          <button
            className="control-button"
            onClick={toggleExpanded}
            aria-label={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            className="control-button close-button"
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="floating-frame-content">
          {/* Search Section */}
          <div className="content-section">
            <h3 className="section-title">Search Products</h3>
            <p className="section-description">
              Enter a search term to find products on this page.
            </p>
            
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-container">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Enter search term..."
                  className="search-input"
                  disabled={isSearching}
                />
                <button
                  type="submit"
                  className="search-button"
                  disabled={isSearching || !searchQuery.trim()}
                  aria-label="Search"
                >
                  {isSearching ? (
                    <div className="search-spinner"></div>
                  ) : (
                    <Search size={16} />
                  )}
                </button>
              </div>
            </form>

            {/* Search Result */}
            {searchResult && (
              <div className={`search-result ${searchResult.success ? 'success' : 'error'}`}>
                <p className="result-message">{searchResult.message}</p>
                {searchResult.elementsFound !== undefined && (
                  <p className="result-details">
                    Elements found: {searchResult.elementsFound}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Fetch Products Section */}
          <div className="content-section">
            <h3 className="section-title">Extract Products</h3>
            <p className="section-description">
              Scan the current page to extract all available product information.
            </p>
            
            <div className="action-buttons">
              <button 
                className="primary-button fetch-products-button"
                onClick={handleFetchProducts}
                disabled={isFetchingProducts}
              >
                {isFetchingProducts ? (
                  <>
                    <div className="button-spinner"></div>
                    Scanning...
                  </>
                ) : (
                  <>
                    <Package size={16} />
                    Fetch Products
                  </>
                )}
              </button>
            </div>

            {/* Products Result */}
            {productsResult && (
              <div className={`search-result ${productsResult.success ? 'success' : 'error'}`}>
                <p className="result-message">{productsResult.message}</p>
                {productsResult.count !== undefined && (
                  <p className="result-details">
                    Products found: {productsResult.count}
                  </p>
                )}
                {productsResult.success && productsResult.products && productsResult.products.length > 0 && (
                  <button 
                    className="toggle-products-button"
                    onClick={toggleProductsView}
                  >
                    {showProducts ? 'Hide Products' : 'Show Products'}
                  </button>
                )}
              </div>
            )}

            {/* Products List */}
            {showProducts && productsResult?.products && (
              <div className="products-list">
                <h4 className="subsection-title">Found Products ({productsResult.products.length})</h4>
                <div className="products-container">
                  {productsResult.products.map((product: Product, index: number) => (
                    <div key={index} className="product-card">
                      <div className="product-header">
                        <h5 className="product-title">{product.title}</h5>
                        <span className="product-price">{product.price}</span>
                      </div>
                      <p className="product-description">{product.description}</p>
                      <div className="product-details">
                        <p className="product-image">
                          <strong>Image:</strong> {product.image.length > 50 ? product.image.substring(0, 50) + '...' : product.image}
                        </p>
                        <p className="product-selector">
                          <strong>Selector:</strong> {product.selector.length > 40 ? product.selector.substring(0, 40) + '...' : product.selector}
                        </p>
                        <p className="product-cart-button">
                          <strong>Add to Cart:</strong> {product.addToCartButtonSelector.length > 40 ? product.addToCartButtonSelector.substring(0, 40) + '...' : product.addToCartButtonSelector}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fetch Layout Section */}
          <div className="content-section">
            <h3 className="section-title">Extract Layout</h3>
            <p className="section-description">
              Analyze the DOM structure and extract semantic layout information.
            </p>
            
            <div className="action-buttons">
              <button 
                className="primary-button fetch-layout-button"
                onClick={handleFetchLayout}
                disabled={isFetchingLayout}
              >
                {isFetchingLayout ? (
                  <>
                    <div className="button-spinner"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Layout size={16} />
                    Fetch Layout
                  </>
                )}
              </button>
            </div>

            {/* Layout Result */}
            {layoutResult && (
              <div className={`search-result ${layoutResult.success ? 'success' : 'error'}`}>
                <p className="result-message">{layoutResult.message}</p>
                {layoutResult.totalElements !== undefined && (
                  <p className="result-details">
                    Total elements: {layoutResult.totalElements}
                  </p>
                )}
                {layoutResult.success && layoutResult.layout && (
                  <button 
                    className="toggle-products-button"
                    onClick={toggleLayoutView}
                  >
                    {showLayout ? 'Hide Layout' : 'Show Layout'}
                  </button>
                )}
              </div>
            )}

            {/* Layout Tree */}
            {showLayout && layoutResult?.layout && (
              <div className="products-list">
                <h4 className="subsection-title">DOM Layout Structure</h4>
                <div className="layout-container">
                  {/* Semantic Summary */}
                  {layoutResult.semanticSummary && (
                    <div className="layout-summary">
                      <h5 className="subsection-title">Semantic Summary</h5>
                      <div className="summary-grid">
                        <div className="summary-item">
                          <span className="summary-label">Headers:</span>
                          <span className="summary-value">{layoutResult.semanticSummary.headers}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Navigation:</span>
                          <span className="summary-value">{layoutResult.semanticSummary.navigation}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Main:</span>
                          <span className="summary-value">{layoutResult.semanticSummary.main}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Sections:</span>
                          <span className="summary-value">{layoutResult.semanticSummary.sections}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Articles:</span>
                          <span className="summary-value">{layoutResult.semanticSummary.articles}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Forms:</span>
                          <span className="summary-value">{layoutResult.semanticSummary.forms}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Buttons:</span>
                          <span className="summary-value">{layoutResult.semanticSummary.buttons}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Links:</span>
                          <span className="summary-value">{layoutResult.semanticSummary.links}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Images:</span>
                          <span className="summary-value">{layoutResult.semanticSummary.images}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Lists:</span>
                          <span className="summary-value">{layoutResult.semanticSummary.lists}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Layout Tree */}
                  <div className="layout-tree">
                    {renderLayoutElement(layoutResult.layout)}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="content-section">
            <h4 className="subsection-title">Features</h4>
            <ul className="feature-list">
              <li>Smart search input detection</li>
              <li>Product information extraction</li>
              <li>DOM layout analysis</li>
              <li>Semantic element classification</li>
              <li>Add to cart button detection</li>
              <li>Real-time feedback</li>
            </ul>
          </div>

          <div className="content-section">
            <div className="action-buttons">
              <button 
                className="secondary-button"
                onClick={() => searchInputRef.current?.focus()}
              >
                Focus Search
              </button>
              <button 
                className="secondary-button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResult(null);
                  setProductsResult(null);
                  setShowProducts(false);
                  setLayoutResult(null);
                  setShowLayout(false);
                }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

FloatingFrame.displayName = 'FloatingFrame';

export default FloatingFrame;