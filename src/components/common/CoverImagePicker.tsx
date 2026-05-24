import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cover image picker using free Unsplash source URLs (no API key required).
 * Pattern: https://source.unsplash.com/featured/?{query}&sig={n}
 */
function buildUnsplashUrl(query: string, seed: number, w = 800, h = 480) {
  const q = encodeURIComponent((query || "calm").trim());
  return `https://source.unsplash.com/${w}x${h}/?${q}&sig=${seed}`;
}

export function CoverImagePicker({
  value,
  onChange,
  trigger,
  defaultQuery = "",
}: {
  value?: string;
  onChange: (url: string | null) => void;
  trigger?: React.ReactNode;
  defaultQuery?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(defaultQuery);
  const [seedBase, setSeedBase] = useState(() => Math.floor(Math.random() * 1000));
  const [customUrl, setCustomUrl] = useState("");

  const seeds = [0, 1, 2, 3, 4, 5].map(i => seedBase + i);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <ImagePlus className="h-3.5 w-3.5" /> Cover
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Cover image</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search Unsplash (e.g. ocean, kitchen, garden)…"
            onKeyDown={(e) => { if (e.key === "Enter") setSeedBase(Math.floor(Math.random() * 1000)); }}
          />
          <Button variant="outline" size="icon" onClick={() => setSeedBase(Math.floor(Math.random() * 1000))} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {seeds.map(seed => {
            const url = buildUnsplashUrl(query || "calm", seed);
            return (
              <button
                key={seed}
                type="button"
                onClick={() => { onChange(url); setOpen(false); }}
                className={cn(
                  "group relative aspect-[4/3] overflow-hidden rounded-lg border border-border/60 bg-muted transition hover:border-primary/60",
                  value === url && "ring-2 ring-primary",
                )}
              >
                <img src={url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 pt-1">
          <Input
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            placeholder="Or paste image URL…"
          />
          <Button
            variant="secondary"
            disabled={!customUrl.trim()}
            onClick={() => { onChange(customUrl.trim()); setOpen(false); }}
          >
            Use
          </Button>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => { onChange(null); setOpen(false); }}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove cover
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}