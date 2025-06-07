import { FloatingFrameManager } from "./FrameManager";



// Initialize the floating frame manager
if (typeof window !== 'undefined') {
  // Ensure we only inject once per page
  if (!window.floatingFrameManager) {
    window.floatingFrameManager = new FloatingFrameManager();
  }
}

// Make it available globally for debugging
declare global {
  interface Window {
    floatingFrameManager: FloatingFrameManager;
  }
}