import { Mixpanel } from "mixpanel-react-native";

// Custom analytics utility to guard against missing native modules
let analytics: any = null;
const mixpanel = new Mixpanel("0224f6903ab5d177501450a30c6d819a", true);

let isInitialized = false;
let initPromise: Promise<void> | null = null;

try {
  analytics = require('@react-native-firebase/analytics').default;
} catch (e) {
  console.warn('[Analytics] Firebase Analytics native module not found.');
}

/**
 * Initialize Mixpanel and other services
 */
export const init = async () => {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      console.log('[Analytics] Initializing Mixpanel...');
      await mixpanel.init();
      isInitialized = true;
      console.log('[Analytics] Initialized successfully.');
    } catch (error) {
      console.error('[Analytics] Initialization failed:', error);
      // Still set to true to allow queued calls to proceed (they might fail but won't hang)
      isInitialized = true;
    }
  })();
  
  return initPromise;
};

/**
 * Ensures analytics is initialized before proceeding
 */
const ensureInitialized = async () => {
  if (!isInitialized) {
    console.log('[Analytics] Call made before init, waiting...');
    await init();
  }
};

/**
 * Log a custom event
 */
export const logCustomEvent = async (eventName: string, params?: { [key: string]: any }) => {
  try {
    await ensureInitialized();
    console.log(`[Analytics] Logging event: ${eventName}`, params);
    
    if (analytics) {
      await analytics().logEvent(eventName, params);
    }
    mixpanel.track(eventName, params);
  } catch (error) {
    console.error(`[Analytics] Error logging event ${eventName}:`, error);
  }
};

/**
 * Log a screen view
 */
export const logScreenView = async (screenName: string, screenClass?: string) => {
  try {
    await ensureInitialized();
    console.log(`[Analytics] Logging screen: ${screenName}`);
    
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
    console.error(`[Analytics] Error logging screen view ${screenName}:`, error);
  }
};

/**
 * Set user properties
 */
export const setUserProperties = async (properties: { [key: string]: any }) => {
  try {
    await ensureInitialized();
    console.log('[Analytics] Setting user properties:', Object.keys(properties));
    
    if (analytics) {
      await analytics().setUserProperties(properties);
    }
    Object.keys(properties).forEach(key => {
      mixpanel.getPeople().set(key, properties[key]);
    });
  } catch (error) {
    console.error('[Analytics] Error setting user properties:', error);
  }
};

/**
 * Set the user ID
 */
export const setUserId = async (userId: string | null) => {
  try {
    await ensureInitialized();
    console.log(`[Analytics] Setting user ID: ${userId ? 'PRESENT' : 'NULL'}`);
    
    if (analytics) {
      await analytics().setUserId(userId);
    }
    
    if (userId) {
      mixpanel.identify(userId);
    } else {
      mixpanel.reset();
    }
    console.log('[Analytics] User ID set successfully.');
  } catch (error) {
    console.error('[Analytics] Error setting user ID:', error);
  }
};

/**
 * Log revenue
 */
export const logRevenue = async (amount: number, currency: string = 'USD') => {
  try {
    await ensureInitialized();
    console.log(`[Analytics] Logging revenue: ${amount} ${currency}`);
    
    mixpanel.getPeople().trackCharge(amount, { '$currency': currency });
    await logCustomEvent('purchase_complete', { 
      amount, 
      currency,
      value: amount 
    });
  } catch (error) {
    console.error('[Analytics] Error logging revenue:', error);
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
