import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, Minimize2, Maximize2, MessageCircle, ShoppingCart, Send, Image, Star, ExternalLink, Eye, CreditCard, Package, CheckCircle, LogIn, User, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface FloatingFrameProps {
  onClose?: () => void;
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
  imageUrl?: string;
  imageName?: string;
}

interface User {
  id: string;
  email: string;
}

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hmwchcxvaweffijzstls.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtd2NoY3h2YXdlZmZpanpzdGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NTg0ODAsImV4cCI6MjA2NTAzNDQ4MH0.LiC_-lMYV6erflw8bRqBystXhklMG8PpCOgthiFQ-Qk';
const supabase = createClient(supabaseUrl, supabaseKey);

const FloatingFrame: React.FC<FloatingFrameProps> = memo(({ onClose }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'checkout'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  
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

  // Check if we're on Amazon
  const isAmazonWebsite = useCallback(() => {
    return window.location.hostname.includes('amazon');
  }, []);

  // Save message to Supabase
  const saveMessageToSupabase = useCallback(async (message: ChatMessage, userId: string) => {
    try {
      const messageData = {
        user_id: userId,
        type: message.type,
        content: message.content,
        has_products: message.hasProducts || false,
        products_data: message.products || null,
        image_url: message.imageUrl || null,
        image_name: message.imageName || null
      };

      const { error } = await supabase
        .from('chat_messages')
        .insert(messageData);

      if (error) {
        console.error('Error saving message to Supabase:', error);
      }
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }, []);

  // Load chat messages from Supabase
  const loadChatMessages = useCallback(async (userId: string) => {
    if (!userId) return;

    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading chat messages:', error);
        return;
      }

      if (data && data.length > 0) {
        const loadedMessages: ChatMessage[] = data.map(msg => ({
          id: msg.id,
          type: msg.type as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          hasProducts: msg.has_products || false,
          products: msg.products_data || undefined,
          imageUrl: msg.image_url || undefined,
          imageName: msg.image_name || undefined
        }));

        setMessages(loadedMessages);
      } else {
        // No existing messages, add welcome message
        const welcomeMessage: ChatMessage = {
          id: 'welcome-' + Date.now(),
          type: 'assistant',
          content: `Welcome back! I'm your AI shopping assistant. I can help you find products, compare prices, and assist with your shopping needs. How can I help you today?`,
          timestamp: new Date()
        };
        
        setMessages([welcomeMessage]);
        
        // Save welcome message to database
        await saveMessageToSupabase(welcomeMessage, userId);
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [saveMessageToSupabase]);

  // Send message to AI agent
  const sendToAIAgent = useCallback(async (message: string, image: File | null, userId: string) => {
    try {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('userId', userId);
      
      if (image) {
        formData.append('image', image);
        formData.append("imageAttached", "true");
      }else{
        formData.append("imageAttached", "false");
      }

      const response = await fetch('http://localhost:5678/webhook/agent', {
        method: 'POST',
        body: formData
      });

      console.log(response)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending to AI agent:', error);
      throw error;
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
      } else {
        setUser(null);
        setMessages([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load chat messages when user is authenticated
  useEffect(() => {
    if (user?.id) {
      loadChatMessages(user.id);
    }
  }, [user?.id, loadChatMessages]);

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
        // Chat messages will be loaded by the useEffect hook
      }
    } catch (error) {
      setAuthError('Login failed. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsAuthenticating(false);
    }
  }, [loginForm]);

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
    // Check if we're on Amazon
    if (!isAmazonWebsite()) {
      alert('⚠️ Amazon Required\n\nQuick checkout actions only work on Amazon websites. Please navigate to Amazon first, then try again.');
      return;
    }

    const selectedActions: any[] = [];
    
    if (checkoutOptions.buyNow) {
      selectedActions.push({
        action: "buy now",
        tag: "input",
        attributes: { "id": "buy-now-button", "type": "submit" }
      });
    }
    
    if (checkoutOptions.paymentMethod === 'cash_on_delivery') {
      selectedActions.push(
        {
          action: "selecting cod option",
          tag: "input",
          attributes: { "id": "pp-kiqJYZ-300", "type": "radio" }
        },
        {
          action: "confirming payment option",
          tag: "input",
          attributes: { "type": "submit", "aria-labelledby": "checkout-primary-continue-button-id-announce" }
        }
      );
    }
    
    if (checkoutOptions.placeOrder) {
      selectedActions.push({
        action: "placing order",
        tag: "input",
        attributes: { "type": "submit", "id": "placeOrder" }
      });
    }

    if (selectedActions.length === 0) {
      alert('Please select at least one action to automate.');
      return;
    }

    // Show confirmation dialog
    const actionList = selectedActions.map(action => action.action).join(', ');
    
    const confirmCheckout = confirm(
      `🛒 Quick Checkout Automation\n\n` +
      `Selected actions: ${actionList}\n\n` +
      `These actions will be executed automatically on Amazon pages.\n\n` +
      `Are you sure you want to proceed?`
    );

    if (!confirmCheckout) {
      return;
    }

    setIsCheckingOut(true);

    try {
      // Send actions to background script
      let successCount = 0;
      
      for (const action of selectedActions) {
        try {
          await new Promise<void>((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'APPEND_ACTION',
              action: action
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }
              
              if (response?.success) {
                console.log(`Action ${action.action} added to queue successfully`);
                successCount++;
                resolve();
              } else {
                console.error(`Failed to add action ${action.action}:`, response?.error);
                reject(new Error(response?.error || 'Unknown error'));
              }
            });
          });
        } catch (error) {
          console.error(`Failed to queue action ${action.action}:`, error);
        }
      }

      if (successCount > 0) {
        alert(
          `✅ Success!\n\n` +
          `${successCount} action(s) have been queued for automation:\n` +
          `${selectedActions.slice(0, successCount).map(action => action.action).join(', ')}\n\n` +
          `Actions will execute automatically when you navigate to the appropriate Amazon pages.\n\n` +
          `Watch for notifications in the top-right corner of the page.`
        );
        
        // Reset options after successful checkout
        setCheckoutOptions({
          buyNow: false,
          paymentMethod: '',
          placeOrder: false
        });
      } else {
        alert('❌ Failed to queue any actions. Please try again.');
      }

    } catch (error) {
      console.error('Checkout failed:', error);
      alert('❌ Failed to queue actions. Please check the console for details and try again.');
    } finally {
      setIsCheckingOut(false);
    }
  }, [checkoutOptions, isAmazonWebsite]);

  // Handle send message
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !user) return;

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
      imageUrl: uploadedImage ? URL.createObjectURL(uploadedImage) : undefined,
      imageName: uploadedImage?.name
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    const currentImage = uploadedImage;
    setInputMessage('');
    setUploadedImage(null);
    setIsTyping(true);

    // Save user message to Supabase
    await saveMessageToSupabase(userMessage, user.id);

    try {
      // Send to AI agent
      const aiResponse = await sendToAIAgent(currentMessage, currentImage, user.id);
      
      const assistantMessage: ChatMessage = {
        id: 'assistant-' + Date.now(),
        type: 'assistant',
        content: aiResponse.response || aiResponse.message || 'I received your message and am processing it.',
        timestamp: new Date(),
        hasProducts: aiResponse.hasProducts || false,
        products: aiResponse.products || undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Save assistant message to Supabase
      await saveMessageToSupabase(assistantMessage, user.id);
      
    } catch (error) {
      console.error('AI agent request failed:', error);
      
      // Fallback response
      const errorMessage: ChatMessage = {
        id: 'assistant-' + Date.now(),
        type: 'assistant',
        content: 'I apologize, but I\'m having trouble connecting to my AI service right now. Please try again in a moment.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      await saveMessageToSupabase(errorMessage, user.id);
    } finally {
      setIsTyping(false);
    }
  }, [inputMessage, uploadedImage, user, saveMessageToSupabase, sendToAIAgent]);

  // Handle image upload
  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedImage(file);
    }
  }, []);

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
                      {isLoadingMessages ? (
                        <div className="loading-messages">
                          <div className="loading-spinner"></div>
                          <span>Loading your chat history...</span>
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div key={message.id} className={`message ${message.type}`}>
                            <div className="message-content">
                              {message.content}
                            </div>
                            
                            {/* Image Display */}
                            {message.imageUrl && (
                              <div className="message-image">
                                <img src={message.imageUrl} alt={message.imageName || 'Uploaded image'} />
                                {message.imageName && (
                                  <div className="image-name">{message.imageName}</div>
                                )}
                              </div>
                            )}
                            
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
                        ))
                      )}
                      
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
                        className={`image-upload-button ${uploadedImage ? 'has-image' : ''}`}
                        onClick={handleImageUpload}
                        title={uploadedImage ? `Image selected: ${uploadedImage.name}` : 'Upload image'}
                      >
                        <Image size={18} />
                      </button>
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={uploadedImage ? `Image selected: ${uploadedImage.name}` : "Ask me anything about products..."}
                        className="chat-input"
                        disabled={isTyping || isLoadingMessages}
                      />
                      <button
                        className="send-button"
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isTyping || isLoadingMessages}
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
                      Select which steps you want to automate during checkout on Amazon
                    </div>
                    
                    {/* Amazon Warning */}
                    {!isAmazonWebsite() && (
                      <div className="amazon-warning">
                        <div className="warning-icon">
                          <AlertCircle size={20} />
                        </div>
                        <div className="warning-content">
                          <div className="warning-title">Amazon Required</div>
                          <div className="warning-text">
                            Quick checkout actions only work on Amazon websites. Navigate to Amazon first to use this feature.
                          </div>
                        </div>
                      </div>
                    )}
                    
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
                          disabled={!isAmazonWebsite()}
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
                            disabled={!isAmazonWebsite()}
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
                          disabled={!isAmazonWebsite()}
                        />
                      </div>
                    </div>

                    <div className="checkout-actions">
                      <button
                        className="checkout-button"
                        onClick={handleCheckout}
                        disabled={isCheckingOut || !isAmazonWebsite() || (
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
                        <li>Navigate to Amazon first (required)</li>
                        <li>Select the automation steps you want</li>
                        <li>Choose your preferred payment method</li>
                        <li>Click "Start Checkout" to queue the actions</li>
                        <li>Actions will execute automatically on Amazon pages</li>
                        <li>Watch for notifications showing action results</li>
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