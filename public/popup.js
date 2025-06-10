// Simple popup script without toggle functionality
document.addEventListener('DOMContentLoaded', () => {
  console.log('AI Shopping Assistant popup loaded');
  
  // Add smooth animations to feature items
  const featureItems = document.querySelectorAll('.feature-item');
  
  featureItems.forEach((item, index) => {
    // Stagger the animation
    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(20px)';
      item.style.transition = 'all 0.3s ease';
      
      // Animate in
      setTimeout(() => {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      }, 50);
    }, index * 100);
  });
  
  // Add click handlers for footer links
  const footerLinks = document.querySelectorAll('.footer-link');
  
  footerLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const linkText = link.textContent;
      
      switch(linkText) {
        case 'Help':
          // Could open help documentation
          console.log('Help clicked');
          break;
        case 'Privacy':
          // Could open privacy policy
          console.log('Privacy clicked');
          break;
        case 'About':
          // Could show about information
          console.log('About clicked');
          break;
      }
    });
  });
  
  // Add subtle hover effects
  const statusIndicator = document.querySelector('.status-indicator');
  
  statusIndicator.addEventListener('mouseenter', () => {
    statusIndicator.style.transform = 'scale(1.05)';
    statusIndicator.style.transition = 'transform 0.2s ease';
  });
  
  statusIndicator.addEventListener('mouseleave', () => {
    statusIndicator.style.transform = 'scale(1)';
  });
});

// Add some interactive feedback
function addInteractiveEffects() {
  const style = document.createElement('style');
  style.textContent = `
    .feature-item {
      cursor: pointer;
    }
    
    .feature-item:active {
      transform: translateX(2px) scale(0.98);
    }
    
    .logo {
      transition: transform 0.3s ease;
    }
    
    .logo:hover {
      transform: rotate(10deg) scale(1.1);
    }
    
    .status-indicator {
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

// Initialize interactive effects
addInteractiveEffects();