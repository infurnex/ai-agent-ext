import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';

interface FloatingFrameProps {
  onClose?: () => void;
}

const FloatingFrame: React.FC<FloatingFrameProps> = memo(({ onClose }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const frameRef = useRef<HTMLDivElement>(null);

  // Initialize component
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Click away listener
  useEffect(() => {
    const handleClickAway = (e: MouseEvent) => {
      if (frameRef.current && !frameRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickAway);
      return () => document.removeEventListener('mousedown', handleClickAway);
    }
  }, [isExpanded]);

  // Toggle expand/collapse
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

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
          <span className="header-title">Floating Frame</span>
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
          <div className="content-section">
            <h3 className="section-title">Welcome to Floating Frame</h3>
            <p className="section-description">
              This is a production-ready floating frame built with React and modern web technologies.
            </p>
          </div>
          
          <div className="content-section">
            <h4 className="subsection-title">Features</h4>
            <ul className="feature-list">
              <li>Expand/collapse functionality</li>
              <li>Shadow DOM isolation</li>
              <li>Responsive design</li>
              <li>Material Design aesthetics</li>
              <li>Static positioning</li>
            </ul>
          </div>

          <div className="content-section">
            <div className="action-buttons">
              <button className="primary-button">
                Primary Action
              </button>
              <button className="secondary-button">
                Secondary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

FloatingFrame.displayName = 'FloatingFrame';

export default FloatingFrame;