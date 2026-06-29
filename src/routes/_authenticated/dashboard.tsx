import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { runScan, listScans, getScan, deleteScan } from "@/lib/osint.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Terminal,
  Search,
  ExternalLink,
  LogOut,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  History,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Result = {
  name: string;
  url: string;
  found: boolean;
  status: number;
  error?: string;
};

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const run = useServerFn(runScan);
  const list = useServerFn(listScans);
  const get = useServerFn(getScan);
  const del = useServerFn(deleteScan);

  const [username, setUsername] = useState("");
  const [current, setCurrent] = useState<{
    username: string;
    results: Result[];
    foundCount: number;
    total: number;
  } | null>(null);
  const [filter, setFilter] = useState<"found" | "all">("found");

  const history = useQuery({
    queryKey: ["scans"],
    queryFn: () => list(),
  });

  const scanMut = useMutation({
    mutationFn: (u: string) => run({ data: { username: u } }),
    onSuccess: (r) => {
      setCurrent({
        username: r.username,
        results: r.results as Result[],
        foundCount: r.foundCount,
        total: r.total,
      });
      qc.invalidateQueries({ queryKey: ["scans"] });
      toast.success(`Found ${r.foundCount} hits across ${r.total} sites`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scans"] }),
  });

  async function loadScan(id: string) {
    const row = await get({ data: { id } });
    setCurrent({
      username: row.username,
      results: row.results as Result[],
      foundCount: row.found_count,
      total: row.total_checked,
    });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const visible = current
    ? filter === "found"
      ? current.results.filter((r) => r.found)
      : current.results
    : [];

  return (
    <div className="min-h-screen scanline">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-primary mono">
            <Terminal className="w-5 h-5" />
            <span className="text-sm tracking-widest">TRACE//OSINT</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_280px] gap-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Username reconnaissance</h1>
          <p className="text-sm text-muted-foreground mono mb-6">
            // sherlock-style sweep across {180}+ networks
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (username.trim()) scanMut.mutate(username.trim());
            }}
            className="flex gap-2 mb-8"
          >
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="target_username"
              className="mono"
              required
              pattern="[A-Za-z0-9_.\-]{2,50}"
              disabled={scanMut.isPending}
            />
            <Button type="submit" disabled={scanMut.isPending} className="glow-primary">
              {scanMut.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" /> Scan
                </>
              )}
            </Button>
          </form>

          {scanMut.isPending && (
            <Card className="p-6 border-primary/30 bg-card/60 mono text-sm">
              <div className="flex items-center gap-3 text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                Probing networks for "{username}"…
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Parallel requests in flight. Usually 5-15 seconds.
              </p>
            </Card>
          )}

          {current && !scanMut.isPending && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-semibold mono">
                    <span className="text-primary">@</span>
                    {current.username}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-primary font-bold">{current.foundCount}</span> hits ·{" "}
                    {current.total} sites checked
                  </p>
                </div>
                <div className="flex gap-1 mono text-xs">
                  <button
                    onClick={() => setFilter("found")}
                    className={`px-3 py-1 rounded border ${filter === "found" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                  >
                    found ({current.foundCount})
                  </button>
                  <button
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1 rounded border ${filter === "all" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                  >
                    all ({current.total})
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {visible.map((r) => (
                  <a
                    key={r.name}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex items-center justify-between gap-3 p-3 rounded border bg-card/60 hover:border-primary transition ${
                      r.found ? "border-primary/40" : "border-border opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {r.found ? (
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground mono truncate">
                          {r.url}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {!current && !scanMut.isPending && (
            <Card className="p-10 text-center border-dashed bg-transparent">
              <Search className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mono text-sm">
                // enter a username to begin reconnaissance
              </p>
            </Card>
          )}
        </div>

        <aside>
          <div className="flex items-center gap-2 mb-3 text-sm mono text-muted-foreground">
            <History className="w-4 h-4" /> scan history
          </div>
          <div className="space-y-2">
            {history.data?.length === 0 && (
              <p className="text-xs text-muted-foreground mono">// no scans yet</p>
            )}
            {history.data?.map((s) => (
              <Card
                key={s.id}
                className="p-3 bg-card/60 border-border hover:border-primary/50 cursor-pointer group"
                onClick={() => loadScan(s.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="mono text-sm truncate">@{s.username}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1">
                        {s.found_count}/{s.total_checked}
                      </Badge>
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      delMut.mutate(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
