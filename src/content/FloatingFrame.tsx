import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, Minimize2, Maximize2, MessageCircle, ShoppingCart, Send, Image, Star, ExternalLink, Eye, CreditCard, Package, CheckCircle } from 'lucide-react';
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

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  hasProducts?: boolean;
  products?: {
    takeMeThere: string;
    selectedProducts: Array<{
      asin: string;
      title: string;
      link: string;
      rating: string;
      reviews: string;
      price: string;
      extracted_price: number;
      original_price?: string;
      extracted_original_price?: number;
      fulfillment?: {
        standard_delivery?: {
          text: string;
          type: string;
          date: string;
        };
      };
      is_prime?: boolean;
      thumbnail: string;
      reason: string;
    }>;
  };
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
  const [activeTab, setActiveTab] = useState<'chat' | 'checkout'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  // Checkout options state
  const [checkoutOptions, setCheckoutOptions] = useState({
    buyNow: false,
    cashOnDelivery: false,
    placeOrder: false
  });
  
  const frameRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize component
  useEffect(() => {
    setIsLoading(false);
    // Add welcome message
    setMessages([{
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI shopping assistant. I can help you find products, compare prices, and assist with your shopping needs. How can I help you today?',
      timestamp: new Date()
    }]);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Toggle expand/collapse
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // Handle tab change
  const handleTabChange = useCallback((tab: 'chat' | 'checkout') => {
    setActiveTab(tab);
  }, []);

  // Handle checkout option change
  const handleCheckoutOptionChange = useCallback((option: keyof typeof checkoutOptions) => {
    setCheckoutOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  }, []);

  // Handle checkout
  const handleCheckout = useCallback(async () => {
    const selectedActions: string[] = [];
    
    if (checkoutOptions.buyNow) selectedActions.push('buy_now');
    if (checkoutOptions.cashOnDelivery) selectedActions.push('cash_on_delivery');
    if (checkoutOptions.placeOrder) selectedActions.push('place_order');

    if (selectedActions.length === 0) {
      alert('Please select at least one action to automate.');
      return;
    }

    setIsCheckingOut(true);

    try {
      // Send actions to background script
      for (const action of selectedActions) {
        await new Promise<void>((resolve, reject) => {
          chrome.runtime.sendMessage({
            type: 'APPEND_ACTION',
            action: action
          }, (response) => {
            if (response?.success) {
              console.log(`Action ${action} added to queue`);
              resolve();
            } else {
              console.error(`Failed to add action ${action}:`, response?.error);
              reject(new Error(response?.error || 'Unknown error'));
            }
          });
        });
      }

      alert(`Successfully queued ${selectedActions.length} action(s) for automation:\n${selectedActions.join(', ')}`);
      
      // Reset options after successful checkout
      setCheckoutOptions({
        buyNow: false,
        cashOnDelivery: false,
        placeOrder: false
      });

    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to queue actions. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  }, [checkoutOptions]);

  // Handle send message
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const mockResponse = {
        response: "I found some great laptops for you! Here are my top recommendations based on your requirements.",
        hasProducts: true,
        products: {
          takeMeThere: "https://amazon.in/s?k=laptops",
          selectedProducts: [
            {
              asin: "B0CV9VTBKD",
              title: "MSI Thin15 B12UCX-1693IN Intel Core i7-12650H 12th Gen 39.6cm FHD 144Hz Gaming Laptop (16GB/512GB NVMe SSD/Windows 11 Home/NVIDIA GeForce RTX3050, GDDR6 4GB/Black/1.86Kg)",
              link: "https://amazon.in/dp/B0CV9VTBKD",
              rating: "4.5",
              reviews: "1,234",
              price: "₹72,799",
              extracted_price: 72799,
              original_price: "₹85,999",
              extracted_original_price: 85999,
              fulfillment: {
                standard_delivery: {
                  text: "FREE delivery Sun, 15 Jun",
                  type: "FREE delivery",
                  date: "Sun, 15 Jun"
                }
              },
              is_prime: true,
              thumbnail: "https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=300",
              reason: "This MSI Thin15 laptop is selected due to its high rating (4.5), competitive price (₹72,799), and features like Intel Core i7-12650H processor and NVIDIA GeForce RTX3050 graphics, aligning with the customer's preference for high-rated, cost-effective gaming laptops from reputed brands."
            }
          ]
        }
      };

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: mockResponse.response,
        timestamp: new Date(),
        hasProducts: mockResponse.hasProducts,
        products: mockResponse.products
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 2000);
  }, [inputMessage]);

  // Handle image upload
  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'user',
          content: `[Image uploaded: ${file.name}]`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, imageMessage]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Handle key press
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

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
          <span className="header-title">AI Assistant</span>
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
                className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => handleTabChange('chat')}
              >
                <MessageCircle size={16} />
                Chat
              </button>
              <button
                className={`tab-button ${activeTab === 'checkout' ? 'active' : ''}`}
                onClick={() => handleTabChange('checkout')}
              >
                <ShoppingCart size={16} />
                Quick Checkout
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'chat' && (
                <div className="chat-container">
                  {/* Chat Messages */}
                  <div className="chat-messages" ref={chatContainerRef}>
                    {messages.map((message) => (
                      <div key={message.id} className={`message ${message.type}`}>
                        <div className="message-content">
                          {message.content}
                        </div>
                        
                        {/* Product Cards */}
                        {message.hasProducts && message.products && (
                          <div className="products-section">
                            {message.products.selectedProducts.map((product, index) => (
                              <div key={index} className="product-card">
                                <div className="product-image">
                                  <img src={product.thumbnail} alt={product.title} />
                                  {product.is_prime && <div className="prime-badge">Prime</div>}
                                </div>
                                <div className="product-info">
                                  <h4 className="product-title">{product.title}</h4>
                                  <div className="product-rating">
                                    <div className="stars">
                                      <Star size={14} fill="#fbbf24" color="#fbbf24" />
                                      <span>{product.rating}</span>
                                    </div>
                                    <span className="reviews">({product.reviews} reviews)</span>
                                  </div>
                                  <div className="product-pricing">
                                    <span className="current-price">{product.price}</span>
                                    {product.original_price && (
                                      <span className="original-price">{product.original_price}</span>
                                    )}
                                  </div>
                                  {product.fulfillment?.standard_delivery && (
                                    <div className="delivery-info">
                                      {product.fulfillment.standard_delivery.text}
                                    </div>
                                  )}
                                  <div className="product-reason">
                                    <strong>Why this product:</strong> {product.reason}
                                  </div>
                                  <div className="product-actions">
                                    <a 
                                      href={product.link} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="view-product-button"
                                    >
                                      <Eye size={16} />
                                      View Product
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {/* Take Me There Button */}
                            <div className="take-me-there">
                              <a 
                                href={message.products.takeMeThere} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="take-me-there-button"
                              >
                                <ExternalLink size={16} />
                                View All Results on Amazon
                              </a>
                            </div>
                          </div>
                        )}
                        
                        <div className="message-timestamp">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                    
                    {/* Typing Indicator */}
                    {isTyping && (
                      <div className="message assistant">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="chat-input-container">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <button
                      className="image-upload-button"
                      onClick={handleImageUpload}
                      title="Upload image"
                    >
                      <Image size={18} />
                    </button>
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything about products..."
                      className="chat-input"
                      disabled={isTyping}
                    />
                    <button
                      className="send-button"
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isTyping}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'checkout' && (
                <div className="content-section">
                  <div className="section-title">Quick Checkout</div>
                  <div className="section-description">
                    Select which steps you want to automate during checkout
                  </div>
                  
                  <div className="checkout-options">
                    <div className="checkout-option">
                      <div className="option-content">
                        <div className="option-icon">
                          <Package size={20} />
                        </div>
                        <div className="option-details">
                          <div className="option-title">Buy Now</div>
                          <div className="option-description">
                            Automatically click the "Buy Now" button on product pages
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="option-checkbox"
                        checked={checkoutOptions.buyNow}
                        onChange={() => handleCheckoutOptionChange('buyNow')}
                      />
                    </div>

                    <div className="checkout-option">
                      <div className="option-content">
                        <div className="option-icon">
                          <CreditCard size={20} />
                        </div>
                        <div className="option-details">
                          <div className="option-title">Cash on Delivery</div>
                          <div className="option-description">
                            Select Cash on Delivery as payment method
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="option-checkbox"
                        checked={checkoutOptions.cashOnDelivery}
                        onChange={() => handleCheckoutOptionChange('cashOnDelivery')}
                      />
                    </div>

                    <div className="checkout-option">
                      <div className="option-content">
                        <div className="option-icon">
                          <CheckCircle size={20} />
                        </div>
                        <div className="option-details">
                          <div className="option-title">Place Your Order</div>
                          <div className="option-description">
                            Complete the order by clicking "Place Your Order"
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="option-checkbox"
                        checked={checkoutOptions.placeOrder}
                        onChange={() => handleCheckoutOptionChange('placeOrder')}
                      />
                    </div>
                  </div>

                  <div className="checkout-actions">
                    <button
                      className="checkout-button"
                      onClick={handleCheckout}
                      disabled={isCheckingOut || Object.values(checkoutOptions).every(v => !v)}
                    >
                      {isCheckingOut ? (
                        <>
                          <div className="button-spinner"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={18} />
                          Start Checkout
                        </>
                      )}
                    </button>
                  </div>

                  <div className="checkout-info">
                    <div className="info-title">How it works:</div>
                    <ul className="info-list">
                      <li>Select the automation steps you want</li>
                      <li>Click "Start Checkout" to queue the actions</li>
                      <li>Navigate to Amazon and the actions will execute automatically</li>
                      <li>Monitor the progress in the browser console</li>
                    </ul>
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