import { Platform } from "react-native";
import { Task } from "@/types";

// expo-alarm-module API (README shows these exports; types are loose so we cast as needed)
import { removeAlarm, scheduleAlarm, stopAlarm } from "expo-alarm-module";

function getTaskDueDateTime(task: Pick<Task, "dueDate" | "dueTime">): Date | null {
  if (!task.dueDate) return null;

  // dueDate is stored as YYYY-MM-DD in this app
  const dt = new Date(task.dueDate);
  if (Number.isNaN(dt.getTime())) return null;

  if (task.dueTime) {
    const [h, m] = task.dueTime.split(":").map((v) => parseInt(v, 10));
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      dt.setHours(h, m, 0, 0);
    }
  } else {
    // Keep consistent with notificationService.ts default behavior
    dt.setHours(9, 0, 0, 0);
  }

  return dt;
}

export async function scheduleTaskAlarm(task: Task): Promise<void> {
  if (Platform.OS !== "android") return;
  if (!task.alarmEnabled) return;
  if (task.completed) return;

  const when = getTaskDueDateTime(task);
  if (!when) return;

  // Don't schedule alarms in the past
  if (when.getTime() <= Date.now()) return;

  const title = `Task Due: ${task.type.toUpperCase()}`;
  const description = `${task.description}${task.className ? ` (${task.className})` : ""}`;

  await scheduleAlarm(
    {
      uid: task.id,
      day: when,
      title,
      description,
      showDismiss: true,
      showSnooze: true,
      snoozeInterval: 5,
      repeating: false,
      active: true,
    } as any
  );
}

export async function cancelTaskAlarm(taskId: string): Promise<void> {
  if (Platform.OS !== "android") return;
  if (!taskId) return;
  try {
    await removeAlarm(taskId);
  } catch {
    // ignore (e.g. alarm doesn't exist)
  }
}

export async function stopAnyPlayingAlarm(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await stopAlarm();
  } catch {
    // ignore
  }
}

export async function scheduleDebugAlarmInTwoMinutes(): Promise<void> {
  if (Platform.OS !== "android") return;

  const when = new Date();
  when.setSeconds(when.getSeconds() + 120);

  await scheduleAlarm(
    {
      uid: "debug-alarm",
      day: when,
      title: "AI Planner Test Alarm",
      description: "If you hear this, expo-alarm-module is wired correctly.",
      showDismiss: true,
      showSnooze: true,
      snoozeInterval: 1,
      repeating: false,
      active: true,
    } as any
  );
}

export async function cancelDebugAlarm(): Promise<void> {
  return cancelTaskAlarm("debug-alarm");
}

