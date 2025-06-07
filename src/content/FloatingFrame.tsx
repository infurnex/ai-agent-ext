import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, Minimize2, Maximize2, Search } from 'lucide-react';
import { SearchResult } from './actions/searchAction';

interface FloatingFrameProps {
  onClose?: () => void;
  onSearch?: (query: string) => Promise<SearchResult>;
}

const FloatingFrame: React.FC<FloatingFrameProps> = memo(({ onClose, onSearch }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize component
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Click away listener
  useEffect(() => {
    const handleClickAway = (e: MouseEvent) => {
      if (frameRef.current && !frameRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickAway);
      return () => document.removeEventListener('mousedown', handleClickAway);
    }
  }, [isExpanded]);

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
          <span className="header-title">Search Assistant</span>
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
          
          <div className="content-section">
            <h4 className="subsection-title">Features</h4>
            <ul className="feature-list">
              <li>Smart search input detection</li>
              <li>Automatic form submission</li>
              <li>Multiple search strategies</li>
              <li>Real-time feedback</li>
              <li>Static positioning</li>
            </ul>
          </div>

          <div className="content-section">
            <div className="action-buttons">
              <button 
                className="primary-button"
                onClick={() => searchInputRef.current?.focus()}
              >
                Focus Search
              </button>
              <button 
                className="secondary-button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResult(null);
                }}
              >
                Clear
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