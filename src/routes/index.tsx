import { createFileRoute, Link } from "@tanstack/react-router";
import { Terminal, Search, Database, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trace — OSINT username reconnaissance" },
      {
        name: "description",
        content:
          "Sweep 180+ social networks for a username in seconds. Sherlock-powered OSINT in your browser.",
      },
      { property: "og:title", content: "Trace — OSINT username reconnaissance" },
      {
        property: "og:description",
        content: "Sweep 180+ social networks for a username in seconds.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen scanline">
      <header className="border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary mono">
            <Terminal className="w-5 h-5" />
            <span className="text-sm tracking-widest">TRACE//OSINT</span>
          </div>
          <Link to="/auth">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-24 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 mono text-xs text-primary mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          sherlock engine · 180+ networks
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Find anyone by{" "}
          <span className="text-primary mono">@username</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
          A real OSINT investigation tool. Enter a handle, we probe 180+ social networks in
          parallel and show you every account that exists.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-20">
          <Link to="/auth">
            <Button size="lg" className="glow-primary">
              Start scanning <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 text-left">
          {[
            {
              icon: Search,
              title: "Parallel sweep",
              body: "Probes every network at once. Most scans complete in under 15 seconds.",
            },
            {
              icon: Database,
              title: "Scan history",
              body: "Every investigation is saved to your private vault. Re-open any past report.",
            },
            {
              icon: Shield,
              title: "Operator-only",
              body: "Your scans are yours alone. Row-level security keeps results private.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-lg border border-border bg-card/60 backdrop-blur"
            >
              <f.icon className="w-5 h-5 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground mono">
        // for authorized research only
      </footer>
    </div>
  );
}
