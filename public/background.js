// Background script for Chrome Extension with Action Queue Management

class ActionQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.maxQueueSize = 100;
  }

  /**
   * Add a list of actions to the queue
   * @param {Array} actions - Array of action objects
   * @returns {Object} Result object with success status and details
   */
  addActionsToQueue(actions) {
    try {
      // Validate input
      if (!Array.isArray(actions)) {
        return {
          success: false,
          message: 'Actions must be provided as an array',
          queueSize: this.queue.length
        };
      }

      if (actions.length === 0) {
        return {
          success: false,
          message: 'No actions provided to add to queue',
          queueSize: this.queue.length
        };
      }

      // Check if adding these actions would exceed max queue size
      if (this.queue.length + actions.length > this.maxQueueSize) {
        return {
          success: false,
          message: `Adding ${actions.length} actions would exceed maximum queue size of ${this.maxQueueSize}`,
          queueSize: this.queue.length,
          maxQueueSize: this.maxQueueSize
        };
      }

      // Validate each action object
      const validatedActions = [];
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        
        // Basic validation for action structure
        if (!action || typeof action !== 'object') {
          return {
            success: false,
            message: `Invalid action at index ${i}: Action must be an object`,
            queueSize: this.queue.length
          };
        }

        // Ensure action has required properties
        const validatedAction = {
          id: action.id || `action_${Date.now()}_${i}`,
          type: action.type || 'unknown',
          payload: action.payload || {},
          priority: action.priority || 0,
          timestamp: Date.now(),
          status: 'pending',
          retryCount: 0,
          maxRetries: action.maxRetries || 3,
          ...action
        };

        validatedActions.push(validatedAction);
      }

      // Add actions to queue
      this.queue.push(...validatedActions);

      // Sort queue by priority (higher priority first)
      this.queue.sort((a, b) => b.priority - a.priority);

      console.log(`Added ${validatedActions.length} actions to queue. Queue size: ${this.queue.length}`);

      return {
        success: true,
        message: `Successfully added ${validatedActions.length} actions to queue`,
        actionsAdded: validatedActions.length,
        queueSize: this.queue.length,
        addedActions: validatedActions.map(action => ({
          id: action.id,
          type: action.type,
          priority: action.priority
        }))
      };

    } catch (error) {
      console.error('Error adding actions to queue:', error);
      return {
        success: false,
        message: `Failed to add actions to queue: ${error.message}`,
        queueSize: this.queue.length
      };
    }
  }

  /**
   * Remove and return the first available task from the queue
   * @returns {Object} Result object with the removed task or null if queue is empty
   */
  removeFirstAvailableTask() {
    try {
      // Check if queue is empty
      if (this.queue.length === 0) {
        return {
          success: false,
          message: 'Queue is empty',
          task: null,
          queueSize: 0
        };
      }

      // Find the first available task (status: 'pending')
      let taskIndex = -1;
      for (let i = 0; i < this.queue.length; i++) {
        if (this.queue[i].status === 'pending') {
          taskIndex = i;
          break;
        }
      }

      // If no pending tasks found, try to find failed tasks that can be retried
      if (taskIndex === -1) {
        for (let i = 0; i < this.queue.length; i++) {
          const task = this.queue[i];
          if (task.status === 'failed' && task.retryCount < task.maxRetries) {
            taskIndex = i;
            break;
          }
        }
      }

      // If still no task found, return empty result
      if (taskIndex === -1) {
        return {
          success: false,
          message: 'No available tasks in queue (all tasks are either processing, completed, or exceeded retry limit)',
          task: null,
          queueSize: this.queue.length,
          queueStatus: this.getQueueStatus()
        };
      }

      // Remove the task from queue
      const task = this.queue.splice(taskIndex, 1)[0];

      // Update task status
      task.status = 'processing';
      task.startTime = Date.now();
      
      // If this is a retry, increment retry count
      if (task.retryCount > 0) {
        task.retryCount++;
      }

      console.log(`Removed task from queue: ${task.id} (${task.type}). Remaining queue size: ${this.queue.length}`);

      return {
        success: true,
        message: `Successfully removed task from queue`,
        task: task,
        queueSize: this.queue.length,
        taskInfo: {
          id: task.id,
          type: task.type,
          priority: task.priority,
          retryCount: task.retryCount,
          maxRetries: task.maxRetries
        }
      };

    } catch (error) {
      console.error('Error removing task from queue:', error);
      return {
        success: false,
        message: `Failed to remove task from queue: ${error.message}`,
        task: null,
        queueSize: this.queue.length
      };
    }
  }

  /**
   * Get current queue status
   * @returns {Object} Queue status information
   */
  getQueueStatus() {
    const statusCounts = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    this.queue.forEach(task => {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
    });

    return {
      totalTasks: this.queue.length,
      statusCounts: statusCounts,
      isProcessing: this.isProcessing,
      maxQueueSize: this.maxQueueSize
    };
  }

  /**
   * Clear all tasks from queue
   * @returns {Object} Result object
   */
  clearQueue() {
    const clearedCount = this.queue.length;
    this.queue = [];
    this.isProcessing = false;

    return {
      success: true,
      message: `Cleared ${clearedCount} tasks from queue`,
      clearedCount: clearedCount
    };
  }

  /**
   * Get queue size
   * @returns {number} Current queue size
   */
  getQueueSize() {
    return this.queue.length;
  }

  /**
   * Mark a task as completed (for external tracking)
   * @param {string} taskId - ID of the completed task
   * @returns {Object} Result object
   */
  markTaskCompleted(taskId) {
    // Note: Since we remove tasks from queue when processing,
    // this is mainly for logging/tracking purposes
    console.log(`Task marked as completed: ${taskId}`);
    return {
      success: true,
      message: `Task ${taskId} marked as completed`,
      taskId: taskId
    };
  }

  /**
   * Mark a task as failed and potentially add back to queue for retry
   * @param {Object} task - The failed task object
   * @param {string} errorMessage - Error message
   * @returns {Object} Result object
   */
  markTaskFailed(task, errorMessage) {
    try {
      task.status = 'failed';
      task.errorMessage = errorMessage;
      task.failedAt = Date.now();
      task.retryCount = (task.retryCount || 0) + 1;

      // If task can be retried, add it back to queue
      if (task.retryCount < task.maxRetries) {
        task.status = 'pending';
        this.queue.unshift(task); // Add to front for priority retry
        
        console.log(`Task ${task.id} failed but will be retried. Retry count: ${task.retryCount}/${task.maxRetries}`);
        
        return {
          success: true,
          message: `Task ${task.id} failed but added back to queue for retry`,
          taskId: task.id,
          retryCount: task.retryCount,
          maxRetries: task.maxRetries,
          willRetry: true
        };
      } else {
        console.log(`Task ${task.id} failed and exceeded max retries. Not adding back to queue.`);
        
        return {
          success: false,
          message: `Task ${task.id} failed and exceeded maximum retry limit`,
          taskId: task.id,
          retryCount: task.retryCount,
          maxRetries: task.maxRetries,
          willRetry: false,
          errorMessage: errorMessage
        };
      }
    } catch (error) {
      console.error('Error marking task as failed:', error);
      return {
        success: false,
        message: `Failed to mark task as failed: ${error.message}`,
        taskId: task.id
      };
    }
  }
}

