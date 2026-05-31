import { useEffect, useRef, useCallback } from "react";
import { differenceInMinutes } from "date-fns";

const THRESHOLDS = [
  { minutes: 60, label: "1 hour" },
  { minutes: 15, label: "15 minutes" },
];

function storageKey(appId: number, threshold: number): string {
  return `applyblitz_notif_${appId}_${threshold}`;
}

function wasAlreadyFired(appId: number, threshold: number): boolean {
  return localStorage.getItem(storageKey(appId, threshold)) === "1";
}

function markFired(appId: number, threshold: number): void {
  localStorage.setItem(storageKey(appId, threshold), "1");
}

function clearOldKeys(appId: number): void {
  THRESHOLDS.forEach(({ minutes }) => {
    localStorage.removeItem(storageKey(appId, minutes));
  });
}

interface InterviewApp {
  id: number;
  role: string;
  company: string;
  interviewAt?: string | null;
}

export function useInterviewNotifications(applications: InterviewApp[] | undefined) {
  const permissionRef = useRef<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  const check = useCallback(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (!applications) return;

    const now = new Date();

    for (const app of applications) {
      if (!app.interviewAt) continue;
      const interviewDate = new Date(app.interviewAt);
      const minsUntil = differenceInMinutes(interviewDate, now);

      for (const { minutes, label } of THRESHOLDS) {
        if (minsUntil <= minutes && minsUntil > minutes - 5) {
          if (!wasAlreadyFired(app.id, minutes)) {
            markFired(app.id, minutes);
            new Notification(`Interview in ${label}`, {
              body: `${app.role} at ${app.company}`,
              icon: "/favicon.ico",
              tag: `interview-${app.id}-${minutes}`,
            });
          }
        }
      }

      if (minsUntil < -30) {
        clearOldKeys(app.id);
      }
    }
  }, [applications]);

  useEffect(() => {
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [check]);

  return permissionRef;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "granted") return "granted";
  const result = await Notification.requestPermission();
  return result;
}
