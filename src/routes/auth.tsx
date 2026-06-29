import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Terminal, Copy, KeyRound } from "lucide-react";

const search = z.object({
  redirect: fallback(z.string(), "/dashboard").default("/dashboard"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(search),
  component: AuthPage,
});

const KEY_DOMAIN = "operator.trace.local";

function generateKey() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 10; i++) out += (bytes[i] % 10).toString();
  return out;
}

function emailForKey(key: string) {
  return `op-${key}@${KEY_DOMAIN}`;
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect as "/dashboard" });
    });
  }, [navigate, redirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        // Try a few times in the astronomically unlikely event of a collision
        let lastErr: Error | null = null;
        for (let i = 0; i < 5; i++) {
          const newKey = generateKey();
          const { error } = await supabase.auth.signUp({
            email: emailForKey(newKey),
            password: `key_${newKey}_trace`,
          });
          if (!error) {
            setIssuedKey(newKey);
            setLoading(false);
            return;
          }
          lastErr = error;
        }
        throw lastErr ?? new Error("Could not issue access key");
      } else {
        if (!/^\d{10}$/.test(key)) {
          throw new Error("Access key must be 10 digits");
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: emailForKey(key),
          password: `key_${key}_trace`,
        });
        if (error) throw new Error("Invalid access key");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  async function continueWithIssuedKey() {
    if (!issuedKey) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailForKey(issuedKey),
      password: `key_${issuedKey}_trace`,
    });
    setLoading(false);
    if (error) {
      toast.error("Sign-in failed. Save your key and use 'Sign in'.");
      return;
    }
    navigate({ to: "/dashboard" });
  }

  if (issuedKey) {
    return (
      <div className="min-h-screen scanline flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur border-primary/30 glow-primary">
          <div className="flex items-center gap-2 mb-6 text-primary mono">
            <KeyRound className="w-5 h-5" />
            <span className="text-sm tracking-widest">ACCESS KEY ISSUED</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">Save this key</h1>
          <p className="text-sm text-muted-foreground mb-6 mono">
            // this is the ONLY way to sign back in. it cannot be recovered.
          </p>
          <div className="border border-primary/40 bg-background/60 rounded-md p-4 mono text-center text-3xl tracking-[0.4em] text-primary glow-primary mb-4">
            {issuedKey}
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full mb-3"
            onClick={() => {
              navigator.clipboard.writeText(issuedKey);
              toast.success("Key copied to clipboard");
            }}
          >
            <Copy className="w-4 h-4 mr-2" /> Copy key
          </Button>
          <Button
            type="button"
            className="w-full"
            disabled={loading}
            onClick={continueWithIssuedKey}
          >
            {loading ? "Working…" : "I saved it — enter terminal"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen scanline flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur border-primary/30 glow-primary">
        <Link to="/" className="flex items-center gap-2 mb-6 text-primary mono">
          <Terminal className="w-5 h-5" />
          <span className="text-sm tracking-widest">TRACE//OSINT</span>
        </Link>
        <h1 className="text-2xl font-bold mb-1">
          {mode === "signin" ? "Access terminal" : "Request access key"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6 mono">
          {mode === "signin"
            ? "// enter your 10-digit access key"
            : "// we'll issue you a 10-digit key — save it"}
        </p>

        <Button
          type="button"
          variant="outline"
          className="w-full mb-4"
          onClick={handleGoogle}
        >
          Continue with Google
        </Button>

        <div className="relative my-4 text-center text-xs text-muted-foreground">
          <span className="bg-card px-2 relative z-10">or access key</span>
          <div className="absolute inset-x-0 top-1/2 border-t border-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signin" && (
            <div>
              <Label htmlFor="key">Access key</Label>
              <Input
                id="key"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                required
                placeholder="0000000000"
                value={key}
                onChange={(e) => setKey(e.target.value.replace(/\D/g, ""))}
                autoComplete="one-time-code"
                className="mono tracking-[0.3em] text-center"
              />
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Working…" : mode === "signin" ? "Sign in" : "Generate access key"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-xs text-muted-foreground hover:text-primary mono w-full text-center"
        >
          {mode === "signin"
            ? "// no key? register →"
            : "// already have a key? sign in →"}
        </button>
      </Card>
    </div>
  );
}
