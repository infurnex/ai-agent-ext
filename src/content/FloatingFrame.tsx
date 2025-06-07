import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, Minimize2, Maximize2, Search, Package } from 'lucide-react';
import { SearchResult } from './actions/searchAction';
import { FetchProductsResult, Product } from './actions/fetchDOMProductsAction';

interface FloatingFrameProps {
  onClose?: () => void;
  onSearch?: (query: string) => Promise<SearchResult>;
  onFetchProducts?: () => Promise<FetchProductsResult>;
}

const FloatingFrame: React.FC<FloatingFrameProps> = memo(({ onClose, onSearch, onFetchProducts }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [productsResult, setProductsResult] = useState<FetchProductsResult | null>(null);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
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
          <span className="header-title">Product Assistant</span>
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
          
          <div className="content-section">
            <h4 className="subsection-title">Features</h4>
            <ul className="feature-list">
              <li>Smart search input detection</li>
              <li>Product information extraction</li>
              <li>DOM element analysis</li>
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