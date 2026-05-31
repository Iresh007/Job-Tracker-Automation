import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { requestNotificationPermission } from "@/hooks/useInterviewNotifications";

const DISMISSED_KEY = "applyblitz_notif_banner_dismissed";

export function NotificationBanner() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPermission("denied");
      return;
    }
    setPermission(Notification.permission);
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
  }, []);

  if (permission !== "default" || dismissed) return null;

  const handleEnable = async () => {
    setRequesting(true);
    const result = await requestNotificationPermission();
    setPermission(result);
    setRequesting(false);
    if (result === "granted") {
      new Notification("ApplyBlitz notifications enabled!", {
        body: "You'll be reminded 1 hour and 15 minutes before each interview.",
        icon: "/favicon.ico",
      });
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-sm">
      <Bell className="h-4 w-4 text-amber-400 shrink-0" />
      <span className="flex-1 text-amber-200/80">
        Enable browser notifications to get reminders before your interviews.
      </span>
      <button
        onClick={handleEnable}
        disabled={requesting}
        className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors disabled:opacity-50"
      >
        <Bell className="h-3 w-3" />
        {requesting ? "Enabling…" : "Enable"}
      </button>
      <button
        onClick={handleDismiss}
        className="text-amber-400/50 hover:text-amber-400 transition-colors"
        title="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function NotificationStatus() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);

  if (!permission) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      {permission === "granted" ? (
        <>
          <Bell className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-emerald-400">Interview reminders on</span>
        </>
      ) : permission === "denied" ? (
        <>
          <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Notifications blocked by browser</span>
        </>
      ) : (
        <>
          <Bell className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-amber-400">Reminders not enabled</span>
        </>
      )}
    </div>
  );
}
