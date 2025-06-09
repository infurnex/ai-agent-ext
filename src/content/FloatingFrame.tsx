import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, Minimize2, Maximize2, MessageCircle, ShoppingCart, Send, Image, Star, ExternalLink, Eye, CreditCard, Package, CheckCircle, LogIn, User } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
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

interface User {
  id: string;
  email: string;
}

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hmwchcxvaweffijzstls.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtd2NoY3h2YXdlZmZpanpzdGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NTg0ODAsImV4cCI6MjA2NTAzNDQ4MH0.LiC_-lMYV6erflw8bRqBystXhklMG8PpCOgthiFQ-Qk';
const supabase = createClient(supabaseUrl, supabaseKey);

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
  
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [authError, setAuthError] = useState<string>('');
  
  // Checkout options state
  const [checkoutOptions, setCheckoutOptions] = useState({
    buyNow: false,
    paymentMethod: '',
    placeOrder: false
  });
  
  const frameRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load messages from Supabase
  const loadMessages = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      const formattedMessages: ChatMessage[] = data.map(msg => ({
        id: msg.id,
        type: msg.type as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        hasProducts: msg.has_products || false,
        products: msg.products_data || undefined
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, []);

  // Save message to Supabase
  const saveMessage = useCallback(async (message: ChatMessage, userId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          type: message.type,
          content: message.content,
          has_products: message.hasProducts || false,
          products_data: message.products || null
        });

      if (error) {
        console.error('Error saving message:', error);
      }
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }, []);

  // Initialize component and check auth
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userData = {
            id: session.user.id,
            email: session.user.email || ''
          };
          setUser(userData);
          
          // Load existing messages
          await loadMessages(session.user.id);
          
          // Add welcome message if no messages exist
          if (messages.length === 0) {
            const welcomeMessage: ChatMessage = {
              id: 'welcome-' + Date.now(),
              type: 'assistant',
              content: `Welcome back! I'm your AI shopping assistant. I can help you find products, compare prices, and assist with your shopping needs. How can I help you today?`,
              timestamp: new Date()
            };
            setMessages([welcomeMessage]);
            await saveMessage(welcomeMessage, session.user.id);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email || ''
        };
        setUser(userData);
        setAuthError('');
        
        // Load messages for the authenticated user
        await loadMessages(session.user.id);
      } else {
        setUser(null);
        setMessages([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadMessages, saveMessage]);

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

  // Handle login form change
  const handleLoginFormChange = useCallback((field: 'email' | 'password', value: string) => {
    setLoginForm(prev => ({
      ...prev,
      [field]: value
    }));
    setAuthError('');
  }, []);

  // Handle login
  const handleLogin = useCallback(async () => {
    if (!loginForm.email || !loginForm.password) {
      setAuthError('Please enter both email and password');
      return;
    }

    setIsAuthenticating(true);
    setAuthError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      });

      if (error) {
        setAuthError(error.message);
      } else if (data.user) {
        const userData = {
          id: data.user.id,
          email: data.user.email || ''
        };
        setUser(userData);
        setLoginForm({ email: '', password: '' });
        
        // Load existing messages
        await loadMessages(data.user.id);
        
        // Add welcome message if no messages exist
        const welcomeMessage: ChatMessage = {
          id: 'welcome-' + Date.now(),
          type: 'assistant',
          content: `Welcome back, ${data.user.email}! I'm your AI shopping assistant. I can help you find products, compare prices, and assist with your shopping needs. How can I help you today?`,
          timestamp: new Date()
        };
        setMessages(prev => prev.length === 0 ? [welcomeMessage] : prev);
        if (messages.length === 0) {
          await saveMessage(welcomeMessage, data.user.id);
        }
      }
    } catch (error) {
      setAuthError('Login failed. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsAuthenticating(false);
    }
  }, [loginForm, loadMessages, saveMessage, messages.length]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setMessages([]);
      setLoginForm({ email: '', password: '' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  // Handle checkout option change
  const handleCheckoutOptionChange = useCallback((option: keyof typeof checkoutOptions, value?: any) => {
    setCheckoutOptions(prev => ({
      ...prev,
      [option]: value !== undefined ? value : !prev[option]
    }));
  }, []);

  // Handle checkout
  const handleCheckout = useCallback(async () => {
    const selectedActions: string[] = [];
    
    if (checkoutOptions.buyNow) selectedActions.push('buy_now');
    if (checkoutOptions.paymentMethod === 'cash_on_delivery') selectedActions.push('cash_on_delivery');
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
        paymentMethod: '',
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
    if (!inputMessage.trim() || !user) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    // Add user message to UI and save to database
    setMessages(prev => [...prev, userMessage]);
    await saveMessage(userMessage, user.id);
    
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(async () => {
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

      // Add assistant message to UI and save to database
      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage(assistantMessage, user.id);
      setIsTyping(false);
    }, 2000);
  }, [inputMessage, user, saveMessage]);

  // Handle image upload
  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/') && user) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'user',
          content: `[Image uploaded: ${file.name}]`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, imageMessage]);
        await saveMessage(imageMessage, user.id);
      };
      reader.readAsDataURL(file);
    }
  }, [user, saveMessage]);

  // Handle key press
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (user) {
        handleSendMessage();
      } else {
        handleLogin();
      }
    }
  }, [handleSendMessage, handleLogin, user]);

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
          <span className="header-title">
            {user ? `AI Assistant - ${user.email}` : 'AI Assistant - Login Required'}
          </span>
        </div>
        <div className="header-controls">
          {user && (
            <button
              className="control-button"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
            >
              <User size={16} />
            </button>
          )}
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
          {!user ? (
            /* Login Form */
            <div className="login-container">
              <div className="login-header">
                <div className="login-icon">
                  <LogIn size={32} />
                </div>
                <h2 className="login-title">Welcome Back</h2>
                <p className="login-subtitle">Sign in to access your AI shopping assistant</p>
              </div>
              
              <div className="login-form">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => handleLoginFormChange('email', e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your email"
                    className="form-input"
                    disabled={isAuthenticating}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => handleLoginFormChange('password', e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your password"
                    className="form-input"
                    disabled={isAuthenticating}
                  />
                </div>
                
                {authError && (
                  <div className="auth-error">
                    {authError}
                  </div>
                )}
                
                <button
                  onClick={handleLogin}
                  disabled={isAuthenticating || !loginForm.email || !loginForm.password}
                  className="login-button"
                >
                  {isAuthenticating ? (
                    <>
                      <div className="button-spinner"></div>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn size={18} />
                      Sign In
                    </>
                  )}
                </button>
              </div>
              
              <div className="login-footer">
                <p className="login-help">
                  Need an account? Contact your administrator to get access.
                </p>
              </div>
            </div>
          ) : (
            /* Authenticated Content - Tabs */
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

                      <div className="payment-method-section">
                        <div className="payment-method-header">
                          <div className="option-icon">
                            <CreditCard size={20} />
                          </div>
                          <div className="option-details">
                            <div className="option-title">Payment Method</div>
                            <div className="option-description">
                              Select your preferred payment method for automation
                            </div>
                          </div>
                        </div>
                        <div className="payment-method-select">
                          <select
                            value={checkoutOptions.paymentMethod}
                            onChange={(e) => handleCheckoutOptionChange('paymentMethod', e.target.value)}
                            className="payment-select"
                          >
                            <option value="">Select payment method</option>
                            <option value="cash_on_delivery">Cash on Delivery</option>
                          </select>
                        </div>
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
                        disabled={isCheckingOut || (
                          !checkoutOptions.buyNow && 
                          !checkoutOptions.paymentMethod && 
                          !checkoutOptions.placeOrder
                        )}
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
                        <li>Choose your preferred payment method</li>
                        <li>Click "Start Checkout" to queue the actions</li>
                        <li>Navigate to Amazon and the actions will execute automatically</li>
                        <li>Monitor the progress in the browser console</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

FloatingFrame.displayName = 'FloatingFrame';

export default FloatingFrame;