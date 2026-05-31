import { useState } from "react";
import { useTailorResume, useGetMatchScore, useGetProfile, useCreateApplication, getGetApplicationsQueryKey } from "@workspace/api-client-react";
import { Wand2, Loader2, CheckCircle, XCircle, Copy, Check, FileText, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

function MatchScoreMeter({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="36" fill="none" stroke="hsl(217 32% 20%)" strokeWidth="8" />
        <circle
          cx="44" cy="44" r="36" fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        <text x="44" y="44" dominantBaseline="central" textAnchor="middle" fill="white" fontSize="18" fontWeight="700">
          {score}
        </text>
        <text x="44" y="58" dominantBaseline="central" textAnchor="middle" fill="hsl(215 20% 55%)" fontSize="8">
          ATS SCORE
        </text>
      </svg>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function AiTailor() {
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<{ tailoredResume: string; coverLetter: string; matchScore: number; keywords: string[] } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: profile } = useGetProfile();
  const tailorMutation = useTailorResume();
  const createApp = useCreateApplication();
  const queryClient = useQueryClient();

  const handleTailor = async () => {
    if (!jobTitle || !company || !jobDescription) return;
    const data = await tailorMutation.mutateAsync({
      data: {
        jobTitle,
        company,
        jobDescription,
        resumeText: profile?.resumeText ?? null,
      }
    });
    setResult(data);
    setSaveSuccess(false);
  };

  const handleSaveApplication = async () => {
    if (!result) return;
    await createApp.mutateAsync({
      data: {
        company,
        role: jobTitle,
        tailoredResume: result.tailoredResume,
        coverLetter: result.coverLetter,
        matchScore: result.matchScore,
        status: "applied",
      }
    });
    queryClient.invalidateQueries({ queryKey: getGetApplicationsQueryKey() });
    setSaveSuccess(true);
  };

  const isLoading = tailorMutation.isPending;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Resume Tailor</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Generate a tailored resume and cover letter optimized for any job
        </p>
      </div>

      {/* Input Form */}
      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Job Title</Label>
              <Input
                placeholder="e.g. Senior Software Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="bg-background border-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Company</Label>
              <Input
                placeholder="e.g. Stripe"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="bg-background border-input"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Job Description</Label>
            <Textarea
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="bg-background border-input min-h-[140px] resize-none"
            />
          </div>

          {!profile?.resumeText && (
            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2">
              No resume found in your profile. Add your resume in the Profile page for best results.
            </p>
          )}

          <button
            onClick={handleTailor}
            disabled={isLoading || !jobTitle || !company || !jobDescription}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Tailoring your resume...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Tailor with AI
              </>
            )}
          </button>
        </CardContent>
      </Card>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <div className="space-y-6">
          {/* Score + Keywords */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="bg-card border-border flex flex-col items-center justify-center py-6">
              <MatchScoreMeter score={result.matchScore} />
              <p className="text-xs text-muted-foreground mt-2">ATS Optimization Score</p>
            </Card>

            <Card className="lg:col-span-2 bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Matched Keywords</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {result.keywords.map((kw) => (
                  <Badge key={kw} variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {kw}
                  </Badge>
                ))}
                {result.keywords.length === 0 && (
                  <p className="text-xs text-muted-foreground">No keywords extracted</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tailored Resume */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 flex-row flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold text-foreground">Tailored Resume</CardTitle>
              </div>
              <CopyButton text={result.tailoredResume} />
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-foreground/90 font-mono whitespace-pre-wrap leading-relaxed bg-background/50 rounded-md p-4 border border-border max-h-[400px] overflow-y-auto">
                {result.tailoredResume}
              </pre>
            </CardContent>
          </Card>

          {/* Cover Letter */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 flex-row flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold text-foreground">Cover Letter</CardTitle>
              </div>
              <CopyButton text={result.coverLetter} />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-foreground/90 leading-relaxed bg-background/50 rounded-md p-4 border border-border whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                {result.coverLetter}
              </div>
            </CardContent>
          </Card>

          {/* Save to Applications */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveApplication}
              disabled={saveSuccess}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                saveSuccess
                  ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {saveSuccess ? <><CheckCircle className="h-4 w-4" /> Saved to Applications</> : "Save Application"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
