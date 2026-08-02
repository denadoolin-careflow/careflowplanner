import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Trash2, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { HEADER_IMAGE_PRESETS, uploadHeaderImage } from "@/lib/header-image";
import { ImageCropDialog } from "@/components/common/ImageCropDialog";
import { Crop } from "lucide-react";

/**
 * Picks a page header image: curated Unsplash imagery, an uploaded photo,
 * or a pasted image URL.
 */
export function HeaderImagePicker({
  value,
  onChange,
  trigger,
}: {
  value?: string | null;
  onChange: (value: string | null) => void | Promise<void>;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = async (v: string | null) => {
    await onChange(v);
    setOpen(false);
  };

  const onFile = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Please pick an image under 8MB"); return; }
    setCropSrc(URL.createObjectURL(file));
  };

  /** Upload the cropped result and store it. */
  const onCropped = async (file: File) => {
    setUploading(true);
    try {
      const token = await uploadHeaderImage(file);
      await pick(token);
      toast.success("Header image updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
            <ImagePlus className="h-3.5 w-3.5" /> Header image
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Header image</DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[46vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {HEADER_IMAGE_PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => void pick(p.url)}
              aria-label={p.label}
              className={cn(
                "group relative aspect-[4/3] overflow-hidden rounded-lg border border-border/60 bg-muted transition hover:border-primary/60",
                value === p.url && "ring-2 ring-primary",
              )}
            >
              <img src={p.url} alt={p.label} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/85 to-transparent px-1.5 py-1 text-left text-[10px] font-medium">
                {p.label}
              </span>
              <span
                role="button"
                tabIndex={0}
                aria-label={`Crop ${p.label}`}
                title="Crop"
                onClick={(e) => { e.stopPropagation(); setCropSrc(p.url); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setCropSrc(p.url); } }}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/85 text-foreground opacity-0 transition-opacity group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
              >
                <Crop className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <Button variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()} className="gap-1.5">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload photo
          </Button>
          <Input
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            placeholder="Or paste an image URL…"
            className="min-w-[180px] flex-1"
          />
          <Button variant="outline" disabled={!customUrl.trim()} onClick={() => void pick(customUrl.trim())}>Use</Button>
          <Button
            variant="outline"
            className="gap-1.5"
            disabled={!(customUrl.trim() || value)}
            onClick={() => setCropSrc(customUrl.trim() || value || null)}
          >
            <Crop className="h-3.5 w-3.5" /> Crop
          </Button>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void pick(null)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove image
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>

        <ImageCropDialog
          src={cropSrc}
          open={!!cropSrc}
          onOpenChange={(o) => { if (!o) setCropSrc(null); }}
          onCropped={onCropped}
        />
      </DialogContent>
    </Dialog>
  );
}