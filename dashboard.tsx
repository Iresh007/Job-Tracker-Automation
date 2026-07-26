import { useGetDashboardStats, useGetDailyStats, useGetApplications, useGetProfile } from "@workspace/api-client-react";
import type { Application, Profile } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Target, Flame, TrendingUp, Send, Briefcase, ChevronRight, CalendarClock, Clock, IndianRupee, TrendingDown, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format, parseISO, isAfter, isBefore, addDays, differenceInHours, differenceInMinutes } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  interviewing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  offer: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  ghosted: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

function timeUntil(dt: Date): string {
  const now = new Date();
  const hrs = differenceInHours(dt, now);
  if (hrs < 0) return "Past";
  if (hrs === 0) {
    const mins = differenceInMinutes(dt, now);
    return mins <= 0 ? "Now" : `in ${mins}m`;
  }
  if (hrs < 24) return `in ${hrs}h`;
  return format(dt, "MMM d");
}

/** Parse "₹12L–₹18L" or "₹12L - ₹18L" → [12, 18] in lakhs. Returns null if unparseable. */
function parseSalaryLakhs(s: string | null | undefined): [number, number] | null {
  if (!s) return null;
  const nums = s.replace(/[₹,\s]/g, "").match(/(\d+(?:\.\d+)?)[Ll]/g);
  if (!nums || nums.length < 1) return null;
  const values = nums.map((n) => parseFloat(n));
  if (values.length === 1) return [values[0], values[0]];
  return [values[0], values[1]];
}

/** Convert ₹/year integer from profile → lakhs. e.g. 1200000 → 12 */
function rupeeToLakhs(r: number | null | undefined): number | null {
  if (!r) return null;
  return Math.round((r / 100000) * 10) / 10;
}

