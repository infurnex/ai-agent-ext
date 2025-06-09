import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, Minimize2, Maximize2, MessageCircle, ShoppingCart, Send, Image, Star, ExternalLink, Eye, CreditCard, Package, CheckCircle, LogIn, User, Upload, FileImage, Trash2 } from 'lucide-react';
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
  imageUrl?: string;
  imageName?: string;
}

interface User {
  id: string;
  email: string;
}

interface ImageUpload {
  file: File;
  preview: string;
  uploading: boolean;
}

// Initialize Supabase client with fallback values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hmwchcxvaweffijzstls.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtd2NoY3h2YXdlZmZpanpzdGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NTg0ODAsImV4cCI6MjA2NTAzNDQ4MH0.LiC_-lMYV6erflw8bRqBystXhklMG8PpCOgthiFQ-Qk';

let supabase: any = null;

// Initialize Supabase with error handling
try {
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (error) {
  console.error('Failed to initialize Supabase:', error);
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
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [authError, setAuthError] = useState<string>('');
  
  // Image upload state
  const [imageUpload, setImageUpload] = useState<ImageUpload | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Checkout options state
  const [checkoutOptions, setCheckoutOptions] = useState({
    buyNow: false,
    paymentMethod: '',
    placeOrder: false
  });
  
  const frameRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Initialize component and check auth
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Set loading to false immediately if Supabase is not available
        if (!supabase) {
          console.warn('Supabase not available, running in offline mode');
          setIsLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || ''
          });
          // Load chat messages for authenticated user
          await loadChatMessages(session.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Don't let auth errors prevent the component from loading
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes only if Supabase is available
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || ''
          });
          setAuthError('');
          await loadChatMessages(session.user.id);
        } else {
          setUser(null);
          setMessages([]);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  // Load chat messages from Supabase
  const loadChatMessages = async (userId: string) => {
    if (!supabase) return;
    
    setIsLoadingMessages(true);
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

      const loadedMessages: ChatMessage[] = data.map(msg => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        hasProducts: msg.has_products,
        products: msg.products_data,
        imageUrl: msg.image_url,
        imageName: msg.image_name
      }));

      setMessages(loadedMessages);

      // Add welcome message if no messages exist
      if (loadedMessages.length === 0) {
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          type: 'assistant',
          content: `Welcome back! I'm your AI shopping assistant. I can help you find products, compare prices, and assist with your shopping needs. How can I help you today?`,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
        await saveMessageToSupabase(welcomeMessage, userId);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Save message to Supabase
  const saveMessageToSupabase = async (message: ChatMessage, userId: string) => {
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          id: message.id,
          user_id: userId,
          type: message.type,
          content: message.content,
          has_products: message.hasProducts || false,
          products_data: message.products || null,
          image_url: message.imageUrl || null,
          image_name: message.imageName || null
        });

      if (error) {
        console.error('Error saving message:', error);
      }
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  // Upload image to Supabase Storage
  const uploadImageToSupabase = async (file: File): Promise<string | null> => {
    if (!supabase) return null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `chat-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Failed to upload image:', error);
      return null;
    }
  };

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
    if (!supabase) {
      setAuthError('Authentication service not available');
      return;
    }

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
        setUser({
          id: data.user.id,
          email: data.user.email || ''
        });
        setLoginForm({ email: '', password: '' });
        await loadChatMessages(data.user.id);
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
    if (!supabase) return;
    
    try {
      await supabase.auth.signOut();
      setUser(null);
      setMessages([]);
      setLoginForm({ email: '', password: '' });
      setImageUpload(null);
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
    if (!inputMessage.trim() && !imageUpload) return;
    if (!user) return;

    let imageUrl: string | null = null;
    let imageName: string | null = null;

    // Upload image if present
    if (imageUpload) {
      setImageUpload(prev => prev ? { ...prev, uploading: true } : null);
      imageUrl = await uploadImageToSupabase(imageUpload.file);
      imageName = imageUpload.file.name;
      
      if (!imageUrl) {
        alert('Failed to upload image. Please try again.');
        setImageUpload(prev => prev ? { ...prev, uploading: false } : null);
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim() || (imageUpload ? `[Image: ${imageUpload.file.name}]` : ''),
      timestamp: new Date(),
      imageUrl,
      imageName
    };

    setMessages(prev => [...prev, userMessage]);
    await saveMessageToSupabase(userMessage, user.id);
    
    setInputMessage('');
    setImageUpload(null);
    setIsTyping(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(async () => {
      const mockResponse = {
        response: imageUrl 
          ? "I can see the image you've shared! Based on what I can observe, I can help you find similar products or provide recommendations. What specific information are you looking for?"
          : "I found some great laptops for you! Here are my top recommendations based on your requirements.",
        hasProducts: !imageUrl,
        products: !imageUrl ? {
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
        } : undefined
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
      await saveMessageToSupabase(assistantMessage, user.id);
      setIsTyping(false);
    }, 2000);
  }, [inputMessage, imageUpload, user]);

  // Handle image upload
  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setImageUpload({
          file,
          preview: e.target?.result as string,
          uploading: false
        });
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please select a valid image file');
    }
    
    // Reset input
    event.target.value = '';
  }, []);

  // Handle drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      if (imageFile.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setImageUpload({
          file: imageFile,
          preview: event.target?.result as string,
          uploading: false
        });
      };
      reader.readAsDataURL(imageFile);
    }
  }, []);

  // Remove image upload
  const removeImageUpload = useCallback(() => {
    setImageUpload(null);
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

  // Show loading spinner only briefly during initialization
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
                  <div 
                    className={`chat-container ${isDragOver ? 'drag-over' : ''}`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {/* Drag Overlay */}
                    {isDragOver && (
                      <div className="drag-overlay">
                        <div className="drag-content">
                          <Upload size={48} />
                          <p>Drop image here to upload</p>
                        </div>
                      </div>
                    )}

                    {/* Chat Messages */}
                    <div className="chat-messages" ref={chatContainerRef}>
                      {isLoadingMessages && (
                        <div className="loading-messages">
                          <div className="loading-spinner"></div>
                          <span>Loading messages...</span>
                        </div>
                      )}

                      {messages.map((message) => (
                        <div key={message.id} className={`message ${message.type}`}>
                          <div className="message-content">
                            {message.content}
                          </div>
                          
                          {/* Image Display */}
                          {message.imageUrl && (
                            <div className="message-image">
                              <img src={message.imageUrl} alt={message.imageName || 'Uploaded image'} />
                              <div className="image-info">
                                <FileImage size={14} />
                                <span>{message.imageName}</span>
                              </div>
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

                    {/* Image Upload Preview */}
                    {imageUpload && (
                      <div className="image-upload-preview">
                        <div className="image-preview-container">
                          <img src={imageUpload.preview} alt="Upload preview" />
                          <div className="image-preview-overlay">
                            <div className="image-info">
                              <FileImage size={16} />
                              <span>{imageUpload.file.name}</span>
                              <span className="file-size">
                                ({(imageUpload.file.size / 1024 / 1024).toFixed(1)} MB)
                              </span>
                            </div>
                            {imageUpload.uploading && (
                              <div className="upload-progress">
                                <div className="upload-spinner"></div>
                                <span>Uploading...</span>
                              </div>
                            )}
                          </div>
                          <button
                            className="remove-image-button"
                            onClick={removeImageUpload}
                            disabled={imageUpload.uploading}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}

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
                        disabled={!!imageUpload}
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
                        disabled={isTyping || (imageUpload?.uploading)}
                      />
                      <button
                        className="send-button"
                        onClick={handleSendMessage}
                        disabled={(!inputMessage.trim() && !imageUpload) || isTyping || (imageUpload?.uploading)}
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