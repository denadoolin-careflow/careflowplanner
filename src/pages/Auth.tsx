import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Heart, Sparkles, RefreshCw, MoonStar, ExternalLink, AlertTriangle, Copy, Mail } from "lucide-react";

// Detect known in-app browsers that block Google OAuth (Instagram/Facebook/
// TikTok/LinkedIn webviews). These don't let users complete sign-in and just
// show "you don't have access".
function detectInAppBrowser(): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return "Facebook";
  if (/Twitter/i.test(ua)) return "Twitter";
  if (/Line\//i.test(ua)) return "Line";
  if (/TikTok|musical_ly/i.test(ua)) return "TikTok";
  if (/LinkedInApp/i.test(ua)) return "LinkedIn";
  if (/MicroMessenger/i.test(ua)) return "WeChat";
  return null;
}

export default function Auth() {
  const { user, loading } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [inApp] = useState<string | null>(() => detectInAppBrowser());
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  // Surface OAuth errors that Supabase returns via the URL hash/query
  // (e.g. "?error=access_denied&error_description=..."). Without this the
  // user just lands back on /auth with no explanation.
  useEffect(() => {
    try {
      const hash = window.location.hash.startsWith("#")
        ? new URLSearchParams(window.location.hash.slice(1))
        : null;
      const query = new URLSearchParams(window.location.search);
      const err =
        query.get("error_description") ||
        query.get("error") ||
        hash?.get("error_description") ||
        hash?.get("error");
      if (err) {
        setOauthError(decodeURIComponent(err.replace(/\+/g, " ")));
        // Clean the URL so the banner doesn't reappear on refresh.
        const clean = window.location.origin + window.location.pathname;
        window.history.replaceState({}, "", clean);
      }
    } catch { /* noop */ }
  }, []);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back.");
  };
  const signUp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin, data: { name } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — setting up your planner…");
  };

  const sendMagicLink = async () => {
    const target = (resetEmail || email).trim();
    if (!target) return toast.error("Enter your email above first.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email for a sign-in link.");
  };

  const copyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied — paste it into Safari or Chrome.");
    } catch {
      toast.error("Couldn't copy. Long-press the address bar to copy the URL.");
    }
  };

  const signInGoogle = async () => {
    setOauthError(null);
    if (inApp) {
      toast.error(
        `Google sign-in is blocked inside ${inApp}. Tap the menu (•••) and choose "Open in browser" — Safari or Chrome.`,
        { duration: 8000 },
      );
      return;
    }
    try {
      setBusy(true);
      let handled = false;
      try {
        const result: any = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
        if (result?.redirected) { handled = true; return; }
        if (!result?.error) { handled = true; return; }
        // Surface the managed-flow error in console so we can debug from logs,
        // then fall through to the Supabase OAuth fallback below.
        console.warn("[auth] managed Google OAuth error, falling back:", result.error);
      } catch (managedErr) {
        console.warn("[auth] managed Google OAuth threw, falling back:", managedErr);
      }
      if (!handled) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        });
        if (error) {
          const msg = error.message || "Google sign-in failed.";
          setOauthError(msg);
          toast.error(msg, { duration: 8000 });
        }
      }
    } catch (e: any) {
      const msg = e?.message ?? "Google sign-in failed. Try again or use email.";
      setOauthError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full gradient-dawn">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-2 lg:items-center lg:py-16">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">CareFlow Planner</p>
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">A gentle home for your days, weeks, and the people you love.</h1>
          <p className="max-w-md text-base text-muted-foreground">
            Sign in to keep your planner in sync — across your phone, tablet, and computer. Your tasks, meals, journal, and care notes travel with you.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {[
              { icon: Heart, label: "Care notes that stay close" },
              { icon: Sparkles, label: "Soft reminders, not shame" },
              { icon: RefreshCw, label: "Weekly reset on autopilot" },
              { icon: MoonStar, label: "Low-energy mode for hard days" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="cozy-card flex items-center gap-3 p-3">
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="cozy-card p-6 sm:p-8">
          {inApp && (
            <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <div className="mb-1 flex items-center gap-1.5 font-semibold">
                <ExternalLink className="h-3.5 w-3.5" /> Open in your browser
              </div>
              You're inside the <strong>{inApp}</strong> in-app browser. Google sign-in won't work here.
              Tap the menu (•••) and choose <em>Open in Safari/Chrome</em>, then sign in.
            </div>
          )}
          {oauthError && (
            <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <div className="mb-1 flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" /> Google sign-in didn't complete
              </div>
              <p className="mb-2 leading-relaxed text-destructive/90">{oauthError}</p>
              <p className="mb-2 leading-relaxed text-destructive/80">
                Try again, or use email + password below. On mobile this can also be caused by pop-up blockers or private browsing.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-8" onClick={signInGoogle} disabled={busy}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry Google
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={copyCurrentUrl}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={sendMagicLink} disabled={busy}>
                  <Mail className="mr-1.5 h-3.5 w-3.5" /> Email me a link
                </Button>
              </div>
            </div>
          )}
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="space-y-3 pt-4">
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="h-11 text-base" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Password</Label><Input type="password" autoComplete="current-password" className="h-11 text-base" value={password} onChange={e => setPassword(e.target.value)} /></div>
              <Button className="w-full" disabled={busy} onClick={signIn}>{busy ? "Signing in…" : "Sign in"}</Button>
            </TabsContent>
            <TabsContent value="signup" className="space-y-3 pt-4">
              <div className="space-y-1.5"><Label>Your name</Label><Input autoComplete="name" className="h-11 text-base" value={name} onChange={e => setName(e.target.value)} placeholder="What should we call you?" /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="h-11 text-base" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Password</Label><Input type="password" autoComplete="new-password" className="h-11 text-base" value={password} onChange={e => setPassword(e.target.value)} /></div>
              <Button className="w-full" disabled={busy} onClick={signUp}>{busy ? "Creating…" : "Create account"}</Button>
            </TabsContent>
          </Tabs>
          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="h-11 w-full text-base" disabled={busy} onClick={signInGoogle}>
            Continue with Google
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">By signing in you'll get a private planner just for you.</p>
        </div>
      </div>
    </div>
  );
}