function SalaryTracker({
  applications,
  profile,
}: {
  applications: Application[] | undefined;
  profile: Profile | undefined;
}) {
  const targetMin = rupeeToLakhs(profile?.salaryMin);
  const targetMax = rupeeToLakhs(profile?.salaryMax);

  // Get apps with salary data that are active (not rejected/ghosted)
  const activeSalaryApps = (applications ?? [])
    .filter((a) => a.salary && ["applied", "interviewing", "offer"].includes(a.status))
    .map((a) => {
      const parsed = parseSalaryLakhs(a.salary);
      return parsed ? { ...a, salaryMin: parsed[0], salaryMax: parsed[1] } : null;
    })
    .filter(Boolean) as Array<Application & { salaryMin: number; salaryMax: number }>;

  const offerApps = activeSalaryApps.filter((a) => a.status === "offer");
  const interviewApps = activeSalaryApps.filter((a) => a.status === "interviewing");

  const bestOffer = offerApps.length > 0
    ? offerApps.reduce((best, a) => a.salaryMax > best.salaryMax ? a : best)
    : null;

  const allMidpoints = activeSalaryApps.map((a) => (a.salaryMin + a.salaryMax) / 2);
  const avgSalary = allMidpoints.length > 0
    ? Math.round(allMidpoints.reduce((s, v) => s + v, 0) / allMidpoints.length * 10) / 10
    : null;

  const hasData = activeSalaryApps.length > 0 || (targetMin != null && targetMax != null);

  if (!hasData) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-emerald-400" /> Salary Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-2">
            <IndianRupee className="h-10 w-10 mx-auto text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No salary data yet.</p>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground/70">
              <Link href="/profile">
                <span className="text-primary hover:underline cursor-pointer">Set your target salary range in Profile</span>
              </Link>
              <span>Jobs applied via Find Jobs will save their salary range automatically.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Visual range bar
  const allValues = [
    ...(targetMin != null ? [targetMin] : []),
    ...(targetMax != null ? [targetMax] : []),
    ...activeSalaryApps.map((a) => a.salaryMin),
    ...activeSalaryApps.map((a) => a.salaryMax),
  ];
  const barMin = Math.max(0, Math.min(...allValues) - 2);
  const barMax = Math.max(...allValues) + 2;
  const barRange = barMax - barMin;
  const toPercent = (v: number) => Math.max(0, Math.min(100, ((v - barMin) / barRange) * 100));

  // Bar rows: target + offer apps + interviewing apps (max 4 total)
  const barRows: Array<{
    label: string;
    sublabel: string;
    min: number;
    max: number;
    color: string;
    isTarget?: boolean;
  }> = [];

  if (targetMin != null && targetMax != null) {
    barRows.push({
      label: "Your target",
      sublabel: `₹${targetMin}L – ₹${targetMax}L`,
      min: targetMin,
      max: targetMax,
      color: "bg-primary",
      isTarget: true,
    });
  } else if (targetMin != null) {
    barRows.push({ label: "Your target", sublabel: `₹${targetMin}L+`, min: targetMin, max: targetMin, color: "bg-primary", isTarget: true });
  }

  [...offerApps, ...interviewApps]
    .slice(0, 4)
    .forEach((a) => {
      barRows.push({
        label: a.company,
        sublabel: a.salary ?? "",
        min: a.salaryMin,
        max: a.salaryMax,
        color: a.status === "offer" ? "bg-emerald-500" : "bg-amber-500",
      });
    });

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-emerald-400" /> Salary Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-3">
          {targetMin != null && targetMax != null && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Your target</p>
              <p className="text-sm font-bold text-primary">₹{targetMin}L–{targetMax}L</p>
            </div>
          )}
          {avgSalary != null && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Avg. offered</p>
              <p className="text-sm font-bold text-blue-400">₹{avgSalary}L</p>
            </div>
          )}
          {bestOffer && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Award className="h-3 w-3 text-emerald-400" />
                <p className="text-xs text-muted-foreground">Best offer</p>
              </div>
              <p className="text-sm font-bold text-emerald-400">₹{bestOffer.salaryMax}L</p>
            </div>
          )}
          {activeSalaryApps.length > 0 && (
            <div className="bg-muted/30 border border-border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">With salary data</p>
              <p className="text-sm font-bold text-foreground">{activeSalaryApps.length} apps</p>
            </div>
          )}
        </div>

        {/* Range bars */}
        {barRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>₹{Math.ceil(barMin)}L</span>
              <span>Salary Range (₹ Lakhs)</span>
              <span>₹{Math.ceil(barMax)}L</span>
            </div>
            <div className="space-y-2.5">
              {barRows.map((row, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {row.isTarget
                        ? <Target className="h-3 w-3 text-primary" />
                        : <div className={`h-2 w-2 rounded-full ${row.color}`} />}
                      <span className="text-xs font-medium text-foreground">{row.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{row.sublabel}</span>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 h-3 rounded-full opacity-80 ${row.color} ${row.isTarget ? "opacity-40 border border-primary" : ""}`}
                      style={{
                        left: `${toPercent(row.min)}%`,
                        width: `${Math.max(3, toPercent(row.max) - toPercent(row.min))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comparison insight */}
        {targetMin != null && targetMax != null && avgSalary != null && (
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md border ${
            avgSalary >= targetMin
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
          }`}>
            {avgSalary >= targetMin
              ? <TrendingUp className="h-3.5 w-3.5 shrink-0" />
              : <TrendingDown className="h-3.5 w-3.5 shrink-0" />}
            <span>
              {avgSalary >= targetMin
                ? `Avg. salary ₹${avgSalary}L is within your target range — you're on track!`
                : `Avg. salary ₹${avgSalary}L is below your ₹${targetMin}L minimum — consider targeting higher-band roles.`}
            </span>
          </div>
        )}

        {/* Application list */}
        {activeSalaryApps.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active pipeline</p>
            <div className="divide-y divide-border">
              {activeSalaryApps.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 first:pt-0">
                  <div>
                    <p className="text-xs font-medium text-foreground">{a.company}</p>
                    <p className="text-xs text-muted-foreground">{a.role}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[a.status]}`}>{a.status}</Badge>
                    <span className="text-xs font-semibold text-foreground">{a.salary}</span>
                  </div>
                </div>
              ))}
            </div>
            {activeSalaryApps.length > 5 && (
              <Link href="/applications">
                <p className="text-xs text-primary hover:underline cursor-pointer">+{activeSalaryApps.length - 5} more</p>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: daily, isLoading: dailyLoading } = useGetDailyStats();
  const { data: applications, isLoading: appsLoading } = useGetApplications({ status: undefined, search: undefined });
  const { data: profile } = useGetProfile();

  const now = new Date();
  const upcomingInterviews = (applications ?? [])
    .filter((a) => a.interviewAt && isAfter(new Date(a.interviewAt), now) && isBefore(new Date(a.interviewAt), addDays(now, 14)))
    .sort((a, b) => new Date(a.interviewAt!).getTime() - new Date(b.interviewAt!).getTime())
    .slice(0, 5);

  const recentApps = applications?.slice(0, 5) ?? [];
  const goal = stats?.dailyGoal ?? 50;
  const today = stats?.appliedToday ?? 0;
  const progress = Math.min((today / goal) * 100, 100);

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link href="/jobs">
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
            <Send className="h-4 w-4" />
            Find Jobs
          </button>
        </Link>
      </div>

      {/* Daily Goal Progress — Hero */}
      <Card className="bg-card border-border overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Daily Goal</span>
            </div>
            <span className="text-3xl font-bold text-foreground">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : <>{today}<span className="text-muted-foreground text-lg font-normal">/{goal}</span></>}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 mb-2">
            <div
              className="h-3 rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-primary to-cyan-400"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{Math.round(progress)}% of daily target</span>
            <span>{Math.max(0, goal - today)} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Applications", value: stats?.totalApplications ?? 0, icon: Briefcase, color: "text-blue-400" },
          { label: "Streak", value: `${stats?.streakDays ?? 0}d`, icon: Flame, color: "text-orange-400" },
          { label: "This Week", value: stats?.weeklyCount ?? 0, icon: Send, color: "text-primary" },
          { label: "Response Rate", value: `${stats?.responseRate ?? 0}%`, icon: TrendingUp, color: "text-emerald-400" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              {statsLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="text-2xl font-bold text-foreground">{s.value}</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Chart */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Applications This Week</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={daily ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 32% 22%)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => format(parseISO(d), "EEE")}
                    tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ background: "hsl(222 47% 14%)", border: "1px solid hsl(217 32% 20%)", borderRadius: "6px", color: "hsl(210 40% 96%)" }}
                    labelFormatter={(d) => format(parseISO(d as string), "MMM d")}
                  />
                  <Bar dataKey="count" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Pipeline Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
            ) : (
              Object.entries(stats?.statusBreakdown ?? {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <Badge variant="outline" className={`capitalize text-xs ${STATUS_COLORS[status]}`}>
                    {status}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${stats?.totalApplications ? (count / stats.totalApplications) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground w-6 text-right">{count}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Salary Tracker */}
      {!appsLoading && (
        <SalaryTracker applications={applications} profile={profile} />
      )}

      {/* Upcoming Interviews */}
      {(appsLoading || upcomingInterviews.length > 0) && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 flex-row flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-400" />
              <CardTitle className="text-sm font-semibold text-foreground">Upcoming Interviews</CardTitle>
            </div>
            <Link href="/applications">
              <button className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                Manage <ChevronRight className="h-3 w-3" />
              </button>
            </Link>
          </CardHeader>
          <CardContent>
            {appsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {upcomingInterviews.map((app) => {
                  const dt = new Date(app.interviewAt!);
                  const countdown = timeUntil(dt);
                  const isImminent = differenceInHours(dt, new Date()) < 24;
                  return (
                    <div key={app.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${isImminent ? "bg-amber-500/20" : "bg-muted"}`}>
                          <Clock className={`h-4 w-4 ${isImminent ? "text-amber-400" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{app.role}</p>
                          <p className="text-xs text-muted-foreground">{app.company}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isImminent ? "text-amber-400" : "text-foreground"}`}>{countdown}</p>
                        <p className="text-xs text-muted-foreground">{format(dt, "EEE, MMM d · h:mm a")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Applications */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 flex-row flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">Recent Applications</CardTitle>
          <Link href="/applications">
            <button className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </Link>
        </CardHeader>
        <CardContent>
          {appsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : recentApps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No applications yet.</p>
              <Link href="/jobs">
                <span className="text-primary text-sm hover:underline cursor-pointer">Find jobs to apply to</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentApps.map((app) => (
                <div key={app.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{app.role}</p>
                    <p className="text-xs text-muted-foreground">{app.company}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {app.salary && (
                      <span className="text-xs text-emerald-400 font-medium hidden sm:block">{app.salary}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(app.appliedAt), "MMM d")}
                    </span>
                    <Badge variant="outline" className={`capitalize text-xs ${STATUS_COLORS[app.status]}`}>
                      {app.status}
                    </Badge>
                  </div>
                </div>
          ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
