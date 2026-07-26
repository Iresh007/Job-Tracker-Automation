import { useState } from "react";
import { useSearchJobs, useSaveJob, useCreateApplication, useGetSavedJobs, getGetSavedJobsQueryKey, getSearchJobsQueryKey } from "@workspace/api-client-react";
import { Search, MapPin, Briefcase, IndianRupee, Calendar, ExternalLink, BookmarkPlus, CheckSquare, Square, Send, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import type { SearchJobsParams } from "@workspace/api-client-react";

function MatchBadge({ score }: { score: number | null | undefined }) {
  if (!score) return null;
  const cls =
    score >= 80
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : score >= 50
      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
      : "bg-red-500/20 text-red-400 border-red-500/30";
  return (
    <Badge variant="outline" className={`text-xs ${cls}`}>
      {score}% match
    </Badge>
  );
}

export default function Jobs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("India");
  const [datePosted, setDatePosted] = useState<string>("");
  const [remote, setRemote] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchJobsParams | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set());
  const [batchApplying, setBatchApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useSearchJobs(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    searchParams!,
    { query: { enabled: !!searchParams, queryKey: getSearchJobsQueryKey(searchParams ?? undefined) } }
  );
  const saveJob = useSaveJob();
  const createApp = useCreateApplication();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchParams({
      query: searchQuery,
      location: location || undefined,
      remote: remote || undefined,
      datePosted: (datePosted || undefined) as "today" | "week" | "month" | undefined,
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async (job: NonNullable<typeof jobs>[number]) => {
    if (savedIds.has(job.externalId)) return;
    await saveJob.mutateAsync({
      data: {
        ...job,
        salary: job.salary ?? null,
        matchScore: job.matchScore ?? null,
        isRemote: job.isRemote ?? false,
      }
    });
    setSavedIds((p) => new Set([...p, job.externalId]));
    queryClient.invalidateQueries({ queryKey: getGetSavedJobsQueryKey() });
  };

  const handleApply = async (job: NonNullable<typeof jobs>[number]) => {
    if (applyingIds.has(job.externalId)) return;
    setApplyingIds((p) => new Set([...p, job.externalId]));
    await createApp.mutateAsync({
      data: {
        company: job.company,
        role: job.title,
        applyUrl: job.applyUrl,
        matchScore: job.matchScore ?? null,
        jobDescription: job.description ?? null,
        salary: job.salary ?? null,
        status: "applied",
      }
    });
    setApplyingIds((p) => { const n = new Set(p); n.delete(job.externalId); return n; });
    setAppliedSuccess((p) => new Set([...p, job.externalId]));
    if (job.applyUrl) window.open(job.applyUrl, "_blank");
  };

  const handleBatchApply = async () => {
    if (!jobs || selected.size === 0) return;
    setBatchApplying(true);
    const toApply = jobs.filter((j) => selected.has(j.externalId));
    for (const job of toApply) {
      await createApp.mutateAsync({
        data: {
          company: job.company,
          role: job.title,
          applyUrl: job.applyUrl,
          matchScore: job.matchScore ?? null,
          jobDescription: job.description ?? null,
          salary: job.salary ?? null,
          status: "applied",
        }
      });
      setAppliedSuccess((p) => new Set([...p, job.externalId]));
    }
    setBatchApplying(false);
    setSelected(new Set());
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Find Jobs</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Search across LinkedIn, Indeed, and more</p>
      </div>

      {/* Search Form */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Job title, role, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background border-input"
                />
              </div>
              <div className="relative w-48">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                <Input
                  placeholder="e.g. Bengaluru, Mumbai..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-9 bg-background border-input"
                />
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <Select value={datePosted || "any"} onValueChange={(v) => setDatePosted(v === "any" ? "" : v)}>
                <SelectTrigger className="w-36 bg-background border-input">
                  <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Date posted" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => setRemote(!remote)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors ${
                  remote ? "bg-primary/20 border-primary/50 text-primary" : "bg-background border-input text-muted-foreground"
                }`}
              >
                Remote only
              </button>
              <div className="flex-1" />
              <button
                type="submit"
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Batch Apply Bar */}
      {selected.size > 0 && (
        <div className="sticky top-4 z-10 flex items-center justify-between bg-primary/90 backdrop-blur text-primary-foreground px-5 py-3 rounded-md shadow-lg">
          <span className="font-medium text-sm">{selected.size} jobs selected</span>
          <button
            onClick={handleBatchApply}
            disabled={batchApplying}
            className="flex items-center gap-2 bg-primary-foreground text-primary px-4 py-1.5 rounded text-sm font-semibold hover:bg-primary-foreground/90 transition-colors disabled:opacity-60"
          >
            {batchApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Apply to All Selected
          </button>
        </div>
      )}

      {/* Results */}
      {!searchParams && !isLoading && (
        <div className="text-center py-20 text-muted-foreground">
          <Briefcase className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-foreground">Start your search</p>
          <p className="text-sm mt-1">Enter a job title above to discover opportunities</p>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-lg" />
          ))}
        </div>
      )}

      {jobs && jobs.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium text-foreground">No results found</p>
          <p className="text-sm mt-1">Try different keywords or a broader location</p>
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{jobs.length} jobs found</p>
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                if (selected.size === jobs.length) setSelected(new Set());
                else setSelected(new Set(jobs.map((j) => j.externalId)));
              }}
            >
              {selected.size === jobs.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map((job) => {
              const isSelected = selected.has(job.externalId);
              const isSaved = savedIds.has(job.externalId);
              const isApplied = appliedSuccess.has(job.externalId);
              const isApplying = applyingIds.has(job.externalId);

              return (
                <Card
                  key={job.externalId}
                  className={`bg-card border transition-all duration-200 cursor-pointer ${
                    isSelected ? "border-primary/60 bg-primary/5" : "border-border hover:border-border/80"
                  }`}
                  onClick={() => toggleSelect(job.externalId)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div
                          className="mt-0.5 text-muted-foreground flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); toggleSelect(job.externalId); }}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-sm leading-tight">{job.title}</h3>
                          <p className="text-muted-foreground text-xs mt-0.5">{job.company}</p>
                        </div>
                      </div>
                      <MatchBadge score={job.matchScore} />
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                      {job.salary && <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{job.salary}</span>}
                      {job.isRemote && <Badge variant="outline" className="text-xs border-primary/40 text-primary/80 bg-primary/10">Remote</Badge>}
                      <span className="ml-auto">{job.source}</span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">{job.description}</p>

                    <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleApply(job)}
                        disabled={isApplied || isApplying}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          isApplied
                            ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        {isApplying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        {isApplied ? "Applied" : "Quick Apply"}
                      </button>
                      <button
                        onClick={() => handleSave(job)}
                        disabled={isSaved}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                          isSaved
                            ? "border-primary/40 text-primary/60 cursor-default"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        <BookmarkPlus className="h-3 w-3" />
                        {isSaved ? "Saved" : "Save"}
                      </button>
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
