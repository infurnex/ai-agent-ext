import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { authHelpers, type AuthState } from '../lib/supabase';

const PopupApp: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });
  
  const [formMode, setFormMode] = useState<'signin' | 'signup'>('signin');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Initialize auth state
  useEffect(() => {
    checkAuthState();
    
    // Listen for auth changes
    const { data: { subscription } } = authHelpers.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setAuthState({
          user: {
            id: session.user.id,
            email: session.user.email || '',
            created_at: session.user.created_at || ''
          },
          loading: false,
          error: null
        });
        setMessage({ type: 'success', text: 'Successfully signed in!' });
        
        // Store auth state in chrome storage for content scripts
        chrome.storage.local.set({ 
          isAuthenticated: true,
          user: {
            id: session.user.id,
            email: session.user.email
          }
        });
      } else if (event === 'SIGNED_OUT') {
        setAuthState({
          user: null,
          loading: false,
          error: null
        });
        
        // Clear auth state from chrome storage
        chrome.storage.local.set({ 
          isAuthenticated: false,
          user: null
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuthState = async () => {
    try {
      const { user, error } = await authHelpers.getCurrentUser();
      
      if (error) {
        setAuthState({
          user: null,
          loading: false,
          error: error.message
        });
        return;
      }

      if (user) {
        setAuthState({
          user: {
            id: user.id,
            email: user.email || '',
            created_at: user.created_at || ''
          },
          loading: false,
          error: null
        });
        
        // Store auth state in chrome storage
        chrome.storage.local.set({ 
          isAuthenticated: true,
          user: {
            id: user.id,
            email: user.email
          }
        });
      } else {
        setAuthState({
          user: null,
          loading: false,
          error: null
        });
        
        // Clear auth state from chrome storage
        chrome.storage.local.set({ 
          isAuthenticated: false,
          user: null
        });
      }
    } catch (error) {
      setAuthState({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (formMode === 'signin') {
        const { data, error } = await authHelpers.signIn(formData.email, formData.password);
        
        if (error) {
          setMessage({ type: 'error', text: error.message });
        } else if (data.user) {
          setMessage({ type: 'success', text: 'Successfully signed in!' });
          setFormData({ email: '', password: '' });
        }
      } else {
        const { data, error } = await authHelpers.signUp(formData.email, formData.password);
        
        if (error) {
          setMessage({ type: 'error', text: error.message });
        } else if (data.user) {
          setMessage({ 
            type: 'success', 
            text: 'Account created successfully! You are now signed in.' 
          });
          setFormData({ email: '', password: '' });
        }
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'An unexpected error occurred' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await authHelpers.signOut();
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Successfully signed out!' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to sign out' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: 'email' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  if (authState.loading) {
    return (
      <div className="popup-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (authState.user) {
    return (
      <div className="popup-container">
        <div className="header">
          <div className="header-icon">
            <User size={24} />
          </div>
          <div>
            <h1 className="title">AI Shopping Assistant</h1>
            <p className="subtitle">Welcome back!</p>
          </div>
        </div>

        <div className="user-info">
          <div className="user-avatar">
            <User size={20} />
          </div>
          <div className="user-details">
            <p className="user-email">{authState.user.email}</p>
            <p className="user-status">Authenticated</p>
          </div>
          <div className="status-indicator">
            <CheckCircle size={16} color="#10b981" />
          </div>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.type === 'success' ? (
              <CheckCircle size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="features">
          <h3 className="features-title">Extension Features</h3>
          <ul className="features-list">
            <li>AI-powered product recommendations</li>
            <li>Automated checkout assistance</li>
            <li>Smart price comparison</li>
            <li>Quick product search</li>
            <li>Cash on delivery automation</li>
          </ul>
        </div>

        <div className="instructions">
          <h3 className="instructions-title">How to use:</h3>
          <p className="instructions-text">
            Navigate to any shopping website and look for the AI Assistant floating frame. 
            You can chat with the AI, get product recommendations, and automate your checkout process.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          disabled={isSubmitting}
          className="sign-out-button"
        >
          {isSubmitting ? (
            <div className="button-spinner"></div>
          ) : (
            <LogOut size={16} />
          )}
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <div className="header">
        <div className="header-icon">
          <User size={24} />
        </div>
        <div>
          <h1 className="title">AI Shopping Assistant</h1>
          <p className="subtitle">Sign in to get started</p>
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            <Mail size={16} />
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            placeholder="Enter your email"
            className="form-input"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            <Lock size={16} />
            Password
          </label>
          <div className="password-input-container">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              placeholder="Enter your password"
              className="form-input"
              required
              disabled={isSubmitting}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle"
              disabled={isSubmitting}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !formData.email || !formData.password}
          className="submit-button"
        >
          {isSubmitting ? (
            <div className="button-spinner"></div>
          ) : formMode === 'signin' ? (
            <LogIn size={16} />
          ) : (
            <UserPlus size={16} />
          )}
          {formMode === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      <div className="form-switch">
        <p>
          {formMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
          <button
            type="button"
            onClick={() => {
              setFormMode(formMode === 'signin' ? 'signup' : 'signin');
              setMessage(null);
              setFormData({ email: '', password: '' });
            }}
            className="switch-button"
            disabled={isSubmitting}
          >
            {formMode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>

      <div className="info">
        <p className="info-text">
          Create an account to access AI-powered shopping assistance, automated checkout, 
          and personalized product recommendations.
        </p>
      </div>
    </div>
  );
};

export default PopupApp;