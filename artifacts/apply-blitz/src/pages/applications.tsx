import { useState, useRef, useEffect } from "react";
import { useGetApplications, useUpdateApplication, useDeleteApplication, getGetApplicationsQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Briefcase, Search, Download, LayoutGrid, List, Trash2, ExternalLink, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const STATUSES = ["applied", "interviewing", "offer", "rejected", "ghosted"] as const;
type Status = typeof STATUSES[number];

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  applied: { label: "Applied", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  interviewing: { label: "Interviewing", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  offer: { label: "Offer", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  rejected: { label: "Rejected", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
  ghosted: { label: "Ghosted", color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/30" },
};

function exportCSV(data: ReturnType<typeof useGetApplications>["data"]) {
  if (!data) return;
  const headers = ["Company", "Role", "Status", "Applied Date", "Match Score", "Notes", "Apply URL"];
  const rows = data.map((a) => [
    a.company,
    a.role,
    a.status,
    format(new Date(a.appliedAt), "yyyy-MM-dd"),
    a.matchScore ?? "",
    (a.notes ?? "").replace(/,/g, ";"),
    a.applyUrl ?? "",
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `applications-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function InlineNotesEditor({ id, notes, onSave }: { id: number; notes: string | null | undefined; onSave: (id: number, notes: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(notes ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (value !== (notes ?? "")) onSave(id, value);
  };

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Escape") { setValue(notes ?? ""); setEditing(false); } if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); } }}
        rows={2}
        className="w-full text-xs bg-muted/40 border border-primary/40 rounded px-2 py-1 text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-1 focus:ring-primary/60"
        placeholder="Add notes..."
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-start gap-1.5 text-left w-full min-w-[140px] max-w-[220px]"
      title="Click to edit notes"
    >
      <span className={`text-xs flex-1 leading-relaxed line-clamp-2 ${value ? "text-muted-foreground" : "text-muted-foreground/40 italic"}`}>
        {value || "Add notes…"}
      </span>
      <Pencil className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
    </button>
  );
}

export default function Applications() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "kanban">("table");

  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useGetApplications(
    { status: (statusFilter as Status) || undefined, search: search || undefined },
    { query: { queryKey: getGetApplicationsQueryKey({ status: (statusFilter as Status) || undefined, search: search || undefined }) } }
  );

  const updateApp = useUpdateApplication();
  const deleteApp = useDeleteApplication();

  const handleStatusChange = async (id: number, status: Status) => {
    await updateApp.mutateAsync({ id, data: { status } });
    queryClient.invalidateQueries({ queryKey: getGetApplicationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
  };

  const handleNotesChange = async (id: number, notes: string) => {
    await updateApp.mutateAsync({ id, data: { notes: notes || null } });
    queryClient.invalidateQueries({ queryKey: getGetApplicationsQueryKey() });
  };

  const handleDelete = async (id: number) => {
    await deleteApp.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getGetApplicationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Applications</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{applications?.length ?? 0} total applications</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportCSV(applications)}
            className="flex items-center gap-2 border border-border text-muted-foreground px-3 py-2 rounded-md text-sm hover:text-foreground hover:border-border/60 transition-colors"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <div className="flex border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setView("table")}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${view === "table" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${view === "kanban" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search company or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-input"
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40 bg-background border-input">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : !applications || applications.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Briefcase className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-foreground">No applications yet</p>
          <p className="text-sm mt-1">Go to Find Jobs to start applying</p>
        </div>
      ) : view === "table" ? (
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Company", "Role", "Status", "Match", "Applied", "Notes", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{app.company}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{app.role}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={app.status}
                        onValueChange={(v) => handleStatusChange(app.id, v as Status)}
                      >
                        <SelectTrigger className={`h-7 text-xs w-32 border ${STATUS_CONFIG[app.status as Status]?.bg ?? ""} ${STATUS_CONFIG[app.status as Status]?.color ?? ""}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{STATUS_CONFIG[s].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      {app.matchScore != null && (
                        <span className={`text-xs font-semibold ${app.matchScore >= 80 ? "text-emerald-400" : app.matchScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                          {app.matchScore}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(app.appliedAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <InlineNotesEditor id={app.id} notes={app.notes} onSave={handleNotesChange} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {app.applyUrl && (
                          <a href={app.applyUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 overflow-x-auto">
          {STATUSES.map((status) => {
            const col = applications.filter((a) => a.status === status);
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} className="min-w-[180px]">
                <div className={`flex items-center gap-2 mb-3 px-2 py-1.5 rounded-md border ${cfg.bg}`}>
                  <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                  <span className={`ml-auto text-xs font-bold ${cfg.color}`}>{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((app) => (
                    <Card key={app.id} className="bg-card border-border hover:border-border/80 transition-colors">
                      <CardContent className="p-3 space-y-1.5">
                        <p className="text-xs font-semibold text-foreground leading-tight">{app.role}</p>
                        <p className="text-xs text-muted-foreground">{app.company}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(app.appliedAt), "MMM d")}</p>
                        {app.matchScore != null && (
                          <span className={`text-xs font-semibold ${app.matchScore >= 80 ? "text-emerald-400" : app.matchScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                            {app.matchScore}% match
                          </span>
                        )}
                        <InlineNotesEditor id={app.id} notes={app.notes} onSave={handleNotesChange} />
                      </CardContent>
                    </Card>
                  ))}
                  {col.length === 0 && (
                    <div className="border border-dashed border-border rounded-md h-16 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground/50">Empty</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
