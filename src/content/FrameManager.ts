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
        width: 380px;
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
        flex: 1;
        overflow: hidden;
      }

      .header-title {
        font-weight: 600;
        color: #1f2937;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
        height: auto;
        max-height: calc(80vh - 60px);
        overflow: hidden;
      }

      /* Login Styles */
      .login-container {
        padding: 32px 24px;
        text-align: center;
        height: calc(80vh - 60px);
        display: flex;
        flex-direction: column;
        justify-content: center;
        max-height: 500px;
      }

      .login-header {
        margin-bottom: 32px;
      }

      .login-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        background: rgba(37, 99, 235, 0.1);
        border-radius: 16px;
        color: #2563eb;
        margin: 0 auto 16px;
      }

      .login-title {
        font-size: 24px;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 8px;
      }

      .login-subtitle {
        font-size: 14px;
        color: #6b7280;
        line-height: 1.5;
      }

      .login-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin-bottom: 24px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        text-align: left;
      }

      .form-label {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }

      .form-input {
        padding: 12px 16px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        background: white;
        color: #374151;
        transition: all 150ms ease-in-out;
      }

      .form-input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }

      .form-input:disabled {
        background: #f9fafb;
        color: #9ca3af;
        cursor: not-allowed;
      }

      .auth-error {
        padding: 12px 16px;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        border-radius: 8px;
        color: #dc2626;
        font-size: 14px;
        text-align: center;
      }

      .login-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 14px 20px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
        cursor: pointer;
        transition: all 150ms ease-in-out;
      }

      .login-button:hover:not(:disabled) {
        background: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3);
      }

      .login-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .login-footer {
        margin-top: auto;
      }

      .login-help {
        font-size: 12px;
        color: #9ca3af;
        line-height: 1.4;
      }

      /* Loading Messages */
      .loading-messages {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        gap: 16px;
        color: #6b7280;
        font-size: 14px;
      }

      .loading-messages .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e5e7eb;
        border-top: 3px solid #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      /* Tabs and existing styles remain the same */
      .tabs-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .tabs-header {
        display: flex;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
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
        flex: 1;
        height: calc(80vh - 120px);
        overflow: hidden;
      }

      .chat-container {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .chat-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        max-height: calc(80vh - 180px);
        scrollbar-width: thin;
        scrollbar-color: rgba(107, 114, 128, 0.3) transparent;
      }

      .chat-messages::-webkit-scrollbar {
        width: 6px;
      }

      .chat-messages::-webkit-scrollbar-track {
        background: transparent;
      }

      .chat-messages::-webkit-scrollbar-thumb {
        background: rgba(107, 114, 128, 0.3);
        border-radius: 3px;
      }

      .message {
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
      }

      .message.user {
        align-items: flex-end;
      }

      .message.assistant {
        align-items: flex-start;
      }

      .message-content {
        max-width: 80%;
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
      }

      .message.user .message-content {
        background: #2563eb;
        color: white;
        border-bottom-right-radius: 4px;
      }

      .message.assistant .message-content {
        background: #f3f4f6;
        color: #374151;
        border-bottom-left-radius: 4px;
      }

      .message-image {
        max-width: 80%;
        margin-top: 8px;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid #e5e7eb;
      }

      .message-image img {
        width: 100%;
        height: auto;
        max-height: 200px;
        object-fit: cover;
        display: block;
      }

      .image-name {
        padding: 8px 12px;
        background: #f9fafb;
        font-size: 12px;
        color: #6b7280;
        border-top: 1px solid #e5e7eb;
      }

      .message-timestamp {
        font-size: 11px;
        color: #9ca3af;
        margin-top: 4px;
        padding: 0 4px;
      }

      .products-section {
        width: 100%;
        margin-top: 12px;
      }

      .product-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .product-image {
        position: relative;
        width: 100%;
        height: 120px;
        margin-bottom: 12px;
        border-radius: 8px;
        overflow: hidden;
      }

      .product-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .prime-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        background: #ff9900;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
      }

      .product-info {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .product-title {
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .product-rating {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
      }

      .stars {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #fbbf24;
        font-weight: 600;
      }

      .reviews {
        color: #6b7280;
      }

      .product-pricing {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .current-price {
        font-size: 16px;
        font-weight: 700;
        color: #dc2626;
      }

      .original-price {
        font-size: 14px;
        color: #9ca3af;
        text-decoration: line-through;
      }

      .delivery-info {
        font-size: 12px;
        color: #059669;
        font-weight: 500;
      }

      .product-reason {
        font-size: 12px;
        color: #6b7280;
        line-height: 1.4;
        background: #f9fafb;
        padding: 8px;
        border-radius: 6px;
        border-left: 3px solid #2563eb;
      }

      .product-actions {
        margin-top: 8px;
        display: flex;
        justify-content: center;
      }

      .view-product-button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: #2563eb;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        font-size: 12px;
        transition: all 150ms ease-in-out;
      }

      .view-product-button:hover {
        background: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
      }

      .take-me-there {
        margin-top: 16px;
        text-align: center;
      }

      .take-me-there-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: #ff9900;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        transition: all 150ms ease-in-out;
      }

      .take-me-there-button:hover {
        background: #e68900;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(255, 153, 0, 0.3);
      }

      .typing-indicator {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 12px 16px;
        background: #f3f4f6;
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        max-width: 80px;
      }

      .typing-indicator span {
        width: 6px;
        height: 6px;
        background: #9ca3af;
        border-radius: 50%;
        animation: typing 1.4s infinite ease-in-out;
      }

      .typing-indicator span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .typing-indicator span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes typing {
        0%, 60%, 100% {
          transform: translateY(0);
          opacity: 0.5;
        }
        30% {
          transform: translateY(-10px);
          opacity: 1;
        }
      }

      .chat-input-container {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px;
        border-top: 1px solid #e5e7eb;
        background: white;
      }

      .image-upload-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        cursor: pointer;
        color: #6b7280;
        transition: all 150ms ease-in-out;
      }

      .image-upload-button:hover {
        background: #e5e7eb;
        color: #374151;
      }

      .image-upload-button.has-image {
        background: #dbeafe;
        border-color: #2563eb;
        color: #2563eb;
      }

      .chat-input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid #d1d5db;
        border-radius: 20px;
        font-size: 14px;
        background: white;
        color: #374151;
        outline: none;
        transition: all 150ms ease-in-out;
      }

      .chat-input:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }

      .chat-input:disabled {
        background: #f9fafb;
        color: #9ca3af;
        cursor: not-allowed;
      }

      .send-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        transition: all 150ms ease-in-out;
      }

      .send-button:hover:not(:disabled) {
        background: #1d4ed8;
        transform: scale(1.05);
      }

      .send-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        transform: none;
      }

      .content-section {
        padding: 20px;
        height: calc(80vh - 120px);
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(107, 114, 128, 0.3) transparent;
      }

      .content-section::-webkit-scrollbar {
        width: 6px;
      }

      .content-section::-webkit-scrollbar-track {
        background: transparent;
      }

      .content-section::-webkit-scrollbar-thumb {
        background: rgba(107, 114, 128, 0.3);
        border-radius: 3px;
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
        margin-bottom: 24px;
      }

      .checkout-options {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 24px;
      }

      .checkout-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        transition: all 150ms ease-in-out;
      }

      .checkout-option:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
      }

      .payment-method-section {
        padding: 16px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        transition: all 150ms ease-in-out;
      }

      .payment-method-section:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
      }

      .payment-method-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .payment-method-select {
        margin-left: 52px;
      }

      .payment-select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        background: white;
        color: #374151;
        font-size: 14px;
        cursor: pointer;
        transition: all 150ms ease-in-out;
      }

      .payment-select:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }

      .option-content {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }

      .option-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: rgba(37, 99, 235, 0.1);
        border-radius: 8px;
        color: #2563eb;
      }

      .option-details {
        flex: 1;
      }

      .option-title {
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 4px;
      }

      .option-description {
        font-size: 14px;
        color: #6b7280;
        line-height: 1.4;
      }

      .option-checkbox {
        width: 20px;
        height: 20px;
        accent-color: #2563eb;
        cursor: pointer;
      }

      .checkout-actions {
        margin-bottom: 24px;
      }

      .checkout-button {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px 24px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 12px;
        font-weight: 600;
        font-size: 16px;
        cursor: pointer;
        transition: all 150ms ease-in-out;
      }

      .checkout-button:hover:not(:disabled) {
        background: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3);
      }

      .checkout-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .button-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .checkout-info {
        background: rgba(37, 99, 235, 0.05);
        border: 1px solid rgba(37, 99, 235, 0.1);
        border-radius: 8px;
        padding: 16px;
      }

      .info-title {
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 8px;
      }

      .info-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .info-list li {
        font-size: 13px;
        color: #6b7280;
        padding: 4px 0;
        padding-left: 16px;
        position: relative;
        line-height: 1.4;
      }

      .info-list li::before {
        content: "•";
        color: #2563eb;
        font-weight: bold;
        position: absolute;
        left: 0;
        top: 4px;
      }

      .floating-frame-loading {
        position: fixed;
        bottom: 20px;
        left: 20px;
        width:  60px;
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
          max-width: 380px;
          bottom: 10px;
          left: 20px;
        }
        
        .tab-button {
          font-size: 12px;
          padding: 10px 12px;
        }

        .product-card {
          padding: 12px;
        }

        .product-image {
          height: 100px;
        }

        .checkout-option {
          padding: 12px;
        }

        .payment-method-section {
          padding: 12px;
        }

        .payment-method-select {
          margin-left: 48px;
        }

        .option-icon {
          width: 36px;
          height: 36px;
        }

        .option-title {
          font-size: 14px;
        }

        .option-description {
          font-size: 12px;
        }

        .login-container {
          padding: 24px 20px;
        }

        .login-title {
          font-size: 20px;
        }

        .login-icon {
          width: 56px;
          height: 56px;
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