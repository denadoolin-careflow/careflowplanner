import { useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ImagePlus, Sparkles, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOTE_COVER_PRESETS } from "@/lib/note-covers";

export function NoteCoverPicker({
  hasCover,                    // any cover (image or gradient) currently set
  onPickGradient,
  onPickImage,
  onRemove,
  busy,
}: {
  hasCover: boolean;
  onPickGradient: (id: string) => void;
  onPickImage: (file: File) => void;
  onRemove: () => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"gradient" | "upload">("gradient");
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="h-4 w-4" />
            {hasCover ? "Change cover" : "Cover"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center gap-1 border-b border-border/60 p-2">
            <Button
              variant={tab === "gradient" ? "default" : "ghost"}
              size="sm"
              className="h-7 rounded-full px-3 text-[11px]"
              onClick={() => setTab("gradient")}
            >
              <Sparkles className="mr-1 h-3 w-3" /> Gradient
            </Button>
            <Button
              variant={tab === "upload" ? "default" : "ghost"}
              size="sm"
              className="h-7 rounded-full px-3 text-[11px]"
              onClick={() => setTab("upload")}
            >
              <ImagePlus className="mr-1 h-3 w-3" /> Image
            </Button>
            {hasCover && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 rounded-full px-2 text-[11px] text-destructive hover:text-destructive"
                onClick={() => { onRemove(); setOpen(false); }}
              >
                <X className="mr-0.5 h-3 w-3" /> Remove
              </Button>
            )}
          </div>

          {tab === "gradient" ? (
            <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto p-2">
              {NOTE_COVER_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onPickGradient(p.id); setOpen(false); }}
                  className={cn(
                    "group relative h-16 overflow-hidden rounded-lg border border-border/60 transition-all",
                    "hover:scale-[1.02] hover:border-primary/40 hover:shadow-md",
                  )}
                  style={{ background: p.css }}
                  title={p.name}
                >
                  <span className="absolute inset-x-0 bottom-0 truncate bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-sm">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                <Upload className="h-4 w-4" /> Choose image…
              </Button>
              <p className="mt-2 text-[11px] text-muted-foreground">
                JPG, PNG, or WebP. Wide images (16:9) look best.
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            onPickImage(f);
            setOpen(false);
          }
          e.target.value = "";
        }}
      />
    </>
  );
}