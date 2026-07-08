import { useEffect, useRef, useState } from "react";
import { Plus, X, Zap, FileText, Mic, BookHeart, ListChecks, FileUp, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDraggableFab } from "@/hooks/use-draggable-fab";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { CareyAvatar } from "@/components/carey/CareyAvatar";
import { createNote, updateNote } from "@/lib/notes";
import { supabase } from "@/integrations/supabase/client";
import type { Attachment } from "@/lib/types";
import { toast } from "sonner";

const ATTACH_BUCKET = "attachments";
const MAX_BYTES = 20 * 1024 * 1024;
const sanitize = (n: string) => n.replace(/[^\w.\-]+/g, "_").slice(0, 120);

async function uploadToAttachments(file: File): Promise<Attachment | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) { toast.error("Please sign in to upload"); return null; }
  if (file.size > MAX_BYTES) { toast.error(`${file.name} is over 20 MB`); return null; }
  const id = (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${u.user.id}/note/quick/${id}-${sanitize(file.name)}`;
  const { error } = await supabase.storage.from(ATTACH_BUCKET).upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type || undefined,
  });
  if (error) { toast.error(`Upload failed: ${file.name}`); return null; }
  return { id, path, name: file.name, mimeType: file.type || undefined, size: file.size, uploadedAt: new Date().toISOString() } as Attachment;
}

/**
 * Universal Quick Capture FAB.
 * One floating action button that expands into a radial menu:
 *  • Note         → /notes?new=1
 *  • Voice        → dispatches `careflow:carey:open` (voice-capable assistant)
 *  • Journal      → /journal (focus editor)
 *  • Checklist    → /notes?new=checklist
 *  • PDF          → /notes?attach=pdf
 *  • Photo        → /notes?attach=photo
 *  • Quick add    → dispatches `careflow:quick-add`
 *  • Ask Carey    → dispatches `careflow:carey:open`
 */
export function CombinedFab() {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<null | "photo" | "pdf">(null);
  const drag = useDraggableFab("careflow:fab:combined", { right: 16, bottom: 96 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside.
  useEffect(() => {
    if (!expanded) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setExpanded(false);
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [expanded]);

  const close = () => setExpanded(false);
  const fire = (fn: () => void | Promise<void>) => () => { close(); haptics.tap(); void fn(); };

  const openNewNote = async (body = "") => {
    try {
      const n = await createNote({ title: "Untitled", body });
      navigate(`/notes/${n.id}`);
    } catch { toast.error("Could not create note"); }
  };

  const onPhotoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("photo");
    try {
      const att = await uploadToAttachments(file);
      if (!att) return;
      const n = await createNote({ title: file.name.replace(/\.[^.]+$/, "") || "Photo" });
      await updateNote(n.id, { attachments: [att] });
      toast.success("Photo captured");
      navigate(`/notes/${n.id}`);
    } finally { setBusy(null); }
  };

  const onPdfPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("pdf");
    try {
      const att = await uploadToAttachments(file);
      if (!att) return;
      const n = await createNote({ title: file.name.replace(/\.pdf$/i, "") || "PDF" });
      await updateNote(n.id, { attachments: [att] });
      toast.success("PDF attached");
      navigate(`/notes/${n.id}`);
    } finally { setBusy(null); }
  };

  const actions: { key: string; label: string; icon: any; onClick: () => void; accent?: boolean }[] = [
    { key: "note", label: "Note", icon: FileText, onClick: () => openNewNote() },
    { key: "voice", label: "Voice", icon: Mic, onClick: () => window.dispatchEvent(new Event("careflow:carey:open")) },
    { key: "journal", label: "Journal", icon: BookHeart, onClick: () => navigate("/journal") },
    { key: "checklist", label: "Checklist", icon: ListChecks, onClick: () => openNewNote("- [ ] \n- [ ] \n- [ ] ") },
    { key: "pdf", label: "PDF", icon: FileUp, onClick: () => pdfInputRef.current?.click() },
    { key: "photo", label: "Photo", icon: Camera, onClick: () => photoInputRef.current?.click() },
    { key: "quick", label: "Quick add", icon: Zap, onClick: () => window.dispatchEvent(new CustomEvent("careflow:quick-add", { detail: { tab: "command" } })), accent: true },
  ];

  return (
    <div
      ref={wrapRef}
      className={cn("pointer-events-none fixed z-40 flex flex-col items-end gap-2")}
      style={drag.style}
    >
      {/* Hidden file pickers */}
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment"
             onChange={onPhotoPicked} className="hidden" aria-hidden="true" />
      <input ref={pdfInputRef} type="file" accept="application/pdf"
             onChange={onPdfPicked} className="hidden" aria-hidden="true" />
      {/* Expanded radial menu */}
      <div
        className={cn(
          "flex flex-col items-end gap-2 transition-all duration-200 ease-out",
          expanded
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-75 opacity-0",
        )}
      >
        {actions.map(({ key, label, icon: Icon, onClick, accent }) => (
          <button
            key={key}
            type="button"
            onClick={fire(onClick)}
            disabled={(key === "photo" && busy === "photo") || (key === "pdf" && busy === "pdf")}
            aria-label={label}
            title={label}
            className={cn(
              "group flex items-center gap-2 rounded-full border border-border/60 bg-card/95 py-1.5 pl-3 pr-1.5 text-xs font-medium text-foreground shadow-cozy backdrop-blur",
              "transition-transform hover:scale-105 active:scale-95",
              accent && "border-primary/40 bg-primary/10",
              busy && ((key === "photo" && busy === "photo") || (key === "pdf" && busy === "pdf")) && "opacity-70",
            )}
          >
            <span className="opacity-80 group-hover:opacity-100">{label}</span>
            <span
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full",
                accent
                  ? "bg-gradient-to-br from-secondary-foreground to-primary text-primary-foreground"
                  : "bg-muted/60 text-foreground",
              )}
            >
              {(key === "photo" && busy === "photo") || (key === "pdf" && busy === "pdf")
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Icon className="h-4 w-4" />}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={fire(() => window.dispatchEvent(new Event("careflow:carey:open")))}
          aria-label="Ask Carey"
          title="Ask Carey"
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-[var(--shadow-glow)] ring-1 ring-border/60",
            "transition-transform hover:scale-105 active:scale-95",
          )}
        >
          <CareyAvatar size={36} />
        </button>
      </div>

      {/* Main FAB */}
      <button
        type="button"
        ref={drag.ref as React.RefObject<HTMLButtonElement>}
        {...drag.handlers}
        onClick={(e) => {
          if (drag.dragging) { e.preventDefault(); return; }
          haptics.pickup();
          setExpanded((v) => !v);
        }}
        aria-label={expanded ? "Close quick actions" : "Open quick actions"}
        className={cn(
          "pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-cozy",
          "transition-transform hover:scale-105 active:scale-95",
          drag.dragging && "scale-110 ring-2 ring-primary/40",
          expanded && "rotate-45",
        )}
      >
        {expanded ? <X className="h-6 w-6 -rotate-45" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}