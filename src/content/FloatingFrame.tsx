import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, Minimize2, Maximize2, Move } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface FloatingFrameProps {
  onClose?: () => void;
}

const FloatingFrame: React.FC<FloatingFrameProps> = memo(({ onClose }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage
  useEffect(() => {
    try {
      const savedPosition = localStorage.getItem('floating-frame-position');
      if (savedPosition) {
        const parsed = JSON.parse(savedPosition);
        setPosition(parsed);
      }
    } catch (error) {
      console.error('Failed to load saved position:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save position to localStorage with debouncing
  const savePosition = useCallback(
    debounce((pos: Position) => {
      try {
        localStorage.setItem('floating-frame-position', JSON.stringify(pos));
      } catch (error) {
        console.error('Failed to save position:', error);
      }
    }, 300),
    []
  );

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!frameRef.current) return;
    
    const rect = frameRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  }, []);

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const newPosition = {
      x: Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragOffset.x)),
      y: Math.max(0, Math.min(window.innerHeight - (isExpanded ? 400 : 60), e.clientY - dragOffset.y))
    };

    setPosition(newPosition);
    savePosition(newPosition);
  }, [isDragging, dragOffset, isExpanded, savePosition]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Set up drag event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Handle resize observer for responsive behavior
  useEffect(() => {
    if (!frameRef.current) return;

    const resizeObserver = new ResizeObserver(
      debounce(() => {
        if (!frameRef.current) return;
        
        const rect = frameRef.current.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        
        if (position.x > maxX || position.y > maxY) {
          const newPosition = {
            x: Math.min(position.x, maxX),
            y: Math.min(position.y, maxY)
          };
          setPosition(newPosition);
          savePosition(newPosition);
        }
      }, 100)
    );

    resizeObserver.observe(frameRef.current);
    window.addEventListener('resize', () => resizeObserver.disconnect());

    return () => {
      resizeObserver.disconnect();
    };
  }, [position, savePosition]);

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
      className={`floating-frame ${isExpanded ? 'expanded' : 'collapsed'} ${isDragging ? 'dragging' : ''}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      {/* Header */}
      <div
        ref={dragHandleRef}
        className="floating-frame-header"
        onMouseDown={handleDragStart}
      >
        <div className="header-content">
          <Move className="drag-icon" size={16} />
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
              <li>Draggable with position memory</li>
              <li>Expand/collapse functionality</li>
              <li>Shadow DOM isolation</li>
              <li>Responsive design</li>
              <li>Material Design aesthetics</li>
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

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

FloatingFrame.displayName = 'FloatingFrame';

export default FloatingFrame;