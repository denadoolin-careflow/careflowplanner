import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, LayoutDashboard, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SECTIONS, useLandingContent, type SectionId } from "@/lib/landing-content";
import { toast } from "sonner";

/** Text that becomes click-to-edit for admins in edit mode; saves on blur. */
export function E({ k, className, as: Tag = "span" }: { k: string; className?: string; as?: any }) {
  const { t, editing, setText } = useLandingContent();
  const ref = useRef<HTMLElement>(null);
  const value = t(k);
  useEffect(() => { if (ref.current && document.activeElement !== ref.current) ref.current.textContent = value; }, [value, editing]);
  if (!editing) return <Tag className={className}>{value}</Tag>;
  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onClick={(e: React.MouseEvent) => e.preventDefault()}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => { if (e.key === "Escape") { e.currentTarget.textContent = value; e.currentTarget.blur(); } }}
      onBlur={async (e: React.FocusEvent<HTMLElement>) => {
        const next = (e.currentTarget.textContent ?? "").trim();
        if (next !== value && (await setText(k, next))) toast.success("Saved");
      }}
      className={cn(className, "cursor-text rounded outline-dashed outline-1 outline-offset-2 outline-primary/50 hover:bg-primary/5 focus:outline-2 focus:outline-primary")}
    >{value}</Tag>
  );
}

/** Hides sections that are toggled off; in edit mode shows them faded with a toggle chip. */
export function EditableSection({ id, children }: { id: SectionId; children: ReactNode }) {
  const { doc, editing, save } = useLandingContent();
  const on = doc.sections[id] !== false;
  if (!editing) return on ? <>{children}</> : null;
  const label = SECTIONS.find((s) => s.id === id)?.label;
  return (
    <div className="relative">
      <div className="absolute left-4 top-2 z-30">
        <Button size="sm" variant={on ? "secondary" : "outline"} className="h-8 rounded-full shadow"
          onClick={() => save({ ...doc, sections: { ...doc.sections, [id]: !on } })}>
          {on ? <Eye className="mr-1 h-3.5 w-3.5" /> : <EyeOff className="mr-1 h-3.5 w-3.5" />}
          {label}: {on ? "Shown" : "Hidden"}
        </Button>
      </div>
      <div className={cn(!on && "pointer-events-none opacity-35 grayscale")}>{children}</div>
    </div>
  );
}

/** Inline testimonial editing helpers shown only in edit mode. */
export function TestimonialControls({ index }: { index: number }) {
  const { doc, editing, save } = useLandingContent();
  if (!editing) return null;
  return (
    <Button size="icon" variant="ghost" aria-label="Remove testimonial" className="absolute right-1 top-1 h-8 w-8"
      onClick={() => save({ ...doc, testimonials: doc.testimonials.filter((_, i) => i !== index) })}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export function EditableTestimonialField({ index, field, className }: { index: number; field: "quote" | "name"; className?: string }) {
  const { doc, editing, save } = useLandingContent();
  const value = doc.testimonials[index]?.[field] ?? "";
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  if (!editing) return <span className={className}>{value}</span>;
  return (
    <span contentEditable suppressContentEditableWarning
      onInput={(e) => setDraft(e.currentTarget.textContent ?? "")}
      onBlur={() => {
        if (draft.trim() === value) return;
        save({ ...doc, testimonials: doc.testimonials.map((t, i) => (i === index ? { ...t, [field]: draft.trim() } : t)) });
      }}
      className={cn(className, "cursor-text rounded outline-dashed outline-1 outline-offset-2 outline-primary/50 focus:outline-primary")}
    >{value}</span>
  );
}

export function AddTestimonialButton() {
  const { doc, editing, save } = useLandingContent();
  if (!editing) return null;
  return (
    <button type="button" onClick={() => save({ ...doc, testimonials: [...doc.testimonials, { quote: "New testimonial — click to edit.", name: "Name", avatar: "" }] })}
      className="flex min-h-32 items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 text-sm font-semibold text-primary hover:bg-primary/5">
      <Plus className="mr-1 h-4 w-4" /> Add testimonial
    </button>
  );
}

/** Floating admin bar: toggle edit mode and jump to the dashboard. */
export function LandingEditBar() {
  const { isAdmin, editing, setEditing } = useLandingContent();
  if (!isAdmin) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-xl">
      <Button size="sm" className="rounded-full" variant={editing ? "default" : "secondary"} onClick={() => setEditing(!editing)}>
        {editing ? <><X className="mr-1 h-4 w-4" /> Done editing</> : <><Pencil className="mr-1 h-4 w-4" /> Edit page</>}
      </Button>
      <Button asChild size="sm" variant="ghost" className="rounded-full">
        <Link to="/admin/landing"><LayoutDashboard className="mr-1 h-4 w-4" /> Dashboard</Link>
      </Button>
    </div>
  );
}
