import { useState, useEffect } from "react";
import { useGetProfile, useUpsertProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { User, Loader2, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

export default function Profile() {
  const { data: profile, isLoading } = useGetProfile();
  const upsertProfile = useUpsertProfile();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: "",
    targetRoles: "",
    targetLocations: "",
    yearsExperience: 0,
    skills: "",
    resumeText: "",
    salaryMin: "",
    salaryMax: "",
    emailUser: "",
    linkedinUrl: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name ?? "",
        targetRoles: profile.targetRoles ?? "",
        targetLocations: profile.targetLocations ?? "",
        yearsExperience: profile.yearsExperience ?? 0,
        skills: profile.skills ?? "",
        resumeText: profile.resumeText ?? "",
        salaryMin: profile.salaryMin != null ? String(profile.salaryMin) : "",
        salaryMax: profile.salaryMax != null ? String(profile.salaryMax) : "",
        emailUser: profile.emailUser ?? "",
        linkedinUrl: profile.linkedinUrl ?? "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    await upsertProfile.mutateAsync({
      data: {
        name: form.name,
        targetRoles: form.targetRoles,
        targetLocations: form.targetLocations,
        yearsExperience: Number(form.yearsExperience),
        skills: form.skills,
        resumeText: form.resumeText,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        emailUser: form.emailUser || null,
        linkedinUrl: form.linkedinUrl || null,
      }
    });
    queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Your job search profile and resume</p>
        </div>
        <button
          onClick={handleSave}
          disabled={upsertProfile.isPending}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
            saved
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          } disabled:opacity-50`}
        >
          {upsertProfile.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
          ) : saved ? (
            <><CheckCircle className="h-4 w-4" /> Saved</>
          ) : (
            "Save Profile"
          )}
        </button>
      </div>

      {!profile && (
        <div className="bg-primary/10 border border-primary/30 rounded-md px-4 py-3 text-sm text-primary">
          Complete your profile to get personalized AI resume tailoring and better job matches.
        </div>
      )}

      {/* Basic Info */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Full Name</Label>
              <Input value={form.name} onChange={set("name")} placeholder="John Smith" className="bg-background border-input" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Years of Experience</Label>
              <Input type="number" value={form.yearsExperience} onChange={set("yearsExperience")} min={0} max={40} className="bg-background border-input" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Target Roles (comma-separated)</Label>
            <Input value={form.targetRoles} onChange={set("targetRoles")} placeholder="Software Engineer, Senior Engineer, Tech Lead" className="bg-background border-input" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Target Locations (comma-separated)</Label>
            <Input value={form.targetLocations} onChange={set("targetLocations")} placeholder="Bengaluru, Mumbai, Delhi NCR, Hyderabad, Remote" className="bg-background border-input" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Skills (comma-separated)</Label>
            <Input value={form.skills} onChange={set("skills")} placeholder="TypeScript, React, Node.js, PostgreSQL, AWS" className="bg-background border-input" />
          </div>
        </CardContent>
      </Card>

      {/* Salary & Contact */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">Salary & Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Salary Min (₹/year)</Label>
              <Input type="number" value={form.salaryMin} onChange={set("salaryMin")} placeholder="1200000" className="bg-background border-input" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Salary Max (₹/year)</Label>
              <Input type="number" value={form.salaryMax} onChange={set("salaryMax")} placeholder="2500000" className="bg-background border-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email (for auto-apply)</Label>
              <Input type="email" value={form.emailUser} onChange={set("emailUser")} placeholder="you@example.com" className="bg-background border-input" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">LinkedIn URL</Label>
              <Input value={form.linkedinUrl} onChange={set("linkedinUrl")} placeholder="https://linkedin.com/in/username" className="bg-background border-input" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resume */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">Base Resume</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            Paste your resume text below. The AI will use this as the base for tailoring to each job.
          </p>
          <Textarea
            value={form.resumeText}
            onChange={set("resumeText")}
            placeholder="Paste your resume text here (plain text format works best)..."
            className="bg-background border-input min-h-[280px] font-mono text-xs resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">{form.resumeText.length} characters</p>
        </CardContent>
      </Card>
    </div>
  );
}
