import React from 'react';
import { createRoot } from 'react-dom/client';
import FloatingFrame from './FloatingFrame';

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

      // Mount React component
      this.reactRoot = createRoot(reactContainer);
      this.reactRoot.render(
        React.createElement(FloatingFrame, {
          onClose: () => this.removeFrame()
        })
      );

      // Add to DOM
      document.body.appendChild(this.shadowHost);
      this.isInjected = true;

      console.log('Floating frame injected successfully');
    } catch (error) {
      console.error('Failed to inject floating frame:', error);
      this.cleanup();
    }
  }

  private async injectStyles(): Promise<void> {
    if (!this.shadowRoot) return;

    const styleElement = document.createElement('style');
    styleElement.textContent = await this.getStyles();
    this.shadowRoot.appendChild(styleElement);
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
        width: 300px;
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
      }

      .floating-frame.expanded {
        height: 400px;
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
        height: calc(100% - 60px);
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
      }

      .subsection-title {
        font-size: 16px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 12px;
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
      }

      .primary-button:hover {
        background: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
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
          max-width: 300px;
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