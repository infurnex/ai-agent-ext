// Extension state management
let extensionEnabled = true;

// DOM elements
const statusIndicator = document.getElementById('statusIndicator');
const statusIcon = document.getElementById('statusIcon');
const statusText = document.getElementById('statusText');
const statusDescription = document.getElementById('statusDescription');
const toggleSwitch = document.getElementById('toggleSwitch');
const loadingOverlay = document.getElementById('loadingOverlay');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadExtensionState();
  updateUI();
});

// Load extension state from storage
async function loadExtensionState() {
  try {
    const result = await chrome.storage.local.get(['extensionEnabled']);
    extensionEnabled = result.extensionEnabled !== false; // Default to true
  } catch (error) {
    console.error('Failed to load extension state:', error);
    extensionEnabled = true; // Default fallback
  }
}

// Save extension state to storage
async function saveExtensionState() {
  try {
    await chrome.storage.local.set({ extensionEnabled });
  } catch (error) {
    console.error('Failed to save extension state:', error);
  }
}

// Update UI based on current state
function updateUI() {
  const indicator = statusIndicator;
  const icon = statusIcon;
  const text = statusText;
  const description = statusDescription;
  const toggle = toggleSwitch;

  if (extensionEnabled) {
    // Enabled state
    indicator.className = 'status-indicator enabled';
    icon.textContent = '✅';
    text.textContent = 'Extension Enabled';
    text.className = 'status-text enabled';
    description.textContent = 'AI shopping assistant is active and ready to help you on Amazon.';
    toggle.className = 'toggle-switch enabled';
  } else {
    // Disabled state
    indicator.className = 'status-indicator disabled';
    icon.textContent = '❌';
    text.textContent = 'Extension Disabled';
    text.className = 'status-text disabled';
    description.textContent = 'AI shopping assistant is currently disabled. Enable it to start using automation features.';
    toggle.className = 'toggle-switch';
  }
}

// Toggle extension state
async function toggleExtension() {
  // Show loading
  showLoading(true);
  
  try {
    // Toggle state
    extensionEnabled = !extensionEnabled;
    
    // Save to storage
    await saveExtensionState();
    
    // Notify content scripts about state change
    await notifyContentScripts();
    
    // Add delay for smooth UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update UI
    updateUI();
    
    // Show success feedback
    showSuccessFeedback();
    
  } catch (error) {
    console.error('Failed to toggle extension:', error);
    
    // Revert state on error
    extensionEnabled = !extensionEnabled;
    updateUI();
    
    // Show error feedback
    showErrorFeedback();
  } finally {
    // Hide loading
    showLoading(false);
  }
}

// Notify all content scripts about state change
async function notifyContentScripts() {
  try {
    // Get all tabs
    const tabs = await chrome.tabs.query({});
    
    // Send message to each tab
    const promises = tabs.map(tab => {
      if (tab.id) {
        return chrome.tabs.sendMessage(tab.id, {
          type: 'EXTENSION_STATE_CHANGED',
          enabled: extensionEnabled
        }).catch(() => {
          // Ignore errors for tabs that don't have content script
        });
      }
    });
    
    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Failed to notify content scripts:', error);
  }
}

// Show/hide loading overlay
function showLoading(show) {
  if (show) {
    loadingOverlay.style.display = 'block';
  } else {
    loadingOverlay.style.display = 'none';
  }
}

// Show success feedback
function showSuccessFeedback() {
  const originalText = statusDescription.textContent;
  statusDescription.textContent = extensionEnabled 
    ? '✅ Extension enabled successfully!' 
    : '✅ Extension disabled successfully!';
  statusDescription.style.color = '#059669';
  statusDescription.style.fontWeight = '600';
  
  setTimeout(() => {
    statusDescription.style.color = '';
    statusDescription.style.fontWeight = '';
    updateUI(); // Reset to normal state
  }, 2000);
}

// Show error feedback
function showErrorFeedback() {
  const originalText = statusDescription.textContent;
  statusDescription.textContent = '❌ Failed to update extension state. Please try again.';
  statusDescription.style.color = '#dc2626';
  statusDescription.style.fontWeight = '600';
  
  setTimeout(() => {
    statusDescription.style.color = '';
    statusDescription.style.fontWeight = '';
    updateUI(); // Reset to normal state
  }, 3000);
}

// Add keyboard support
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    if (event.target === toggleSwitch) {
      event.preventDefault();
      toggleExtension();
    }
  }
});

// Add accessibility attributes
toggleSwitch.setAttribute('role', 'switch');
toggleSwitch.setAttribute('aria-label', 'Toggle extension');
toggleSwitch.setAttribute('tabindex', '0');

// Update aria-checked attribute when state changes
function updateAccessibility() {
  toggleSwitch.setAttribute('aria-checked', extensionEnabled.toString());
}

// Call updateAccessibility when UI updates
const originalUpdateUI = updateUI;
updateUI = function() {
  originalUpdateUI();
  updateAccessibility();
};

// Handle storage changes from other instances
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.extensionEnabled) {
    extensionEnabled = changes.extensionEnabled.newValue;
    updateUI();
  }
});

// Add smooth transitions and animations
function addSmoothTransitions() {
  const style = document.createElement('style');
  style.textContent = `
    .status-indicator {
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .toggle-switch {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .toggle-switch::before {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .status-text {
      transition: color 0.3s ease;
    }
    
    .feature-item {
      transition: all 0.2s ease;
    }
    
    .feature-item:hover {
      transform: translateX(4px);
      background: rgba(37, 99, 235, 0.1);
    }
  `;
  document.head.appendChild(style);
}

// Initialize smooth transitions
addSmoothTransitions();

// Add ripple effect to toggle button
function addRippleEffect(event) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    transform: scale(0);
    animation: ripple 0.6s ease-out;
    pointer-events: none;
  `;
  
  button.style.position = 'relative';
  button.style.overflow = 'hidden';
  button.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

// Add ripple animation CSS
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  @keyframes ripple {
    to {
      transform: scale(2);
      opacity: 0;
    }
  }
`;
document.head.appendChild(rippleStyle);

// Add ripple effect to toggle button
toggleSwitch.addEventListener('click', addRippleEffect);