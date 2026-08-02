import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Loader2, RotateCcw, ZoomIn } from "lucide-react";
import { toast } from "sonner";

const ASPECTS = [
  { id: "banner", label: "Banner 3:1", value: 3 },
  { id: "wide", label: "Wide 16:9", value: 16 / 9 },
  { id: "square", label: "Square", value: 1 },
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/**
 * Pan + zoom crop frame. Exports the visible region as a JPEG blob.
 */
export function ImageCropDialog({
  src,
  open,
  onOpenChange,
  onCropped,
  defaultAspect = 3,
}: {
  src: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropped: (file: File) => void | Promise<void>;
  defaultAspect?: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [aspect, setAspect] = useState(defaultAspect);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const reset = useCallback(() => { setZoom(1); setOffset({ x: 0, y: 0 }); }, []);

  useEffect(() => { if (open) { reset(); setAspect(defaultAspect); setNatural(null); } }, [open, src, reset, defaultAspect]);

  // Non-passive wheel listener so we can preventDefault (incl. trackpad pinch).
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !open) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      setZoom(clamp(zoomRef.current * Math.exp(-dy * 0.0015), MIN_ZOOM, MAX_ZOOM));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) });
  };
  const endDrag = () => { drag.current = null; };

  const apply = async () => {
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!frame || !img || !natural) return;
    setBusy(true);
    try {
      const fw = frame.clientWidth, fh = frame.clientHeight;
      const base = Math.max(fw / natural.w, fh / natural.h);
      const scale = base * zoom;
      const drawnW = natural.w * scale, drawnH = natural.h * scale;
      const left = fw / 2 - drawnW / 2 + offset.x;
      const top = fh / 2 - drawnH / 2 + offset.y;

      const outW = Math.min(1600, Math.round(fw / scale) * 2 || 1600);
      const outH = Math.round(outW / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outW; canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unsupported");
      ctx.drawImage(
        img,
        (0 - left) / scale, (0 - top) / scale, fw / scale, fh / scale,
        0, 0, outW, outH,
      );
      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.9));
      if (!blob) throw new Error("Could not export the crop");
      await onCropped(new File([blob], "header.jpg", { type: "image/jpeg" }));
      onOpenChange(false);
    } catch {
      toast.error("Could not crop this image (it may block cross-origin access).");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Crop image</DialogTitle></DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {ASPECTS.map(a => (
            <Button
              key={a.id}
              size="sm"
              variant={aspect === a.value ? "default" : "outline"}
              className="h-7 rounded-full text-[11px]"
              onClick={() => { setAspect(a.value); reset(); }}
            >
              {a.label}
            </Button>
          ))}
        </div>

        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ aspectRatio: String(aspect) }}
          className={cn(
            "relative w-full touch-none select-none overflow-hidden rounded-lg border border-border/60 bg-muted",
            drag.current ? "cursor-grabbing" : "cursor-grab",
          )}
        >
          {src && (
            <img
              ref={imgRef}
              src={src}
              alt="Crop preview"
              crossOrigin="anonymous"
              draggable={false}
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={
                natural
                  ? (() => {
                      const frame = frameRef.current;
                      const fw = frame?.clientWidth ?? 1, fh = frame?.clientHeight ?? 1;
                      const base = Math.max(fw / natural.w, fh / natural.h);
                      const scale = base * zoom;
                      return {
                        width: natural.w * scale,
                        height: natural.h * scale,
                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                      };
                    })()
                  : { opacity: 0 }
              }
            />
          )}
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-primary/30" aria-hidden />
        </div>

        <div className="flex items-center gap-3">
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Slider
            value={[zoom]}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            onValueChange={([v]) => setZoom(v)}
            aria-label="Zoom"
            className="flex-1"
          />
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Drag to reposition, scroll or use the slider to zoom.</p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={() => void apply()} disabled={busy || !natural}>
            {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Use crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}