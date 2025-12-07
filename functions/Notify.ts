// services/notificationService.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register device and return Expo Push Token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | undefined;

  // ANDROID: Create notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  // DEVICE CHECK
  if (!Device.isDevice) {
    alert("Must use a physical device for push notifications");
    return null;
  }

  // PERMISSIONS
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("Failed to get push notification permissions");
    return null;
  }

  // GET TOKEN
  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) throw new Error("EAS Project ID not found");

    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    console.log("EXPO PUSH TOKEN:", token);
    return token;
  } catch (e) {
    console.warn("Error getting push token:", e);
    return null;
  }
}

/**
 * Save push token to Firestore
 */
export async function savePushToken(userId: string, token: string, email?: string, name?: string) {
  try {
    const userRef = doc(db, "users", userId);
    const data: any = { pushToken: token };
    if (email) data.email = email;
    if (name) data.name = name; // Save name if provided
    
    await setDoc(userRef, data, { merge: true });
    console.log("Push token and user data saved to Firestore");
  } catch (e) {
    console.error("Error saving push token to Firestore:", e);
  }
}

/**
 * Schedule a notification (reusable)
 */
export async function schedulePushNotification({
  title,
  body,
  data,
  seconds = 2,
}: {
  title: string;
  body: string;
  data?: any;
  seconds?: number;
}): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
  });
}

/**
 * Add listeners anywhere in the app
 */
export function addNotificationListeners(
  onReceive: (notification: Notifications.Notification) => void,
  onRespond?: (response: Notifications.NotificationResponse) => void
): () => void {
  const receiveListener = Notifications.addNotificationReceivedListener(
    onReceive
  );

  const responseListener = Notifications.addNotificationResponseReceivedListener(
    (response) => onRespond && onRespond(response)
  );

  // Return cleanup function
  return () => {
    receiveListener.remove();
    responseListener.remove();
  };
}