// Create global action queue instance
const actionQueue = new ActionQueue();

// Chrome extension background script event listeners
chrome.runtime.onInstalled.addListener(() => {
  console.log('Floating Frame Extension background script installed');
  console.log('Action queue initialized');
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    switch (request.action) {
      case 'addActionsToQueue':
        const addResult = actionQueue.addActionsToQueue(request.actions || []);
        sendResponse(addResult);
        break;

      case 'removeFirstAvailableTask':
        const removeResult = actionQueue.removeFirstAvailableTask();
        sendResponse(removeResult);
        break;

      case 'getQueueStatus':
        const status = actionQueue.getQueueStatus();
        sendResponse({
          success: true,
          status: status
        });
        break;

      case 'clearQueue':
        const clearResult = actionQueue.clearQueue();
        sendResponse(clearResult);
        break;

      case 'markTaskCompleted':
        const completedResult = actionQueue.markTaskCompleted(request.taskId);
        sendResponse(completedResult);
        break;

      case 'markTaskFailed':
        const failedResult = actionQueue.markTaskFailed(request.task, request.errorMessage);
        sendResponse(failedResult);
        break;

      default:
        sendResponse({
          success: false,
          message: `Unknown action: ${request.action}`
        });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({
      success: false,
      message: `Error handling message: ${error.message}`
    });
  }

  // Return true to indicate we will send a response asynchronously
  return true;
});

// Periodic queue maintenance (optional)
setInterval(() => {
  const status = actionQueue.getQueueStatus();
  if (status.totalTasks > 0) {
    console.log('Queue status:', status);
  }
}, 30000); // Log status every 30 seconds if queue has tasks

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ActionQueue, actionQueue };
}