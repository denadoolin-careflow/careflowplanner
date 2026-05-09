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
import { Heart, Sparkles, RefreshCw, MoonStar } from "lucide-react";

export default function Auth() {
  const { user, loading } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

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
  const signInGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error("Could not sign in with Google.");
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
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="space-y-3 pt-4">
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
              <Button className="w-full" disabled={busy} onClick={signIn}>{busy ? "Signing in…" : "Sign in"}</Button>
            </TabsContent>
            <TabsContent value="signup" className="space-y-3 pt-4">
              <div className="space-y-1.5"><Label>Your name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="What should we call you?" /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
              <Button className="w-full" disabled={busy} onClick={signUp}>{busy ? "Creating…" : "Create account"}</Button>
            </TabsContent>
          </Tabs>
          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={signInGoogle}>Continue with Google</Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">By signing in you'll get a private planner just for you.</p>
        </div>
      </div>
    </div>
  );
}