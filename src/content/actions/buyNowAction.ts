import { selectAndClickAction, SelectAndClickResult } from './selectAndClickAction';

export interface BuyNowResult {
  success: boolean;
  message: string;
  buttonFound?: boolean;
  buttonText?: string;
  selector?: string;
}

export async function buyNowAction(): Promise<BuyNowResult> {
  try {
    // Check if we're on Amazon
    const isAmazon = window.location.hostname.includes('amazon');
    
    if (!isAmazon) {
      return {
        success: false,
        message: 'This action is designed specifically for Amazon. Please navigate to an Amazon product page.',
        buttonFound: false
      };
    }

    // Use selectAndClickAction to find and click buy now button
    const result = await selectAndClickAction({
      tag: "input",
      attributes: { 
        "id": "buy-now-button", 
        "type": "submit" 
      }
    });

    return {
      success: result.success,
      message: result.success 
        ? `Successfully clicked "${result.elementText}" button. You should be redirected to the checkout process.`
        : result.message,
      buttonFound: result.elementFound,
      buttonText: result.elementText,
      selector: result.selector
    };

  } catch (error) {
    console.error('Buy now action failed:', error);
    return {
      success: false,
      message: `Buy now action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      buttonFound: false
    };
  }
}