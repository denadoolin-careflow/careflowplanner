import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { acceptInvite } from "@/lib/household";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function JoinHousehold() {
  const { token = "" } = useParams();
  const { user, loading } = useStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "joining" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Stash the token so we can resume after sign-in.
    if (token) { try { sessionStorage.setItem("pendingInviteToken", token); } catch {} }
  }, [token]);

  if (loading) return null;
  if (!user) return <Navigate to={`/auth?redirect=${encodeURIComponent(`/join/${token}`)}`} replace />;

  const join = async () => {
    setStatus("joining");
    setError(null);
    try {
      await acceptInvite(token);
      try { sessionStorage.removeItem("pendingInviteToken"); } catch {}
      toast.success("Joined household");
      setStatus("done");
      navigate("/family", { replace: true });
    } catch (e: any) {
      setError(e?.message ?? "Could not accept invite");
      setStatus("error");
    }
  };

  return (
    <div className="mx-auto grid min-h-screen max-w-md place-items-center p-6">
      <div className="w-full space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Join household</h1>
        <p className="text-sm text-muted-foreground">You've been invited to share meals, grocery lists, and the family calendar.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={join} disabled={status === "joining" || status === "done"}>
          {status === "joining" ? "Joining…" : status === "done" ? "Joined" : "Accept invite"}
        </Button>
      </div>
    </div>
  );
}