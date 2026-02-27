import { Mixpanel } from "mixpanel-react-native";

// Custom analytics utility to guard against missing native modules (e.g., in Expo Go)
let analytics: any = null;
const mixpanel = new Mixpanel("0224f6903ab5d177501450a30c6d819a", true);

try {
  // Only try to import if we're not in a web environment and the module might exist
  analytics = require('@react-native-firebase/analytics').default;
} catch (e) {
  console.warn('Firebase Analytics native module not found. Analytics will be disabled.');
}

/**
 * Initialize Mixpanel
 */
export const init = async () => {
  try {
    await mixpanel.init();
  } catch (error) {
    console.error('Mixpanel initialization failed:', error);
  }
};

/**
 * Log a custom event to Firebase Analytics and Mixpanel
 * @param eventName Name of the event (e.g., 'button_click')
 * @param params Optional parameters to include with the event
 */
export const logCustomEvent = async (eventName: string, params?: { [key: string]: any }) => {
  try {
    if (analytics) {
      await analytics().logEvent(eventName, params);
    }
    mixpanel.track(eventName, params);
  } catch (error) {
    console.error('Error logging analytics event:', error);
  }
};

/**
 * Log a screen view event to Firebase Analytics and Mixpanel
 * @param screenName Name of the screen being viewed
 * @param screenClass Class of the screen (optional)
 */
export const logScreenView = async (screenName: string, screenClass?: string) => {
  try {
    if (analytics) {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    }
    mixpanel.track('screen_view', {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  } catch (error) {
    console.error('Error logging screen view:', error);
  }
};

/**
 * Set user properties for personalized analytics
 * @param properties Object containing user properties
 */
export const setUserProperties = async (properties: { [key: string]: any }) => {
  try {
    if (analytics) {
      await analytics().setUserProperties(properties);
    }
    Object.keys(properties).forEach(key => {
      mixpanel.getPeople().set(key, properties[key]);
    });
  } catch (error) {
    console.error('Error setting user properties:', error);
  }
};

/**
 * Set the user ID for the current session
 * @param userId Unique identifier for the user
 */
export const setUserId = async (userId: string | null) => {
  try {
    if (analytics) {
      await analytics().setUserId(userId);
    }
    if (userId) {
      mixpanel.identify(userId);
    } else {
      mixpanel.reset();
    }
  } catch (error) {
    console.error('Error setting user ID:', error);
  }
};

/**
 * Log revenue/transaction event to Mixpanel and Firebase
 * @param amount The transaction amount
 * @param currency The currency code (default: 'USD')
 */
export const logRevenue = async (amount: number, currency: string = 'USD') => {
  try {
    // Mixpanel specialized revenue tracking
    mixpanel.getPeople().trackCharge(amount, { '$currency': currency });
    
    // Standard event logging for both platforms
    await logCustomEvent('purchase_complete', { 
      amount, 
      currency,
      value: amount // Firebase style
    });
  } catch (error) {
    console.error('Error logging revenue:', error);
  }
};

export default {
  init,
  logCustomEvent,
  logScreenView,
  setUserProperties,
  setUserId,
  logRevenue,
};
