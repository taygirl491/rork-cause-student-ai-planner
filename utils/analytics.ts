import { Mixpanel } from "mixpanel-react-native";
import { InteractionManager } from "react-native";

// Custom analytics utility to guard against missing native modules
let analytics: any = null;
const mixpanel = new Mixpanel("0224f6903ab5d177501450a30c6d819a", false);

let isInitialized = false;
let initPromise: Promise<void> | null = null;

try {
  analytics = require('@react-native-firebase/analytics').default;
} catch (e) {
  console.warn('[Analytics] Firebase Analytics native module not found.');
}

/**
 * Safely execute a native module call after interactions complete.
 * Catches native Obj-C / TurboModule exceptions that would otherwise
 * propagate through ObjCTurboModule::performVoidMethodInvocation and abort().
 */
const _safeNativeCall = (label: string, fn: () => void | Promise<void>) => {
  InteractionManager.runAfterInteractions(() => {
    try {
      const result = fn();
      // If the call returns a promise, catch async failures too
      if (result && typeof (result as any).catch === 'function') {
        (result as Promise<void>).catch(err => {
          console.warn(`[Analytics] Native call failed (async) [${label}]:`, err);
        });
      }
    } catch (err) {
      console.warn(`[Analytics] Native call failed (sync) [${label}]:`, err);
    }
  });
};

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
      _safeNativeCall(`logEvent:${eventName}`, () => analytics().logEvent(eventName, params));
    }
    _safeNativeCall(`mixpanel.track:${eventName}`, () => mixpanel.track(eventName, params));
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
      _safeNativeCall(`logScreenView:${screenName}`, () =>
        analytics().logScreenView({
          screen_name: screenName,
          screen_class: screenClass || screenName,
        })
      );
    }
    _safeNativeCall(`mixpanel.screen:${screenName}`, () =>
      mixpanel.track('screen_view', {
        screen_name: screenName,
        screen_class: screenClass || screenName,
      })
    );
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
      _safeNativeCall('setUserProperties', () => analytics().setUserProperties(properties));
    }
    _safeNativeCall('mixpanel.setProperties', () => {
      Object.keys(properties).forEach(key => {
        mixpanel.getPeople().set(key, properties[key]);
      });
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
      _safeNativeCall('setUserId', () => analytics().setUserId(userId));
    }
    
    _safeNativeCall('mixpanel.identify', () => {
      if (userId) {
        mixpanel.identify(userId);
      } else {
        mixpanel.reset();
      }
    });
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
    
    _safeNativeCall('trackCharge', () =>
      mixpanel.getPeople().trackCharge(amount, { '$currency': currency })
    );
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
