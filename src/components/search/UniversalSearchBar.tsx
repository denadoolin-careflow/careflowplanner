import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VoiceCaptureDialog } from "@/components/voice/VoiceCaptureDialog";
import { GlobalSearchDialog } from "@/components/search/GlobalSearchDialog";

/**
 * Cmd-K opens the global split-view search (results left, preview right).
 * Brain-dump voice capture is available from the empty state.
 */
export function UniversalSearchBar() {
  const [open, setOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card/70 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            aria-label="Search everything"
          >
            <Search className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex items-center gap-2">
          Search everything
          <kbd className="rounded border border-border/60 bg-muted/50 px-1.5 text-[10px] font-mono">⌘K</kbd>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">⌘J jump</span>
        </TooltipContent>
      </Tooltip>

      <GlobalSearchDialog
        open={open}
        onOpenChange={setOpen}
        onBrainDump={() => setVoiceOpen(true)}
      />
      <VoiceCaptureDialog open={voiceOpen} onOpenChange={setVoiceOpen} />
    </>
  );
}