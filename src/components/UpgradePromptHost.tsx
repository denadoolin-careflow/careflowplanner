import { useEffect, useState } from "react";
import { UpgradePrompt } from "@/components/UpgradePrompt";

export function UpgradePromptHost() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail ?? {};
      setTitle(detail.title);
      setMessage(detail.message);
      setOpen(true);
    }
    window.addEventListener("careflow:upgrade", handler);
    return () => window.removeEventListener("careflow:upgrade", handler);
  }, []);

  return <UpgradePrompt open={open} onClose={() => setOpen(false)} title={title} message={message} />;
}