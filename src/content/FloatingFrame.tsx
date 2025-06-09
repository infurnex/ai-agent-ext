import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, Minimize2, Maximize2, Search, Package, Layout, ShoppingCart, CreditCard, CheckCircle, Plus, Settings, Activity } from 'lucide-react';
import { SearchResult } from './actions/searchAction';
import { FetchProductsResult, Product } from './actions/fetchDOMProductsAction';
import { FetchLayoutResult, LayoutElement } from './actions/fetchLayoutAction';
import { BuyNowResult } from './actions/buyNowAction';
import { CashOnDeliveryResult } from './actions/cashOnDeliveryPaymentAction';
import { PlaceOrderResult } from './actions/placeYourOrderAction';

interface FloatingFrameProps {
  onClose?: () => void;
  onSearch?: (query: string) => Promise<SearchResult>;
  onFetchProducts?: () => Promise<FetchProductsResult>;
  onFetchLayout?: () => Promise<FetchLayoutResult>;
  onBuyNow?: () => Promise<BuyNowResult>;
  onCashOnDelivery?: () => Promise<CashOnDeliveryResult>;
  onPlaceOrder?: () => Promise<PlaceOrderResult>;
}

const FloatingFrame: React.FC<FloatingFrameProps> = memo(({ 
  onClose, 
  onSearch, 
  onFetchProducts, 
  onFetchLayout, 
  onBuyNow,
  onCashOnDelivery,
  onPlaceOrder
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'actions' | 'settings'>('actions');
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

  // Handle tab change
  const handleTabChange = useCallback((tab: 'actions' | 'settings') => {
    setActiveTab(tab);
  }, []);

  // Handle append action to queue
  const handleAppendAction = useCallback(async () => {
    try {
      const queue = ["buy_now", "cash_on_delivery"];
      
      for (const action of queue) {
        await new Promise<void>((resolve) => {
          chrome.runtime.sendMessage({
            type: 'APPEND_ACTION',
            action: action
          }, (response) => {
            console.log(`Appended ${action} to queue:`, response);
            resolve();
          });
        });
      }
    } catch (error) {
      console.error('Failed to append actions:', error);
    }
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
          {/* Tabs */}
          <div className="tabs-container">
            <div className="tabs-header">
              <button
                className={`tab-button ${activeTab === 'actions' ? 'active' : ''}`}
                onClick={() => handleTabChange('actions')}
              >
                <Activity size={16} />
                Actions
              </button>
              <button
                className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => handleTabChange('settings')}
              >
                <Settings size={16} />
                Settings
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'actions' && (
                <div className="content-section">
                  <div className="section-title">Quick Actions</div>
                  <div className="section-description">
                    Execute automated actions on the current page
                  </div>
                  
                  <div className="action-buttons">
                    <button
                      className="primary-button append-queue-button"
                      onClick={handleAppendAction}
                    >
                      <Plus size={16} />
                      Append Queue
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="content-section">
                  <div className="section-title">Settings</div>
                  <div className="section-description">
                    Configure extension preferences and options
                  </div>
                  
                  <div className="settings-list">
                    <div className="setting-item">
                      <span className="setting-label">Auto-execute actions</span>
                      <input type="checkbox" className="setting-checkbox" defaultChecked />
                    </div>
                    <div className="setting-item">
                      <span className="setting-label">Show notifications</span>
                      <input type="checkbox" className="setting-checkbox" defaultChecked />
                    </div>
                    <div className="setting-item">
                      <span className="setting-label">Debug mode</span>
                      <input type="checkbox" className="setting-checkbox" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

FloatingFrame.displayName = 'FloatingFrame';

export default FloatingFrame;