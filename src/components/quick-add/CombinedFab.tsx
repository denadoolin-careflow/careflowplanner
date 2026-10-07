import { openAppendTo } from "@/components/quick-add/AppendToDialog";
import { ListPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Plus, X, Zap, FileText, Mic, BookHeart, ListChecks, FileUp, Camera, Loader2, NotebookPen, Inbox, CalendarRange, Salad, Droplets, Scale, Syringe, CalendarDays, CalendarPlus } from "lucide-react";
import { openAddEvent } from "@/components/calendar/AddEventHost";
import { useNavigate, useLocation } from "react-router-dom";
import { useDraggableFab } from "@/hooks/use-draggable-fab";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { CareyAvatar } from "@/components/carey/CareyAvatar";
import { createNote, updateNote, getOrCreateDailyNote } from "@/lib/notes";
import { openDailyNoteWithTemplate, readDefaultDailyTemplate, openPeriodNoteWithTemplate, readDefaultPeriodTemplate } from "@/lib/notes/daily";
import { weekKeyFor, monthKeyFor } from "@/lib/notes/periods";
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "@/lib/store";
import type { Attachment } from "@/lib/types";
import { toast } from "sonner";
import { tray } from "@/lib/tray-store";
import { Pin, Check, Settings2, ChevronLeft, ChevronRight } from "lucide-react";

