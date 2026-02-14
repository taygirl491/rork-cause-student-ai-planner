import analytics from '@react-native-firebase/analytics';

/**
 * Log a custom event to Firebase Analytics
 * @param eventName Name of the event (e.g., 'button_click')
 * @param params Optional parameters to include with the event
 */
export const logCustomEvent = async (eventName: string, params?: { [key: string]: any }) => {
  try {
    await analytics().logEvent(eventName, params);
  } catch (error) {
    console.error('Error logging analytics event:', error);
  }
};

/**
 * Log a screen view event
 * @param screenName Name of the screen being viewed
 * @param screenClass Class of the screen (optional)
 */
export const logScreenView = async (screenName: string, screenClass?: string) => {
  try {
    await analytics().logScreenView({
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
export const setUserProperties = async (properties: { [key: string]: string | null }) => {
  try {
    await analytics().setUserProperties(properties);
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
    await analytics().setUserId(userId);
  } catch (error) {
    console.error('Error setting user ID:', error);
  }
};

export default {
  logCustomEvent,
  logScreenView,
  setUserProperties,
  setUserId,
};
