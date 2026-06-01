import { useState, useEffect } from "react";
import { Settings2, Key, Shield, Info, Bell, BellOff, Globe, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { requestNotificationPermission } from "@/hooks/useInterviewNotifications";

const API_INDICATORS = [
  {
    name: "OpenAI API",
    key: "OPENAI_API_KEY",
    description: "Required for AI resume tailoring and cover letter generation",
    hint: "Get at platform.openai.com",
  },
  {
    name: "RapidAPI (JSearch)",
    key: "RAPIDAPI_KEY",
    description: "Premium job search — aggregates LinkedIn, Indeed, Glassdoor and more",
    hint: "Subscribe to JSearch on rapidapi.com",
  },
  {
    name: "Adzuna App ID",
    key: "ADZUNA_APP_ID",
    description: "Free India job search API — covers Naukri, Indeed, LinkedIn and 100+ sources",
    hint: "Register free at developer.adzuna.com",
  },
  {
    name: "Adzuna API Key",
    key: "ADZUNA_API_KEY",
    description: "Required alongside Adzuna App ID",
    hint: "Get both keys at developer.adzuna.com",
  },
  {
    name: "Jooble API Key",
    key: "JOOBLE_API_KEY",
    description: "Free job aggregator — indexes 77,000+ job sites including Indian portals",
    hint: "Request free API key at jooble.org/api/about",
  },
];

type SourceStatus = {
  adzuna: boolean;
  jooble: boolean;
  jsearch: boolean;
  mock: boolean;
};

const SOURCE_META = [
  {
    key: "jsearch" as const,
    name: "JSearch / RapidAPI",
    description: "Premium — scrapes LinkedIn, Indeed, Glassdoor, Naukri, Shine, ZipRecruiter. Best coverage.",
    tier: "Premium",
    tierColor: "text-amber-400",
    tierBg: "bg-amber-500/10 border-amber-500/30",
    portals: ["LinkedIn", "Indeed", "Glassdoor", "Naukri", "Shine"],
  },
  {
    key: "adzuna" as const,
    name: "Adzuna India",
    description: "Free — aggregates from LinkedIn, Indeed, Naukri, Shine, TimesJobs and 100+ Indian job boards.",
    tier: "Free",
    tierColor: "text-emerald-400",
    tierBg: "bg-emerald-500/10 border-emerald-500/30",
    portals: ["Naukri", "Shine", "TimesJobs", "Indeed", "LinkedIn"],
  },
  {
    key: "jooble" as const,
    name: "Jooble",
    description: "Free — aggregates 77,000+ job sites globally including Foundit, Apna, and Internshala.",
    tier: "Free",
    tierColor: "text-emerald-400",
    tierBg: "bg-emerald-500/10 border-emerald-500/30",
    portals: ["Foundit", "Apna", "Internshala", "Naukri", "TimesJobs"],
  },
  {
    key: "mock" as const,
    name: "Built-in demo data",
    description: "India-localised mock jobs — always available when no API keys are configured.",
    tier: "Always on",
    tierColor: "text-blue-400",
    tierBg: "bg-blue-500/10 border-blue-500/30",
    portals: [],
  },
];

export default function Settings() {
  const [dailyGoal, setDailyGoal] = useState("50");
  const [dryRun, setDryRun] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);
  const [enablingNotif, setEnablingNotif] = useState(false);
  const [sources, setSources] = useState<SourceStatus | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(true);

  useEffect(() => {
    if (typeof Notification !== "undefined") setNotifPermission(Notification.permission);
    const goal = localStorage.getItem("applyblitz_daily_goal");
    const dry = localStorage.getItem("applyblitz_dry_run");
    if (goal) setDailyGoal(goal);
    if (dry) setDryRun(dry === "true");

    fetch("/api/jobs/sources")
      .then((r) => r.json())
      .then((data: SourceStatus) => setSources(data))
      .catch(() => setSources({ adzuna: false, jooble: false, jsearch: false, mock: true }))
      .finally(() => setSourcesLoading(false));
  }, []);

  const handleSave = () => {
    localStorage.setItem("applyblitz_daily_goal", dailyGoal);
    localStorage.setItem("applyblitz_dry_run", String(dryRun));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const activeSources = sources
    ? SOURCE_META.filter((s) => sources[s.key]).length
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure your ApplyBlitz preferences</p>
      </div>

      {/* Application Settings */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" /> Application Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Daily Application Goal</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value)}
                min={1}
                max={200}
                className="w-28 bg-background border-input"
              />
              <span className="text-sm text-muted-foreground">applications per day</span>
            </div>
            <p className="text-xs text-muted-foreground">Default is 50. Adjust based on your availability.</p>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Dry Run Mode</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Preview applications without actually submitting them
              </p>
            </div>
            <Switch checked={dryRun} onCheckedChange={setDryRun} />
          </div>

          {dryRun && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2.5">
              <Shield className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-300">
                Dry Run is active. Batch applications will be previewed but not sent or saved to your applications list.
              </p>
            </div>
          )}

          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              saved ? "bg-emerald-500/20 text-emerald-400" : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {saved ? "Saved" : "Save Settings"}
          </button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Interview Reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Get browser notifications 1 hour and 15 minutes before each scheduled interview.
          </p>
          {notifPermission === "granted" && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <Bell className="h-4 w-4 text-emerald-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-400">Reminders enabled</p>
                <p className="text-xs text-emerald-400/70">You'll be notified at 60 min and 15 min before each interview.</p>
              </div>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Active</Badge>
            </div>
          )}
          {notifPermission === "denied" && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-muted/30 border border-border">
              <BellOff className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Notifications blocked</p>
                <p className="text-xs text-muted-foreground">Click the lock icon in the address bar to allow notifications.</p>
              </div>
            </div>
          )}
          {notifPermission === "default" && (
            <button
              onClick={async () => {
                setEnablingNotif(true);
                const result = await requestNotificationPermission();
                setNotifPermission(result);
                setEnablingNotif(false);
                if (result === "granted") {
                  new Notification("ApplyBlitz reminders enabled!", {
                    body: "You'll get notified 1 hour and 15 minutes before each interview.",
                    icon: "/favicon.ico",
                  });
                }
              }}
              disabled={enablingNotif}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Bell className="h-4 w-4" />
              {enablingNotif ? "Enabling…" : "Enable Interview Reminders"}
            </button>
          )}
        </CardContent>
      </Card>

      {/* Job Sources */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Job Sources — India
            </CardTitle>
            {sourcesLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Badge variant="outline" className={`text-xs ${activeSources >= 2 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}`}>
                {activeSources} source{activeSources !== 1 ? "s" : ""} active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            ApplyBlitz aggregates jobs from multiple sources simultaneously. Add free API keys below to unlock more portals — no scraping, no ToS violations.
          </p>
          {SOURCE_META.map((src) => {
            const active = sources ? sources[src.key] : false;
            return (
              <div key={src.key} className={`flex gap-3 items-start p-3 rounded-lg border transition-colors ${active ? "border-border bg-muted/20" : "border-border/50 bg-background/40 opacity-60"}`}>
                <div className="mt-0.5 shrink-0">
                  {sourcesLoading
                    ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    : active
                      ? <CheckCircle className="h-4 w-4 text-emerald-400" />
                      : <XCircle className="h-4 w-4 text-muted-foreground/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{src.name}</p>
                    <Badge variant="outline" className={`text-xs ${src.tierBg} ${src.tierColor}`}>{src.tier}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{src.description}</p>
                  {src.portals.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {src.portals.map((p) => (
                        <span key={p} className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded">{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* API Key Status */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" /> API Key Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 bg-muted/30 border border-border rounded-md px-3 py-2.5">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Set these as environment variables (Secrets) in your Replit project. The app works without them using India-localised mock data.
            </p>
          </div>
          {API_INDICATORS.map((api) => (
            <div key={api.key} className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">{api.name}</p>
                <p className="text-xs text-muted-foreground">{api.description}</p>
                <p className="text-xs text-primary/60 hover:text-primary transition-colors">
                  <a href={api.hint.includes("platform.openai") ? "https://platform.openai.com/api-keys"
                    : api.hint.includes("rapidapi") ? "https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch"
                    : api.hint.includes("adzuna") ? "https://developer.adzuna.com"
                    : api.hint.includes("jooble") ? "https://jooble.org/api/about"
                    : "#"} target="_blank" rel="noopener noreferrer">
                    {api.hint} ↗
                  </a>
                </p>
              </div>
              <div className="flex-shrink-0">
                <Badge variant="outline" className="text-xs bg-muted/30 text-muted-foreground border-border">
                  Env secret
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* About */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-8 w-8 bg-primary/20 rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-sm">A</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">ApplyBlitz</p>
            <p className="text-xs text-muted-foreground">Job application tracker & automation — send 50+ applications/day</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
