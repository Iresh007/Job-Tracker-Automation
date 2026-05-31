import { useGetDashboardStats, useGetDailyStats, useGetApplications } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Target, Flame, TrendingUp, Send, Briefcase, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  interviewing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  offer: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  ghosted: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: daily, isLoading: dailyLoading } = useGetDailyStats();
  const { data: applications, isLoading: appsLoading } = useGetApplications({ status: undefined, search: undefined });

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
