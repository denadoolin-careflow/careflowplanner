import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Download, ExternalLink } from "lucide-react";

export type LightboxMedia = {
  src: string;
  name?: string;
  kind: "image" | "pdf";
};

const EVENT = "cf:media-lightbox-open";

export function openMediaLightbox(media: LightboxMedia) {
  window.dispatchEvent(new CustomEvent<LightboxMedia>(EVENT, { detail: media }));
}

/** Global full-screen viewer for images and PDFs. Mount once at the app root. */
export function MediaLightbox() {
  const [media, setMedia] = useState<LightboxMedia | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<LightboxMedia>).detail;
      if (detail?.src) setMedia(detail);
    };
    window.addEventListener(EVENT, onOpen as EventListener);
    return () => window.removeEventListener(EVENT, onOpen as EventListener);
  }, []);

  const close = useCallback(() => setMedia(null), []);

  return (
    <Dialog open={!!media} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent
        className="max-w-none w-screen h-[100dvh] sm:h-screen p-0 gap-0 rounded-none border-0 bg-background/95 backdrop-blur-xl sm:rounded-none"
        hideCloseButton
      >
        {media && (
          <div className="relative flex h-full w-full flex-col">
            <div className="flex items-center gap-2 border-b border-border/40 bg-background/80 px-3 py-2">
              <div className="min-w-0 flex-1 truncate text-sm font-medium">
                {media.name || (media.kind === "pdf" ? "Document" : "Image")}
              </div>
              <a
                href={media.src}
                target="_blank"
                rel="noreferrer"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href={media.src}
                download={media.name}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={close}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                title="Close (Esc)"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-black/80">
              {media.kind === "image" ? (
                <div className="flex h-full w-full items-center justify-center p-2 sm:p-6">
                  <img
                    src={media.src}
                    alt={media.name || ""}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <iframe
                  src={media.src}
                  title={media.name || "PDF"}
                  className="h-full w-full border-0 bg-black"
                />
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}