import { useState } from "react";
import { Settings2, Key, Shield, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const API_INDICATORS = [
  {
    name: "OpenAI API",
    key: "OPENAI_API_KEY",
    description: "Required for AI resume tailoring and cover letter generation",
    hint: "Get at platform.openai.com",
  },
  {
    name: "RapidAPI (Job Search)",
    key: "RAPIDAPI_KEY",
    description: "Used to search jobs from LinkedIn, Indeed, and more",
    hint: "Subscribe to JSearch API on rapidapi.com",
  },
];

export default function Settings() {
  const [dailyGoal, setDailyGoal] = useState("50");
  const [dryRun, setDryRun] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("applyblitz_daily_goal", dailyGoal);
    localStorage.setItem("applyblitz_dry_run", String(dryRun));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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

      {/* API Key Status */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" /> API Key Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 bg-muted/30 border border-border rounded-md px-3 py-2.5 mb-4">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              API keys are configured as environment variables on the server. The app works without them using built-in mock data.
            </p>
          </div>
          {API_INDICATORS.map((api) => (
            <div key={api.key} className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">{api.name}</p>
                <p className="text-xs text-muted-foreground">{api.description}</p>
                <p className="text-xs text-muted-foreground/60">{api.hint}</p>
              </div>
              <div className="flex-shrink-0">
                <Badge variant="outline" className="text-xs bg-muted/30 text-muted-foreground border-border">
                  Server env var
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
