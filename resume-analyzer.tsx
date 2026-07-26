import { useState } from "react";
import {
  useAnalyzeResume,
  useGetProfile,
  useGetResumeHistory,
  useSaveResumeScan,
  useDeleteResumeScan,
} from "@workspace/api-client-react";
import type { ResumeScanEntry } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetResumeHistoryQueryKey } from "@workspace/api-client-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  ScanText, Wand2, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Loader2, Info, Sparkles, ClipboardList,
  History, Trash2, BarChart2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

type AnalysisResult = NonNullable<ReturnType<typeof useAnalyzeResume>["data"]>;
type Section = AnalysisResult["sections"][number];
type ScanEntry = ResumeScanEntry;

function scoreColor(s: number) {
  return s >= 80 ? "#34d399" : s >= 60 ? "#fbbf24" : "#f87171";
}
function scoreLabel(s: number) {
  return s >= 80 ? "Excellent" : s >= 70 ? "Good" : s >= 55 ? "Fair" : "Needs Work";
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(217 32% 18%)" strokeWidth="10" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ marginTop: -(size / 2 + 14) }}>
        <span className="text-3xl font-black" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
      <span className="text-xs font-medium" style={{ color }}>{scoreLabel(score)}</span>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
  const text = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-1.5 rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-right tabular-nums ${text}`}>{score}</span>
    </div>
  );
}

function SectionCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  const icon = section.score >= 80
    ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
    : section.score >= 60
      ? <Minus className="h-3.5 w-3.5 text-amber-400" />
      : <TrendingDown className="h-3.5 w-3.5 text-red-400" />;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
      >
        {icon}
        <span className="text-sm font-medium text-foreground flex-1">{section.name}</span>
        <ScoreBar score={section.score} />
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-2 shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border bg-background/40">
          <p className="text-xs text-muted-foreground pt-3 leading-relaxed">{section.feedback}</p>
          {section.suggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Suggestions</p>
              <ul className="space-y-1.5">
                {section.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                    <span className="mt-0.5 shrink-0 h-1.5 w-1.5 rounded-full bg-primary/60 mt-1.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultsPanel({ result }: { result: AnalysisResult }) {
  const overallColor = scoreColor(result.atsScore);

  return (
    <div className="space-y-6">
      {/* Score hero */}
      <Card className="bg-card border-border overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative flex flex-col items-center shrink-0">
              <ScoreRing score={result.atsScore} size={128} />
            </div>
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className={`text-4xl font-black tabular-nums`} style={{ color: overallColor }}>{result.atsScore}</span>
                <span className="text-muted-foreground text-lg">/100 ATS Score</span>
              </div>
              {result.summary && (
                <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
              )}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  {result.keywords.found.length} keywords matched
                </Badge>
                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                  {result.keywords.missing.length} keywords missing
                </Badge>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                  {result.sections.length} sections analysed
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section scores */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" /> Section-by-Section
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.sections.map((s) => <SectionCard key={s.name} section={s} />)}
          </CardContent>
        </Card>

        {/* Keywords */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Keywords Found
                <span className="ml-auto text-xs font-normal text-muted-foreground">{result.keywords.found.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.keywords.found.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No keywords detected yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {result.keywords.found.map((k) => (
                    <Badge key={k} variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">{k}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" /> Missing Keywords
                <span className="ml-auto text-xs font-normal text-muted-foreground">{result.keywords.missing.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.keywords.missing.length === 0 ? (
                <p className="text-xs text-emerald-400">All key terms accounted for!</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {result.keywords.missing.map((k) => (
                      <Badge key={k} variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">{k}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add these to your Skills section and weave them naturally into your experience bullets.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" /> Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {result.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Priority Improvements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {result.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <span className="shrink-0 flex items-center justify-center h-4 w-4 rounded-full bg-primary/20 text-primary text-[9px] font-bold mt-0.5">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
        <Wand2 className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm text-foreground/80 flex-1">
          Ready to tailor your resume for a specific job?
        </p>
        <Link href="/ai">
          <button className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap">
            Open AI Tailor →
          </button>
        </Link>
      </div>
    </div>
  );
}

// Custom tooltip for chart
function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { label: string; role?: string } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!;
  const color = scoreColor(d.value);
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{d.payload.label}</p>
      {d.payload.role && <p className="text-foreground/60 mb-1 truncate max-w-[160px]">{d.payload.role}</p>}
      <p className="font-bold" style={{ color }}>ATS Score: {d.value}</p>
    </div>
  );
}

function ScoreHistoryPanel({ history, onDelete }: { history: ScanEntry[]; onDelete: (id: number) => void }) {
  const chartData = [...history].reverse().map((s) => ({
    label: new Date(s.scannedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    score: s.atsScore,
    role: s.targetRole ?? undefined,
  }));

  const best = Math.max(...history.map((s) => s.atsScore));
  const latest = history[0]?.atsScore ?? 0;
  const first = history[history.length - 1]?.atsScore ?? latest;
  const trend = latest - first;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" /> Score History
            <span className="text-xs font-normal text-muted-foreground ml-1">({history.length} scan{history.length !== 1 ? "s" : ""})</span>
          </CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">Best: <span className="font-bold text-emerald-400">{best}</span></span>
            {trend !== 0 && (
              <span className={trend > 0 ? "text-emerald-400" : "text-red-400"}>
                {trend > 0 ? "▲" : "▼"} {Math.abs(trend)} pts overall
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Line chart */}
        {chartData.length > 1 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 32% 18%)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={80} stroke="#34d399" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: "80", position: "right", fontSize: 9, fill: "#34d399" }} />
                <ReferenceLine y={60} stroke="#fbbf24" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: "60", position: "right", fontSize: 9, fill: "#fbbf24" }} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(217 91% 60%)"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: { score: number } };
                    return (
                      <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={scoreColor(payload.score)} stroke="hsl(222 47% 11%)" strokeWidth={2} />
                    );
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History list */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {history.map((scan) => {
            const color = scoreColor(scan.atsScore);
            const date = new Date(scan.scannedAt);
            return (
              <div
                key={scan.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-background/60 border border-border hover:border-primary/30 transition-colors group"
              >
                <div
                  className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center font-black text-sm tabular-nums"
                  style={{ background: `${color}15`, color }}
                >
                  {scan.atsScore}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {scan.targetRole ?? "General Analysis"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}
                    {date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    <span style={{ color }}>{scoreLabel(scan.atsScore)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    {scan.keywordsFound.length}✓ {scan.keywordsMissing.length}✗
                  </span>
                  <button
                    onClick={() => onDelete(scan.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResumeAnalyzer() {
  const { data: profile } = useGetProfile();
  const { data: history = [], refetch: refetchHistory } = useGetResumeHistory({
    query: { queryKey: getGetResumeHistoryQueryKey() },
  });
  const analyzeMutation = useAnalyzeResume();
  const saveScanMutation = useSaveResumeScan();
  const deleteScanMutation = useDeleteResumeScan();
  const queryClient = useQueryClient();

  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // Pre-fill resume from profile once loaded
  if (profile && !profileLoaded && profile.resumeText && !resumeText) {
    setResumeText(profile.resumeText);
    setProfileLoaded(true);
  }

  const handleAnalyze = async () => {
    if (!resumeText.trim()) return;
    const data = await analyzeMutation.mutateAsync({
      data: {
        resumeText,
        jobDescription: jobDescription || null,
        targetRole: targetRole || null,
      }
    });
    setResult(data);

    // Auto-save to history
    try {
      await saveScanMutation.mutateAsync({
        data: {
          atsScore: data.atsScore,
          targetRole: targetRole || null,
          summary: data.summary ?? null,
          sections: data.sections,
          keywordsFound: data.keywords.found,
          keywordsMissing: data.keywords.missing,
          strengths: data.strengths,
          improvements: data.improvements,
        }
      });
      await queryClient.invalidateQueries({ queryKey: getGetResumeHistoryQueryKey() });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    } catch {
      // Non-critical — don't block UX
    }

    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleDelete = async (id: number) => {
    await deleteScanMutation.mutateAsync({ id });
    await refetchHistory();
  };

  const isLoading = analyzeMutation.isPending;
  const showHistory = history.length > 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScanText className="h-6 w-6 text-primary" /> Resume Analyzer
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Deep ATS analysis — section scores, keyword gaps, and actionable improvements
          </p>
        </div>
        {savedToast && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved to history
          </div>
        )}
      </div>

      {/* Score History — shown above form when history exists */}
      {showHistory && (
        <ScoreHistoryPanel history={history} onDelete={handleDelete} />
      )}

      {!showHistory && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 border border-border rounded-lg px-4 py-3">
          <History className="h-4 w-4 shrink-0" />
          Each analysis is automatically saved — your score history and trend chart will appear here after your first scan.
        </div>
      )}

      {/* Input form */}
      <Card className="bg-card border-border">
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Target Role <span className="text-muted-foreground/50">(optional)</span></Label>
              <Input
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                className="bg-background border-input"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Resume Text</Label>
                {profile?.resumeText && !profileLoaded && (
                  <button
                    onClick={() => { setResumeText(profile.resumeText); setProfileLoaded(true); }}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Load from Profile
                  </button>
                )}
                {profileLoaded && (
                  <span className="text-xs text-emerald-400">Loaded from profile</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Your Resume</Label>
            <Textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume text here (plain text works best)..."
              className="bg-background border-input min-h-[220px] font-mono text-xs resize-none"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{resumeText.length} characters</p>
              {!profile && (
                <Link href="/profile">
                  <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                    <Info className="h-3 w-3" /> Save to Profile to auto-load next time
                  </span>
                </Link>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Job Description <span className="text-muted-foreground/50">(optional — enables targeted keyword analysis)</span>
            </Label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here for tailored keyword gap analysis..."
              className="bg-background border-input min-h-[140px] text-xs resize-none"
            />
          </div>

          {analyzeMutation.error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Failed to analyse. Please try again.
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !resumeText.trim()}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</>
              ) : (
                <><ScanText className="h-4 w-4" /> Analyse Resume</>
              )}
            </button>
            {result && !isLoading && (
              <button
                onClick={() => setResult(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear results
              </button>
            )}
            <p className="text-xs text-muted-foreground ml-auto hidden sm:block">
              Results saved automatically · Works without OPENAI_API_KEY
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <Card className="bg-card border-border">
          <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <ScanText className="absolute inset-0 m-auto h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Analysing your resume…</p>
              <p className="text-xs text-muted-foreground mt-1">Checking ATS compatibility, keywords, and section quality</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !isLoading && (
        <div id="results">
          <ResultsPanel result={result} />
        </div>
      )}
    </div>
  );
}
