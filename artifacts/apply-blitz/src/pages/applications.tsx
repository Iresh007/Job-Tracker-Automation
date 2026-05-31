import { useState, useRef, useEffect } from "react";
import { useGetApplications, useUpdateApplication, useDeleteApplication, getGetApplicationsQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Briefcase, Search, Download, LayoutGrid, List, Trash2, ExternalLink, Pencil, CalendarClock, FileText, Mail, Copy, Check, ChevronRight, Wand2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";

const STATUSES = ["applied", "interviewing", "offer", "rejected", "ghosted"] as const;
type Status = typeof STATUSES[number];

type Application = NonNullable<ReturnType<typeof useGetApplications>["data"]>[number];

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  applied:      { label: "Applied",      color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30"   },
  interviewing: { label: "Interviewing", color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/30" },
  offer:        { label: "Offer",        color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/30" },
  rejected:     { label: "Rejected",     color: "text-red-400",    bg: "bg-red-500/10 border-red-500/30"     },
  ghosted:      { label: "Ghosted",      color: "text-zinc-400",   bg: "bg-zinc-500/10 border-zinc-500/30"   },
};

function exportCSV(data: ReturnType<typeof useGetApplications>["data"]) {
  if (!data) return;
  const headers = ["Company", "Role", "Status", "Applied Date", "Match Score", "Notes", "Apply URL"];
  const rows = data.map((a) => [
    a.company, a.role, a.status,
    format(new Date(a.appliedAt), "yyyy-MM-dd"),
    a.matchScore ?? "",
    (a.notes ?? "").replace(/,/g, ";"),
    a.applyUrl ?? "",
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `applications-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function InlineNotesEditor({ id, notes, onSave }: { id: number; notes: string | null | undefined; onSave: (id: number, notes: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(notes ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) textareaRef.current?.focus(); }, [editing]);

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
        onKeyDown={(e) => {
          if (e.key === "Escape") { setValue(notes ?? ""); setEditing(false); }
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
        }}
        rows={2}
        className="w-full text-xs bg-muted/40 border border-primary/40 rounded px-2 py-1 text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-1 focus:ring-primary/60"
        placeholder="Add notes..."
      />
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="group flex items-start gap-1.5 text-left w-full min-w-[140px] max-w-[220px]" title="Click to edit notes">
      <span className={`text-xs flex-1 leading-relaxed line-clamp-2 ${value ? "text-muted-foreground" : "text-muted-foreground/40 italic"}`}>
        {value || "Add notes…"}
      </span>
      <Pencil className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
    </button>
  );
}

function ApplicationDetailPanel({ app, open, onClose, onStatusChange, onNotesChange }: {
  app: Application | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: number, status: Status) => void;
  onNotesChange: (id: number, notes: string) => void;
}) {
  if (!app) return null;
  const cfg = STATUS_CONFIG[app.status as Status] ?? STATUS_CONFIG.applied;
  const hasTailored = Boolean(app.tailoredResume);
  const hasCoverLetter = Boolean(app.coverLetter);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl lg:max-w-2xl flex flex-col p-0 bg-card border-border overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border bg-card">
          <SheetHeader>
            <div className="flex items-start justify-between gap-4 pr-6">
              <div className="space-y-1 min-w-0">
                <SheetTitle className="text-lg font-bold text-foreground leading-tight truncate">{app.role}</SheetTitle>
                <p className="text-sm text-muted-foreground font-medium">{app.company}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Badge variant="outline" className={`text-xs capitalize ${cfg.bg} ${cfg.color}`}>{cfg.label}</Badge>
                {app.matchScore != null && (
                  <span className={`text-xs font-bold ${app.matchScore >= 80 ? "text-emerald-400" : app.matchScore >= 60 ? "text-amber-400" : "text-red-400"}`}>
                    {app.matchScore}% ATS match
                  </span>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4 text-xs text-muted-foreground">
            <span>Applied {format(new Date(app.appliedAt), "MMM d, yyyy")}</span>
            {app.interviewAt && (
              <span className="text-amber-400 flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                Interview {format(new Date(app.interviewAt), "MMM d · h:mm a")}
              </span>
            )}
            {app.applyUrl && (
              <a href={app.applyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                View posting <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Status change */}
          <div className="mt-3">
            <Select value={app.status} onValueChange={(v) => onStatusChange(app.id, v as Status)}>
              <SelectTrigger className={`h-7 text-xs w-36 border ${cfg.bg} ${cfg.color}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Notes */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h3>
            <div className="bg-background/60 rounded-lg border border-border p-3">
              <InlineNotesEditor id={app.id} notes={app.notes} onSave={onNotesChange} />
            </div>
          </section>

          {/* Tailored Resume */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <FileText className="h-3.5 w-3.5" /> Tailored Resume
              </h3>
              {hasTailored && <CopyButton text={app.tailoredResume!} />}
            </div>
            {hasTailored ? (
              <pre className="bg-background/60 border border-border rounded-lg p-4 text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-y-auto">
                {app.tailoredResume}
              </pre>
            ) : (
              <div className="bg-background/40 border border-dashed border-border rounded-lg px-4 py-6 text-center space-y-2">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No tailored resume saved for this application.</p>
                <Link href="/ai">
                  <button onClick={onClose} className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                    <Wand2 className="h-3.5 w-3.5" /> Generate with AI Tailor <ChevronRight className="h-3 w-3" />
                  </button>
                </Link>
              </div>
            )}
          </section>

          {/* Cover Letter */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Mail className="h-3.5 w-3.5" /> Cover Letter
              </h3>
              {hasCoverLetter && <CopyButton text={app.coverLetter!} />}
            </div>
            {hasCoverLetter ? (
              <pre className="bg-background/60 border border-border rounded-lg p-4 text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-y-auto">
                {app.coverLetter}
              </pre>
            ) : (
              <div className="bg-background/40 border border-dashed border-border rounded-lg px-4 py-6 text-center space-y-2">
                <Mail className="h-8 w-8 mx-auto text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No cover letter saved for this application.</p>
                <Link href="/ai">
                  <button onClick={onClose} className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                    <Wand2 className="h-3.5 w-3.5" /> Generate with AI Tailor <ChevronRight className="h-3 w-3" />
                  </button>
                </Link>
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Applications() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

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
    if (selectedApp?.id === id) setSelectedApp((prev) => prev ? { ...prev, status } : prev);
  };

  const handleNotesChange = async (id: number, notes: string) => {
    await updateApp.mutateAsync({ id, data: { notes: notes || null } });
    queryClient.invalidateQueries({ queryKey: getGetApplicationsQueryKey() });
    if (selectedApp?.id === id) setSelectedApp((prev) => prev ? { ...prev, notes: notes || null } : prev);
  };

  const handleInterviewChange = async (id: number, interviewAt: string | null) => {
    await updateApp.mutateAsync({ id, data: { interviewAt: interviewAt || null } });
    queryClient.invalidateQueries({ queryKey: getGetApplicationsQueryKey() });
  };

  const handleDelete = async (id: number) => {
    if (selectedApp?.id === id) setSelectedApp(null);
    await deleteApp.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getGetApplicationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
  };

  const openPanel = (app: Application) => setSelectedApp(app);

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
                  {["Company", "Role", "Status", "Match", "Applied", "Interview", "Notes", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => openPanel(app)}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {app.company}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{app.role}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Select value={app.status} onValueChange={(v) => handleStatusChange(app.id, v as Status)}>
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
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 min-w-[160px]">
                        <CalendarClock className={`h-3.5 w-3.5 shrink-0 ${app.status === "interviewing" ? "text-amber-400" : "text-muted-foreground/30"}`} />
                        <input
                          type="datetime-local"
                          value={app.interviewAt ? format(new Date(app.interviewAt), "yyyy-MM-dd'T'HH:mm") : ""}
                          onChange={(e) => handleInterviewChange(app.id, e.target.value || null)}
                          className="text-xs bg-transparent border-0 text-muted-foreground focus:text-foreground focus:outline-none w-[140px] cursor-pointer disabled:opacity-30 disabled:cursor-default [color-scheme:dark]"
                          disabled={app.status !== "interviewing"}
                          title={app.status !== "interviewing" ? "Set status to Interviewing to schedule" : "Schedule interview"}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <InlineNotesEditor id={app.id} notes={app.notes} onSave={handleNotesChange} />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {(app.tailoredResume || app.coverLetter) && (
                          <button
                            onClick={() => openPanel(app)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="View resume & cover letter"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                        )}
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
                    <Card
                      key={app.id}
                      onClick={() => openPanel(app)}
                      className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer"
                    >
                      <CardContent className="p-3 space-y-1.5">
                        <p className="text-xs font-semibold text-foreground leading-tight">{app.role}</p>
                        <p className="text-xs text-muted-foreground">{app.company}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(app.appliedAt), "MMM d")}</p>
                        {app.matchScore != null && (
                          <span className={`text-xs font-semibold ${app.matchScore >= 80 ? "text-emerald-400" : app.matchScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                            {app.matchScore}% match
                          </span>
                        )}
                        {app.status === "interviewing" && (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <CalendarClock className="h-3 w-3 text-amber-400 shrink-0" />
                            <input
                              type="datetime-local"
                              value={app.interviewAt ? format(new Date(app.interviewAt), "yyyy-MM-dd'T'HH:mm") : ""}
                              onChange={(e) => handleInterviewChange(app.id, e.target.value || null)}
                              className="text-xs bg-transparent border-0 text-amber-400/80 focus:text-amber-300 focus:outline-none w-full cursor-pointer [color-scheme:dark]"
                              title="Schedule interview"
                            />
                          </div>
                        )}
                        {(app.tailoredResume || app.coverLetter) && (
                          <div className="flex items-center gap-1 pt-0.5">
                            {app.tailoredResume && <FileText className="h-3 w-3 text-primary/60" title="Has tailored resume" />}
                            {app.coverLetter && <Mail className="h-3 w-3 text-primary/60" title="Has cover letter" />}
                          </div>
                        )}
                        <div onClick={(e) => e.stopPropagation()}>
                          <InlineNotesEditor id={app.id} notes={app.notes} onSave={handleNotesChange} />
                        </div>
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

      <ApplicationDetailPanel
        app={selectedApp}
        open={selectedApp !== null}
        onClose={() => setSelectedApp(null)}
        onStatusChange={handleStatusChange}
        onNotesChange={handleNotesChange}
      />
    </div>
  );
}
