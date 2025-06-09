import React from 'react';
import { createRoot } from 'react-dom/client';
import FloatingFrame from './FloatingFrame';
import { searchAction, SearchResult } from './actions/searchAction';
import { fetchDOMProductsAction, FetchProductsResult } from './actions/fetchDOMProductsAction';
import { fetchLayoutAction, FetchLayoutResult } from './actions/fetchLayoutAction';
import { buyNowAction, BuyNowResult } from './actions/buyNowAction';
import { cashOnDeliveryPaymentAction, CashOnDeliveryResult } from './actions/cashOnDeliveryPaymentAction';
import { placeYourOrderAction, PlaceOrderResult } from './actions/placeYourOrderAction';

export class FloatingFrameManager {
  private shadowHost: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private reactRoot: any = null;
  private isInjected = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.injectFrame());
      } else {
        this.injectFrame();
      }
    } catch (error) {
      console.error('FloatingFrameManager initialization failed:', error);
    }
  }

  private async injectFrame(): Promise<void> {
    if (this.isInjected) return;

    try {
      // Create shadow host
      this.shadowHost = document.createElement('div');
      this.shadowHost.id = 'floating-frame-extension-host';
      this.shadowHost.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 0 !important;
        height: 0 !important;
        z-index: 2147483647 !important;
        pointer-events: none !important;
      `;

      // Create closed shadow root for isolation
      this.shadowRoot = this.shadowHost.attachShadow({ mode: 'closed' });

      // Inject CSS into shadow DOM
      await this.injectStyles();

      // Create React container
      const reactContainer = document.createElement('div');
      reactContainer.id = 'floating-frame-react-root';
      this.shadowRoot.appendChild(reactContainer);

      // Mount React component with all functionality
      this.reactRoot = createRoot(reactContainer);
      this.reactRoot.render(
        React.createElement(FloatingFrame, {
          onClose: () => this.removeFrame(),
          onSearch: this.handleSearch.bind(this),
          onFetchProducts: this.handleFetchProducts.bind(this),
          onFetchLayout: this.handleFetchLayout.bind(this),
          onBuyNow: this.handleBuyNow.bind(this),
          onCashOnDelivery: this.handleCashOnDelivery.bind(this),
          onPlaceOrder: this.handlePlaceOrder.bind(this)
        })
      );

      // Add to DOM
      document.body.appendChild(this.shadowHost);
      this.isInjected = true;

      console.log('Floating frame with full functionality injected successfully');
    } catch (error) {
      console.error('Failed to inject floating frame:', error);
      this.cleanup();
    }
  }

  private async handleSearch(query: string): Promise<SearchResult> {
    try {
      console.log('Performing search for:', query);
      const result = await searchAction(query);
      console.log('Search result:', result);
      return result;
    } catch (error) {
      console.error('Search action failed:', error);
      return {
        success: false,
        message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async handleFetchProducts(): Promise<FetchProductsResult> {
    try {
      console.log('Fetching products from DOM...');
      const result = await fetchDOMProductsAction();
      console.log('Fetch products result:', result);
      return result;
    } catch (error) {
      console.error('Fetch products action failed:', error);
      return {
        success: false,
        message: `Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`,
        count: 0
      };
    }
  }

  private async handleFetchLayout(): Promise<FetchLayoutResult> {
    try {
      console.log('Fetching DOM layout structure...');
      const result = await fetchLayoutAction();
      console.log('Fetch layout result:', result);
      return result;
    } catch (error) {
      console.error('Fetch layout action failed:', error);
      return {
        success: false,
        message: `Failed to fetch layout: ${error instanceof Error ? error.message : 'Unknown error'}`,
        totalElements: 0
      };
    }
  }

  private async handleBuyNow(): Promise<BuyNowResult> {
    try {
      console.log('Attempting to find and click buy now button...');
      const result = await buyNowAction();
      console.log('Buy now result:', result);
      return result;
    } catch (error) {
      console.error('Buy now action failed:', error);
      return {
        success: false,
        message: `Buy now action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        buttonFound: false
      };
    }
  }

  private async handleCashOnDelivery(): Promise<CashOnDeliveryResult> {
    try {
      console.log('Attempting to select Cash on Delivery payment method...');
      const result = await cashOnDeliveryPaymentAction();
      console.log('Cash on Delivery result:', result);
      return result;
    } catch (error) {
      console.error('Cash on Delivery action failed:', error);
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

  private async handlePlaceOrder(): Promise<PlaceOrderResult> {
    try {
      console.log('Attempting to place order...');
      const result = await placeYourOrderAction();
      console.log('Place order result:', result);
      return result;
    } catch (error) {
      console.error('Place order action failed:', error);
      return {
        success: false,
        message: `Place order action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        buttonFound: false,
        isOrderReviewPage: false
      };
    }
  }

  private async injectStyles(): Promise<string> {
    if (!this.shadowRoot) return '';

    const styleElement = document.createElement('style');
    styleElement.textContent = await this.getStyles();
    this.shadowRoot.appendChild(styleElement);
    return '';
  }

  private async getStyles(): Promise<string> {
    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .floating-frame {
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 320px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 16px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 2147483647;
        pointer-events: auto;
        transition: all 200ms ease-in-out;
        overflow: hidden;
        max-height: 80vh;
      }

      .floating-frame.expanded {
        height: auto;
        max-height: 80vh;
      }

      .floating-frame.collapsed {
        height: 60px;
      }

      .floating-frame-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: rgba(37, 99, 235, 0.05);
        border-bottom: 1px solid rgba(37, 99, 235, 0.1);
        user-select: none;
        min-height: 60px;
      }

      .header-content {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #374151;
        font-weight: 500;
        font-size: 14px;
      }

      .header-title {
        font-weight: 600;
        color: #1f2937;
      }

      .header-controls {
        display: flex;
        gap: 4px;
      }

      .control-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        border-radius: 8px;
        cursor: pointer;
        color: #6b7280;
        transition: all 150ms ease-in-out;
      }

      .control-button:hover {
        background: rgba(107, 114, 128, 0.1);
        color: #374151;
        transform: scale(1.05);
      }

      .control-button.close-button:hover {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
      }

      .floating-frame-content {
        padding: 20px;
        height: auto;
        max-height: calc(80vh - 60px);
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(107, 114, 128, 0.3) transparent;
      }

      .floating-frame-content::-webkit-scrollbar {
        width: 6px;
      }

      .floating-frame-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .floating-frame-content::-webkit-scrollbar-thumb {
        background: rgba(107, 114, 128, 0.3);
        border-radius: 3px;
      }

      .floating-frame-content::-webkit-scrollbar-thumb:hover {
        background: rgba(107, 114, 128, 0.5);
      }

      .tabs-container {
        width: 100%;
      }

      .tabs-header {
        display: flex;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 20px;
      }

      .tab-button {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: #6b7280;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: all 150ms ease-in-out;
      }

      .tab-button:hover {
        color: #374151;
        background: rgba(107, 114, 128, 0.05);
      }

      .tab-button.active {
        color: #2563eb;
        border-bottom-color: #2563eb;
        background: rgba(37, 99, 235, 0.05);
      }

      .tab-content {
        min-height: 200px;
      }

      .content-section {
        margin-bottom: 24px;
      }

      .content-section:last-child {
        margin-bottom: 0;
      }

      .section-title {
        font-size: 18px;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 8px;
        line-height: 1.4;
      }

      .section-description {
        font-size: 14px;
        color: #6b7280;
        line-height: 1.6;
        margin-bottom: 16px;
      }

      .action-buttons {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .primary-button {
        flex: 1;
        min-width: 120px;
        padding: 12px 16px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 150ms ease-in-out;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .primary-button:hover:not(:disabled) {
        background: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
      }

      .primary-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .append-queue-button {
        background: #8b5cf6;
      }

      .append-queue-button:hover:not(:disabled) {
        background: #7c3aed;
        box-shadow: 0 4px 8px rgba(139, 92, 246, 0.3);
      }

      .settings-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .setting-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }

      .setting-label {
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      }

      .setting-checkbox {
        width: 18px;
        height: 18px;
        accent-color: #2563eb;
        cursor: pointer;
      }

      .floating-frame-loading {
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 60px;
        height: 60px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 2147483647;
      }

      .loading-spinner {
        width: 24px;
        height: 24px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @media (max-width: 768px) {
        .floating-frame {
          width: calc(100vw - 40px);
          max-width: 320px;
          bottom: 10px;
          left: 20px;
        }
        
        .action-buttons {
          flex-direction: column;
        }
        
        .primary-button {
          min-width: unset;
        }

        .tab-button {
          font-size: 12px;
          padding: 10px 12px;
        }
      }

      @media (max-width: 480px) {
        .floating-frame {
          left: 10px;
          width: calc(100vw - 20px);
        }
      }
    `;
  }

  private removeFrame(): void {
    try {
      if (this.reactRoot) {
        this.reactRoot.unmount();
        this.reactRoot = null;
      }
      
      if (this.shadowHost && this.shadowHost.parentNode) {
        this.shadowHost.parentNode.removeChild(this.shadowHost);
      }
      
      this.cleanup();
      console.log('Floating frame removed successfully');
    } catch (error) {
      console.error('Failed to remove floating frame:', error);
    }
  }

  private cleanup(): void {
    this.shadowHost = null;
    this.shadowRoot = null;
    this.reactRoot = null;
    this.isInjected = false;
  }
}