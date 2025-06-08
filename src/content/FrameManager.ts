import React from 'react';
import { createRoot } from 'react-dom/client';
import FloatingFrame from './FloatingFrame';
import { searchAction, SearchResult } from './actions/searchAction';
import { fetchDOMProductsAction, FetchProductsResult } from './actions/fetchDOMProductsAction';
import { fetchLayoutAction, FetchLayoutResult } from './actions/fetchLayoutAction';
import { buyNowAction, BuyNowResult } from './actions/buyNowAction';

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
          onBuyNow: this.handleBuyNow.bind(this)
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

      .subsection-title {
        font-size: 16px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 12px;
      }

      .search-form {
        margin-bottom: 16px;
      }

      .search-input-container {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .search-input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        background: white;
        color: #374151;
        transition: all 150ms ease-in-out;
      }

      .search-input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }

      .search-input:disabled {
        background: #f9fafb;
        color: #9ca3af;
        cursor: not-allowed;
      }

      .search-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 150ms ease-in-out;
      }

      .search-button:hover:not(:disabled) {
        background: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
      }

      .search-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .search-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .search-result {
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 16px;
        border: 1px solid;
      }

      .search-result.success {
        background: rgba(16, 185, 129, 0.1);
        border-color: rgba(16, 185, 129, 0.2);
        color: #065f46;
      }

      .search-result.error {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.2);
        color: #991b1b;
      }

      .result-message {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 4px;
      }

      .result-details {
        font-size: 12px;
        opacity: 0.8;
      }

      .toggle-products-button {
        margin-top: 8px;
        padding: 6px 12px;
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 150ms ease-in-out;
      }

      .toggle-products-button:hover {
        background: #e5e7eb;
        border-color: #9ca3af;
      }

      .products-list {
        margin-top: 16px;
      }

      .products-container {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #f9fafb;
      }

      .product-card {
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
        background: white;
        margin: 4px;
        border-radius: 6px;
      }

      .product-card:last-child {
        border-bottom: none;
      }

      .product-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
        gap: 8px;
      }

      .product-title {
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
        flex: 1;
        line-height: 1.4;
      }

      .product-price {
        font-size: 14px;
        font-weight: 700;
        color: #059669;
        white-space: nowrap;
      }

      .product-description {
        font-size: 12px;
        color: #6b7280;
        line-height: 1.4;
        margin-bottom: 8px;
      }

      .product-details {
        font-size: 11px;
        color: #9ca3af;
        line-height: 1.3;
      }

      .product-details p {
        margin-bottom: 2px;
        word-break: break-all;
      }

      .product-details strong {
        color: #374151;
      }

      .layout-container {
        max-height: 400px;
        overflow-y: auto;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #f9fafb;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 12px;
      }

      .layout-summary {
        padding: 12px;
        background: white;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 8px;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 8px;
        margin-top: 8px;
      }

      .summary-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 8px;
        background: #f3f4f6;
        border-radius: 4px;
        font-size: 11px;
      }

      .summary-label {
        color: #6b7280;
        font-weight: 500;
      }

      .summary-value {
        color: #1f2937;
        font-weight: 600;
      }

      .layout-tree {
        padding: 12px;
      }

      .layout-element {
        margin-bottom: 4px;
        line-height: 1.4;
      }

      .element-tag {
        color: #dc2626;
        font-weight: 600;
      }

      .element-id {
        color: #2563eb;
        font-weight: 500;
      }

      .element-class {
        color: #059669;
      }

      .element-role {
        color: #7c3aed;
        font-style: italic;
      }

      .element-text {
        color: #374151;
        background: #f9fafb;
        padding: 2px 4px;
        border-radius: 2px;
        margin-left: 4px;
      }

      .element-invisible {
        opacity: 0.5;
        text-decoration: line-through;
      }

      .feature-list {
        list-style: none;
        padding: 0;
      }

      .feature-list li {
        font-size: 14px;
        color: #4b5563;
        padding: 6px 0;
        padding-left: 16px;
        position: relative;
        line-height: 1.5;
      }

      .feature-list li::before {
        content: "•";
        color: #2563eb;
        font-weight: bold;
        position: absolute;
        left: 0;
        top: 6px;
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

      .fetch-products-button {
        background: #059669;
      }

      .fetch-products-button:hover:not(:disabled) {
        background: #047857;
        box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
      }

      .fetch-layout-button {
        background: #7c3aed;
      }

      .fetch-layout-button:hover:not(:disabled) {
        background: #6d28d9;
        box-shadow: 0 4px 8px rgba(124, 58, 237, 0.3);
      }

      .buy-now-button {
        background: #dc2626;
      }

      .buy-now-button:hover:not(:disabled) {
        background: #b91c1c;
        box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
      }

      .button-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .secondary-button {
        flex: 1;
        min-width: 100px;
        padding: 12px 16px;
        background: transparent;
        color: #6b7280;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: all 150ms ease-in-out;
      }

      .secondary-button:hover {
        background: #f9fafb;
        border-color: #9ca3af;
        color: #374151;
        transform: translateY(-1px);
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
        
        .primary-button,
        .secondary-button {
          min-width: unset;
        }

        .search-input-container {
          flex-direction: column;
          gap: 12px;
        }

        .search-button {
          width: 100%;
          height: 44px;
        }

        .product-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .summary-grid {
          grid-template-columns: 1fr;
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