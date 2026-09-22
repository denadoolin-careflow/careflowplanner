import { useEffect, useState } from "react";
import { gmailExchange } from "@/lib/gmail";

export default function GmailCallback() {
  const [msg, setMsg] = useState("Finishing your Gmail connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") ?? params.get("exchange_code") ?? "";
    const err = params.get("error");
    if (err) { setMsg(`Google reported an error: ${err}`); return; }
    if (!code) { setMsg("No connection code was returned. Please try connecting again."); return; }

    gmailExchange(code)
      .then((r) => {
        setMsg(r.email ? `Connected ${r.email}. You can close this window.` : "Connected. You can close this window.");
        try { window.opener?.postMessage({ type: "gmail-connected" }, window.location.origin); } catch { /* ignore */ }
        setTimeout(() => { try { window.close(); } catch { /* ignore */ } }, 1200);
      })
      .catch((e) => setMsg(e?.message ?? "Something went wrong finishing the connection."));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <p className="text-sm text-muted-foreground">{msg}</p>
    </div>
  );
}