type FabPrefs = { order: string[]; pinned: string[] };
const FAB_PREFS_KEY = "careflow:fab:prefs";
function loadFabPrefs(): FabPrefs {
  try {
    const p = JSON.parse(localStorage.getItem(FAB_PREFS_KEY) || "null");
    if (p && Array.isArray(p.order) && Array.isArray(p.pinned)) return p;
  } catch {}
  return { order: [], pinned: [] };
}

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
export function CombinedFab({ variant = "floating", className }: { variant?: "floating" | "dock"; className?: string }) {
  const isDock = variant === "dock";
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<null | "photo" | "pdf">(null);
  const [editing, setEditing] = useState(false);
  const [prefs, setPrefs] = useState<FabPrefs>(loadFabPrefs);
  useEffect(() => { if (!expanded) setEditing(false); }, [expanded]);
  const drag = useDraggableFab("careflow:fab:combined", { right: 16, bottom: 96 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Dock variant: the button lives in the bottom bar — it asks us to toggle
  // via `careflow:fab:toggle`, and we report state back via `careflow:fab:state`.
  useEffect(() => {
    if (!isDock) return;
    const onToggle = () => setExpanded((v) => !v);
    window.addEventListener("careflow:fab:toggle", onToggle);
    return () => window.removeEventListener("careflow:fab:toggle", onToggle);
  }, [isDock]);
  useEffect(() => {
    if (!isDock) return;
    window.dispatchEvent(new CustomEvent("careflow:fab:state", { detail: expanded }));
  }, [isDock, expanded]);
  // Close the dock menu when navigating away.
  useEffect(() => {
    if (isDock) setExpanded(false);
  }, [pathname, isDock]);

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!expanded) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setExpanded(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onDoc); window.removeEventListener("keydown", onKey); };
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
    { key: "quick", label: "Quick add", icon: Zap, onClick: () => { window.dispatchEvent(new CustomEvent("careflow:quick-add", { detail: { tab: "command" } })); }, accent: true },
    { key: "event", label: "Add event", icon: CalendarPlus, onClick: () => openAddEvent(), accent: true },
    { key: "planner", label: "Planner", icon: CalendarRange, onClick: () => navigate("/planner"), accent: true },
    { key: "append", label: "Add to note/task", icon: ListPlus, onClick: () => openAppendTo() },
    { key: "note", label: "Note", icon: FileText, onClick: () => openNewNote() },
    { key: "daily", label: "Daily note", icon: CalendarDays, onClick: async () => { const n = await openDailyNoteWithTemplate(todayISO(), readDefaultDailyTemplate()); navigate(`/notes/${n.id}`); } },
    { key: "weekly", label: "Weekly note", icon: CalendarDays, onClick: async () => { const n = await openPeriodNoteWithTemplate("weekly", weekKeyFor(new Date()), readDefaultPeriodTemplate("weekly")); navigate(`/notes/${n.id}`); } },
    { key: "monthly", label: "Monthly note", icon: CalendarDays, onClick: async () => { const n = await openPeriodNoteWithTemplate("monthly", monthKeyFor(new Date()), readDefaultPeriodTemplate("monthly")); navigate(`/notes/${n.id}`); } },
    { key: "voice", label: "Voice", icon: Mic, onClick: () => { window.dispatchEvent(new CustomEvent("careflow:quick-add", { detail: { tab: "voice", autoStart: true } })); } },
    { key: "journal", label: "Journal", icon: BookHeart, onClick: () => navigate("/journal") },
    { key: "checklist", label: "Checklist", icon: ListChecks, onClick: () => openNewNote("- [ ] \n- [ ] \n- [ ] ") },
    { key: "notepad", label: "Notepad", icon: NotebookPen, onClick: () => { tray.setTab("notepad"); tray.setOpen(true); } },
    { key: "tray", label: "Task tray", icon: Inbox, onClick: () => { tray.setTab("tray"); tray.setOpen(true); } },
    { key: "food", label: "Food", icon: Salad, onClick: () => navigate("/wellflow?log=food") },
    { key: "water", label: "Water", icon: Droplets, onClick: () => navigate("/wellflow?log=water") },
    { key: "weight", label: "Weight", icon: Scale, onClick: () => navigate("/wellflow?log=weight") },
    { key: "injection", label: "Injection", icon: Syringe, onClick: () => navigate("/wellflow?log=injection") },
    { key: "photo", label: "Photo", icon: Camera, onClick: () => photoInputRef.current?.click() },
    { key: "pdf", label: "PDF", icon: FileUp, onClick: () => pdfInputRef.current?.click() },
  ];

  const known = new Set(actions.map((a) => a.key));
  const orderKeys = [...prefs.order.filter((k) => known.has(k)), ...actions.map((a) => a.key).filter((k) => !prefs.order.includes(k))];
  const pinnedList = orderKeys.filter((k) => prefs.pinned.includes(k));
  const byKey = new Map(actions.map((a) => [a.key, a]));
  const ordered = [...pinnedList, ...orderKeys.filter((k) => !pinnedList.includes(k))].map((k) => byKey.get(k)!);
  const savePrefs = (p: FabPrefs) => { setPrefs(p); try { localStorage.setItem(FAB_PREFS_KEY, JSON.stringify(p)); } catch {} };
  const togglePin = (key: string) => {
    haptics.tap();
    const pinned = prefs.pinned.includes(key) ? prefs.pinned.filter((k) => k !== key) : [...prefs.pinned, key];
    savePrefs({ order: orderKeys, pinned });
  };
  const move = (key: string, dir: -1 | 1) => {
    const visual = ordered.map((a) => a.key);
    const i = visual.indexOf(key); const j = i + dir;
    if (j < 0 || j >= visual.length) return;
    // Crossing the pinned boundary pins/unpins the item.
    let pinned = prefs.pinned.filter((k) => known.has(k));
    const otherPinned = pinned.includes(visual[j]);
    if (otherPinned && !pinned.includes(key)) pinned = [...pinned, key];
    if (!otherPinned && pinned.includes(key)) pinned = pinned.filter((k) => k !== key);
    [visual[i], visual[j]] = [visual[j], visual[i]];
    haptics.tap();
    savePrefs({ order: visual, pinned });
  };
  const resetPrefs = () => { haptics.tap(); savePrefs({ order: [], pinned: [] }); };

  return (
    <div
      ref={wrapRef}
      data-quick-add-fab
      className={cn(
        "pointer-events-none fixed z-40 flex flex-col gap-2",
        isDock
          ? "items-center left-1/2 -translate-x-1/2 lg:hidden"
          : "items-end hidden lg:flex",
        className,
      )}
      style={isDock ? { bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" } : drag.style}
    >
      {/* Hidden file pickers */}
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment"
             onChange={onPhotoPicked} className="hidden" aria-hidden="true" />
      <input ref={pdfInputRef} type="file" accept="application/pdf"
             onChange={onPdfPicked} className="hidden" aria-hidden="true" />
      {/* Expanded menu — compact icon grid so it stays out of the way on phones */}
      <div
        className={cn(
          "w-[248px] rounded-2xl border border-border/60 bg-card/95 p-2 shadow-cozy backdrop-blur transition-all duration-200 ease-out",
          expanded
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-90 opacity-0",
        )}
      >
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {editing ? "Tap pin · arrows to reorder" : pinnedList.length ? "Pinned first" : "Quick actions"}
          </span>
          <button
            type="button"
            onClick={() => { haptics.tap(); setEditing((v) => !v); }}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-muted/60"
            aria-pressed={editing}
          >
            {editing ? <><Check className="h-3 w-3" /> Done</> : <><Settings2 className="h-3 w-3" /> Edit</>}
          </button>
        </div>
        <div className="grid max-h-[55vh] grid-cols-3 gap-1 overflow-y-auto">
          {ordered.map(({ key, label, icon: Icon, onClick, accent }, idx) => {
            const loading = (key === "photo" && busy === "photo") || (key === "pdf" && busy === "pdf");
            const isPinned = pinnedList.includes(key);
            return (
              <div key={key} className="relative">
              <button
                type="button"
                onClick={editing ? () => togglePin(key) : fire(onClick)}
                disabled={loading}
                aria-label={editing ? `${isPinned ? "Unpin" : "Pin"} ${label}` : label}
                title={label}
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium text-foreground",
                  "transition-colors hover:bg-muted/60 active:scale-95",
                  loading && "opacity-70",
                  isPinned && "bg-primary/5",
                  editing && "ring-1 ring-border/60",
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full",
                    accent
                      ? "bg-gradient-to-br from-secondary-foreground to-primary text-primary-foreground"
                      : "bg-muted/60 text-foreground",
                  )}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className="w-full truncate text-center opacity-80">{label}</span>
              </button>
              {(isPinned || editing) && (
                <Pin className={cn("pointer-events-none absolute right-1 top-1 h-3 w-3", isPinned ? "fill-primary text-primary" : "text-muted-foreground/50")} />
              )}
              {editing && (
                <div className="mt-0.5 flex justify-center gap-1">
                  <button type="button" aria-label={`Move ${label} earlier`} disabled={idx === 0}
                    onClick={() => move(key, -1)}
                    className="grid h-6 w-6 place-items-center rounded-full bg-muted/60 disabled:opacity-30">
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <button type="button" aria-label={`Move ${label} later`} disabled={idx === ordered.length - 1}
                    onClick={() => move(key, 1)}
                    className="grid h-6 w-6 place-items-center rounded-full bg-muted/60 disabled:opacity-30">
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}
              </div>
            );
          })}
        </div>
        {editing && (
          <button type="button" onClick={resetPrefs}
            className="mt-1 w-full rounded-xl py-1 text-[10px] text-muted-foreground hover:bg-muted/60">
            Reset to default order
          </button>
        )}
        <button
          type="button"
          onClick={fire(() => { window.dispatchEvent(new Event("careflow:carey:open")); })}
          aria-label="Ask Carey"
          title="Ask Carey"
          className="mt-1 flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted/60 active:scale-95"
        >
          <CareyAvatar size={28} />
          <span>Ask Carey</span>
        </button>
      </div>

      {/* Main FAB — planner lives inside the expanded grid. The dock variant
          renders its button inside the bottom bar instead. */}
      {!isDock && (
        <div className="pointer-events-auto flex items-center gap-2">
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
      )}
    </div>
  );
}