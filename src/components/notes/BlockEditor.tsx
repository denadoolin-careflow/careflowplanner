import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { EditorContent, useEditor, ReactRenderer, Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
const RefLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute("class"),
        renderHTML: (attrs) => (attrs.class ? { class: attrs.class } : {}),
      },
    };
  },
});

import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Details, DetailsSummary, DetailsContent } from "@tiptap/extension-details";
import Suggestion from "@tiptap/suggestion";
import { Extension, Node as TiptapNode } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import GlobalDragHandle from "tiptap-extension-global-drag-handle";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { marked } from "marked";
import TurndownService from "turndown";
import Image from "@tiptap/extension-image";
import { uploadNoteImage, uploadNoteFile } from "@/lib/note-images";
import { openMediaLightbox } from "@/components/media/MediaLightbox";
import { getNote, updateNote } from "@/lib/notes";
import type { Attachment } from "@/lib/types";
import {
  Heading1, Heading2, Heading3, Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, List, ListOrdered, CheckSquare, Quote, Minus, Link as LinkIcon, Highlighter as HighlighterIcon, Type,
  CheckCircle2, FileText, Folder, Target, Users, BookOpen, Utensils, Sparkles, CalendarDays,
  ChevronRight, Palette, ListPlus, Hash, Tag as TagIcon, Plus, Image as ImageIcon, Paperclip,
  IndentIncrease, IndentDecrease, ChevronDown, Maximize2, Minimize2, EyeOff, Eye,
  Heart, AtSign, GitBranch,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { linkNote, type EntityType } from "@/lib/note-links";
import { listNotes } from "@/lib/notes";
import { supabase } from "@/integrations/supabase/client";
import { useEditorPrefs, WIDTH_PX } from "@/lib/editor-prefs";
import { WordCountFooter } from "@/components/notes/WordCountFooter";
import { NoteLinksSidebar } from "@/components/notes/NoteLinksSidebar";
import { useTags } from "@/hooks/use-tags";
import { useIsMobile } from "@/hooks/use-mobile";
import { upcomingEvents } from "@/lib/cosmic/events";
import { addDays, format as formatDate } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

/** Append an inline-uploaded file to the note's attachments list so it appears
 *  in Files & Photos. Idempotent on path. */
async function syncInlineAttachment(noteId: string | undefined, att: Attachment) {
  if (!noteId) return;
  try {
    const n = await getNote(noteId);
    if (!n) return;
    const existing = n.attachments ?? [];
    if (existing.some(a => a.path === att.path)) return;
    await updateNote(noteId, { attachments: [...existing, att] });
  } catch {/* best-effort */}
}

/** Hashtag scan: matches #word (Unicode letters/numbers/_/-), bounded by start/whitespace. */
const HASHTAG_RE = /(?:^|\s)#([\p{L}\p{N}_-]{1,40})/gu;
export function extractHashtagsFromText(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(HASHTAG_RE)) {
    const n = m[1];
    const k = n.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(n); }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Markdown <-> HTML helpers (storage compat with existing notes)    */
/* ------------------------------------------------------------------ */
const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });
turndown.addRule("taskItem", {
  filter: (node) => node.nodeName === "LI" && (node as HTMLElement).getAttribute("data-type") === "taskItem",
  replacement: (content, node) => {
    const checked = (node as HTMLElement).getAttribute("data-checked") === "true";
    return `- [${checked ? "x" : " "}] ${content.trim()}\n`;
  },
});
// Fallback: GFM-style checkboxes rendered by marked use <input type="checkbox">.
// Without this rule, turndown would drop the checkbox state when round-tripping
// content that hasn't been re-normalized into TipTap's taskItem form yet.
turndown.addRule("gfmCheckboxItem", {
  filter: (node) => {
    if (node.nodeName !== "LI") return false;
    const el = node as HTMLElement;
    if (el.getAttribute("data-type") === "taskItem") return false;
    const input = el.querySelector(":scope > input[type='checkbox'], :scope > p > input[type='checkbox']");
    return !!input;
  },
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const input = el.querySelector("input[type='checkbox']") as HTMLInputElement | null;
    const checked = !!input?.hasAttribute("checked") || input?.getAttribute("checked") === "checked";
    // Strip the checkbox before extracting text so it doesn't appear twice.
    input?.remove();
    const text = (el.textContent ?? "").trim();
    return `- [${checked ? "x" : " "}] ${text}\n`;
  },
});
// Preserve inline file embeds verbatim across markdown round-trips.
turndown.addRule("fileEmbed", {
  filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).hasAttribute("data-file-embed"),
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const src = el.getAttribute("data-src") || el.querySelector("iframe")?.getAttribute("src") || el.querySelector("a")?.getAttribute("href") || "";
    const name = el.getAttribute("data-name") || "file";
    const mime = el.getAttribute("data-mime") || "";
    return `\n\n<div data-file-embed data-src="${src}" data-name="${name}" data-mime="${mime}"></div>\n\n`;
  },
});

/**
 * Marked emits GFM task lists as <ul><li><input type="checkbox" .../> text</li></ul>.
 * TipTap's TaskList extension expects <ul data-type="taskList">
 * <li data-type="taskItem" data-checked="true|false">…</li></ul>.
 * Normalize so reopened notes keep their checkboxes (and stay editable).
 */
function normalizeTaskListsForTipTap(html: string): string {
  if (!html || typeof document === "undefined") return html;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  const lists = wrapper.querySelectorAll("ul");
  lists.forEach((ul) => {
    const items = Array.from(ul.children).filter((c) => c.tagName === "LI") as HTMLLIElement[];
    if (!items.length) return;
    const checkboxItems = items.filter((li) =>
      li.querySelector(":scope > input[type='checkbox'], :scope > p > input[type='checkbox']")
    );
    if (checkboxItems.length === 0) return;
    ul.setAttribute("data-type", "taskList");
    checkboxItems.forEach((li) => {
      const input = li.querySelector("input[type='checkbox']") as HTMLInputElement | null;
      const checked = !!input?.hasAttribute("checked") || input?.getAttribute("checked") === "checked";
      input?.remove();
      li.setAttribute("data-type", "taskItem");
      li.setAttribute("data-checked", checked ? "true" : "false");
    });
  });
  return wrapper.innerHTML;
}

export function bodyToHtml(body: string): string {
  if (!body) return "";
  const trimmed = body.trim();
  // Heuristic: if it starts with an HTML tag, treat as HTML already.
  if (/^<[a-zA-Z!]/.test(trimmed)) return normalizeTaskListsForTipTap(trimmed);
  const html = marked.parse(body, { async: false, gfm: true, breaks: false }) as string;
  return normalizeTaskListsForTipTap(html);
}
export function htmlToMarkdown(html: string): string {
  if (!html || html === "<p></p>") return "";
  return turndown.turndown(html).trim();
}

/* ------------------------------------------------------------------ */
/*  FileEmbed node — inline PDF/file preview with download fallback   */
/* ------------------------------------------------------------------ */
function isPdfLike(mime?: string, name?: string) {
  return (mime || "").includes("pdf") || /\.pdf$/i.test(name || "");
}

const FileEmbed = TiptapNode.create({
  name: "fileEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-src"),
        renderHTML: () => ({}),
      },
      name: {
        default: "",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-name") ?? "",
        renderHTML: () => ({}),
      },
      mime: {
        default: "",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-mime") ?? "",
        renderHTML: () => ({}),
      },
      size: {
        default: null,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-size");
          return v ? Number(v) : null;
        },
        renderHTML: () => ({}),
      },
      fit: {
        default: false,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-fit") === "1",
        renderHTML: () => ({}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-file-embed]" }];
  },
  renderHTML({ node }) {
    const src = (node.attrs.src as string) || "";
    const name = (node.attrs.name as string) || "file";
    const mime = (node.attrs.mime as string) || "";
    const fit = !!node.attrs.fit;
    const pdf = isPdfLike(mime, name);
    const wrapper: any = {
      "data-file-embed": "",
      "data-src": src,
      "data-name": name,
      "data-mime": mime,
      "data-fit": fit ? "1" : "0",
      class: "cf-file-embed not-prose my-3 rounded-2xl border border-border/60 bg-card/70 overflow-hidden",
    };
    if (pdf && src) {
      const iframeStyle = fit
        ? "width:100%;height:90vh;border:0;background:#0b0b0b;display:block;"
        : "width:100%;height:480px;border:0;background:#0b0b0b;display:block;";
      return [
        "div", wrapper,
        ["iframe", { src, title: name, loading: "lazy", style: iframeStyle }],
        ["div", { class: "flex items-center justify-between gap-2 px-3 py-2 text-xs" },
          ["span", { class: "truncate text-muted-foreground" }, `📄 ${name}`],
          ["div", { class: "flex items-center gap-3" },
            ["button", { type: "button", "data-toggle-fit": "", class: "text-primary underline-offset-2 hover:underline" }, fit ? "Compact view" : "Fit to page"],
            ["button", { type: "button", "data-fullscreen-pdf": "", "data-src": src, "data-name": name, class: "text-primary underline-offset-2 hover:underline" }, "View full screen"],
            ["a", { href: src, target: "_blank", rel: "noreferrer", download: name, class: "text-primary underline-offset-2 hover:underline" }, "Open / download"],
          ],
        ],
      ];
    }
    return [
      "div", wrapper,
      ["a",
        { href: src || "#", target: "_blank", rel: "noreferrer", download: name, class: "flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/40" },
        ["span", { class: "grid h-9 w-9 place-items-center rounded-lg bg-muted/60 text-muted-foreground" }, "📎"],
        ["span", { class: "min-w-0 flex-1 truncate font-medium" }, name],
        ["span", { class: "text-xs text-muted-foreground" }, mime || "file"],
      ],
    ];
  },
  addCommands() {
    return {
      setFileEmbed:
        (attrs: { src: string; name: string; mime?: string; size?: number }) =>
        ({ commands }: any) =>
          commands.insertContent({ type: this.name, attrs }),
    } as any;
  },
});

/* ------------------------------------------------------------------ */
/*  Slash command list                                                */
/* ------------------------------------------------------------------ */
type SlashItem = {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
  command: (editor: Editor) => void;
};

const slashItems = (): SlashItem[] => [
  { title: "Heading 1", icon: Heading1, keywords: ["h1", "title"], command: (e) => e.chain().focus().setNode("heading", { level: 1 }).run() },
  { title: "Heading 2", icon: Heading2, keywords: ["h2"], command: (e) => e.chain().focus().setNode("heading", { level: 2 }).run() },
  { title: "Heading 3", icon: Heading3, keywords: ["h3"], command: (e) => e.chain().focus().setNode("heading", { level: 3 }).run() },
  { title: "Bullet list", icon: List, keywords: ["ul"], command: (e) => e.chain().focus().toggleBulletList().run() },
  { title: "Numbered list", icon: ListOrdered, keywords: ["ol"], command: (e) => e.chain().focus().toggleOrderedList().run() },
  { title: "To-do list", icon: CheckSquare, keywords: ["task", "todo", "checkbox"], command: (e) => e.chain().focus().toggleTaskList().run() },
  { title: "Quote", icon: Quote, keywords: ["blockquote"], command: (e) => e.chain().focus().toggleBlockquote().run() },
  { title: "Code block", icon: Code, keywords: ["code"], command: (e) => e.chain().focus().toggleCodeBlock().run() },
  { title: "Divider", icon: Minus, keywords: ["hr", "rule"], command: (e) => e.chain().focus().setHorizontalRule().run() },
  { title: "Highlight", icon: HighlighterIcon, keywords: ["mark"], command: (e) => e.chain().focus().toggleHighlight().run() },
  { title: "Toggle", icon: ChevronRight, keywords: ["toggle", "collapse", "details", "fold", "nest"], command: (e) => e.chain().focus().setDetails().run() },
];

/* ------------------------------------------------------------------ */
/*  Reference items (live data from store)                            */
/* ------------------------------------------------------------------ */
type RefItem = { id: string; label: string; type: string; href?: string; icon: React.ComponentType<{ className?: string }>; insertText: string };

const TYPE_TO_ENTITY: Record<string, EntityType> = {
  Task: "task", Project: "project", Goal: "goal", Habit: "habit",
  Person: "person", Appointment: "appointment", Meal: "meal", Journal: "journal",
  Note: "note", Area: "area", Holiday: "holiday", Memory: "memory", Cosmic: "cosmic_event",
};

function buildReferences(state: ReturnType<typeof useStore>["state"], transits: RefItem[] = []): RefItem[] {
  const items: RefItem[] = [];
  // Cosmic transits first so they're easy to discover via @
  items.push(...transits);
  (state.tasks ?? []).slice(0, 200).forEach(t => items.push({
    id: t.id, label: t.title, type: "Task", icon: CheckCircle2, href: "/anytime", insertText: t.title,
  }));
  (state.projects ?? []).forEach(p => items.push({
    id: p.id, label: p.name, type: "Project", href: `/projects/${p.id}`, icon: Folder, insertText: p.name,
  }));
  (state.goals ?? []).forEach(g => items.push({
    id: g.id, label: g.title, type: "Goal", href: "/goals", icon: Target, insertText: g.title,
  }));
  (state.habits ?? []).forEach(h => items.push({
    id: h.id, label: h.title, type: "Habit", href: "/habits", icon: Sparkles, insertText: h.title,
  }));
  (state.recipients ?? []).forEach(p => items.push({
    id: p.id, label: p.name, type: "Person", href: "/caregiving", icon: Users, insertText: p.name,
  }));
  (state.appointments ?? []).slice(0, 50).forEach(a => items.push({
    id: a.id, label: a.title, type: "Appointment", href: "/calendar", icon: CalendarDays, insertText: a.title,
  }));
  (state.meals ?? []).slice(0, 80).forEach(m => items.push({
    id: m.id, label: m.name, type: "Meal", href: "/meals", icon: Utensils, insertText: m.name,
  }));
  (state.journal ?? []).slice(0, 80).forEach(j => items.push({
    id: j.id, label: j.title || j.body.slice(0, 40), type: "Journal", href: "/journal", icon: BookOpen, insertText: j.title || j.date,
  }));
  (state.areas ?? []).forEach(a => items.push({
    id: a.id, label: a.name, type: "Area", href: `/areas/${a.id}`, icon: Folder, insertText: a.name,
  }));
  (state.holidays ?? []).slice(0, 80).forEach(h => items.push({
    id: h.id, label: h.name, type: "Holiday", href: "/seasons/holidays", icon: CalendarDays, insertText: h.name,
  }));
  return items;
}

/* ------------------------------------------------------------------ */
/*  Generic floating menu component                                   */
/* ------------------------------------------------------------------ */
function FloatingMenu<T>({ items, onSelect, render }: {
  items: T[]; onSelect: (i: T) => void; render: (i: T, active: boolean) => React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [items]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(items.length - 1, i + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); if (items[active]) onSelect(items[active]); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [items, active, onSelect]);
  if (!items.length) return <div className="rounded-xl border border-border/60 bg-popover p-3 text-xs text-popover-foreground/70 shadow-lg">No matches</div>;
  return (
    <div className="max-h-72 w-72 overflow-y-auto rounded-xl border border-border/60 bg-popover text-popover-foreground p-1.5 shadow-xl">
      {items.map((it, i) => (
        <button
          key={i}
          onMouseDown={(e) => { e.preventDefault(); onSelect(it); }}
          onMouseEnter={() => setActive(i)}
          className={cn("w-full rounded-lg px-2 py-1.5 text-left text-sm text-popover-foreground transition", i === active ? "bg-muted text-foreground" : "hover:bg-muted/50")}
        >
          {render(it, i === active)}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Grouped floating menu (for @-mention picker)                      */
/* ------------------------------------------------------------------ */
const GROUP_ORDER = [
  "Task", "Note", "Journal", "Project", "Goal", "Habit",
  "Person", "Appointment", "Meal", "Area", "Holiday", "Memory", "Cosmic",
];
const GROUP_LABELS: Record<string, string> = {
  Task: "Tasks", Note: "Notes", Journal: "Journal entries", Project: "Projects",
  Goal: "Goals", Habit: "Habits", Person: "People", Appointment: "Appointments",
  Meal: "Meals", Area: "Areas", Holiday: "Holidays", Memory: "Memories",
  Cosmic: "Cosmic events",
};

function GroupedFloatingMenu({ items, onSelect, render }: {
  items: RefItem[];
  onSelect: (i: RefItem) => void;
  render: (i: RefItem, active: boolean) => React.ReactNode;
}) {
  // Items arrive pre-sorted by score; group preserving each group's first-seen order.
  const groups = useMemo(() => {
    const map = new Map<string, RefItem[]>();
    for (const it of items) {
      const arr = map.get(it.type) ?? [];
      arr.push(it);
      map.set(it.type, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        const ai = GROUP_ORDER.indexOf(a); const bi = GROUP_ORDER.indexOf(b);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      });
  }, [items]);

  // Flat order for keyboard nav (matches render order across groups).
  const flat = useMemo(() => groups.flatMap(([, arr]) => arr), [groups]);
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [items]);

  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    rowRefs.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!flat.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => (i + 1) % flat.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => (i - 1 + flat.length) % flat.length); }
      else if (e.key === "Enter") { e.preventDefault(); if (flat[active]) onSelect(flat[active]); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [flat, active, onSelect]);

  if (!flat.length) {
    return (
      <div className="w-72 rounded-xl border border-border/60 bg-popover p-3 text-xs text-popover-foreground/70 shadow-lg">
        No matches — keep typing to search across tasks, notes, people, dates, and cosmic events.
      </div>
    );
  }

  let runningIndex = -1;
  return (
    <div className="max-h-80 w-80 overflow-y-auto rounded-xl border border-border/60 bg-popover text-popover-foreground p-1.5 shadow-xl">
      {groups.map(([type, arr]) => (
        <div key={type} className="mb-1 last:mb-0">
          <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {GROUP_LABELS[type] ?? type}
          </div>
          {arr.map((it) => {
            runningIndex += 1;
            const idx = runningIndex;
            return (
              <button
                key={`${type}-${it.id}-${idx}`}
                ref={(el) => { rowRefs.current[idx] = el; }}
                onMouseDown={(e) => { e.preventDefault(); onSelect(it); }}
                onMouseEnter={() => setActive(idx)}
                className={cn(
                  "w-full rounded-lg px-2 py-1.5 text-left text-sm text-popover-foreground transition",
                  idx === active ? "bg-muted text-foreground" : "hover:bg-muted/50",
                )}
              >
                {render(it, idx === active)}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Lightweight fuzzy scorer. Higher = better. Returns null if no match. */
function fuzzyScore(label: string, query: string): number | null {
  if (!query) return 0;
  const l = label.toLowerCase();
  const q = query.toLowerCase();
  if (l === q) return 1000;
  if (l.startsWith(q)) return 800 - l.length;
  const idx = l.indexOf(q);
  if (idx >= 0) {
    // Word-boundary bonus
    const boundary = idx === 0 || /\s|[-_./]/.test(l[idx - 1]);
    return (boundary ? 500 : 300) - idx - Math.max(0, l.length - q.length) * 0.1;
  }
  // Subsequence match
  let li = 0, qi = 0, score = 0, streak = 0, last = -2;
  while (li < l.length && qi < q.length) {
    if (l[li] === q[qi]) {
      streak = li === last + 1 ? streak + 1 : 1;
      const boundary = li === 0 || /\s|[-_./]/.test(l[li - 1]);
      score += 10 + streak * 4 + (boundary ? 6 : 0);
      last = li; qi += 1;
    }
    li += 1;
  }
  if (qi < q.length) return null;
  return score - l.length * 0.05;
}

/* ------------------------------------------------------------------ */
/*  Suggestion factory (slash + @reference)                           */
/* ------------------------------------------------------------------ */
function makeSuggestion<T>(editor: Editor, opts: {
  char: string;
  pluginKey: PluginKey;
  getItems: (query: string) => T[];
  onSelect: (item: T, range: { from: number; to: number }, editor: Editor) => void;
  render: (item: T, active: boolean) => React.ReactNode;
  menuComponent?: React.ComponentType<{ items: T[]; onSelect: (i: T) => void; render: (i: T, active: boolean) => React.ReactNode }>;
}) {
  const MenuComp = (opts.menuComponent ?? FloatingMenu) as any;
  return Suggestion({
    editor,
    pluginKey: opts.pluginKey,
    char: opts.char,
    startOfLine: false,
    allowSpaces: opts.char === "@",
    items: ({ query }) => opts.getItems(query),
    render: () => {
      let component: ReactRenderer | null = null;
      let popup: TippyInstance[] = [];
      return {
        onStart: (props: any) => {
          component = new ReactRenderer(MenuComp, {
            props: {
              items: props.items,
              onSelect: (it: T) => opts.onSelect(it, props.range, props.editor),
              render: opts.render,
            },
            editor: props.editor,
          });
          if (!props.clientRect) return;
          popup = tippy("body", {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
            theme: "light-border",
            hideOnClick: false,
            interactiveBorder: 12,
            offset: [0, 6],
          });
        },
        onUpdate: (props: any) => {
          component?.updateProps({
            items: props.items,
            onSelect: (it: T) => opts.onSelect(it, props.range, props.editor),
            render: opts.render,
          });
          if (popup[0] && props.clientRect) popup[0].setProps({ getReferenceClientRect: props.clientRect });
        },
        onKeyDown: (props: any) => {
          if (props.event.key === "Escape") { popup[0]?.hide(); return true; }
          return false;
        },
        onExit: () => {
          popup[0]?.destroy();
          component?.destroy();
        },
      };
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Toolbar                                                           */
/* ------------------------------------------------------------------ */
function ToolbarButton({ active, onClick, label, children }: { active?: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        try { onClick(); } catch (err) { console.warn("[editor] command failed", err); }
      }}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md transition",
        active ? "bg-primary/15 text-primary" : "hover:bg-muted/60 text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({
  editor,
  onPromoteTask,
  onInsertImage,
  isFullscreen,
  onToggleFullscreen,
  onHide,
  onAddSubtask,
  onOpenMentions,
  hasSubtaskHost,
}: {
  editor: Editor;
  onPromoteTask: () => void;
  onInsertImage: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onHide?: () => void;
  onAddSubtask?: () => void;
  onOpenMentions?: () => void;
  hasSubtaskHost?: boolean;
}) {
  if (!editor) return null;
  const setLink = () => {
    const previous = editor.getAttributes("link").href;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  const doIndent = () => {
    if (editor.can().sinkListItem("taskItem")) return editor.chain().focus().sinkListItem("taskItem").run();
    if (editor.can().sinkListItem("listItem")) return editor.chain().focus().sinkListItem("listItem").run();
    editor.chain().focus().insertContent("\t").run();
  };
  const doOutdent = () => {
    if (editor.can().liftListItem("taskItem")) return editor.chain().focus().liftListItem("taskItem").run();
    if (editor.can().liftListItem("listItem")) return editor.chain().focus().liftListItem("listItem").run();
  };
  const Divider = () => <span className="mx-1 h-5 w-px shrink-0 bg-border/60" aria-hidden />;
  const headingActive = editor.isActive("heading", { level: 1 })
    ? "H1"
    : editor.isActive("heading", { level: 2 })
    ? "H2"
    : editor.isActive("heading", { level: 3 })
    ? "H3"
    : "T";
  return (
    <div className="cf-editor-toolbar z-10 flex w-full max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border/50 bg-card/70 px-2 py-1.5 backdrop-blur-xl shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* Text style */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            title="Text style"
            aria-label="Text style"
            className="h-8 min-w-[44px] inline-flex items-center justify-center gap-0.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition"
          >
            <span className="font-serif">{headingActive}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-44 p-1 rounded-xl shadow-lg border-border/60">
          {[
            { label: "Paragraph", run: () => editor.chain().focus().setParagraph().run(), active: editor.isActive("paragraph") && !editor.isActive("heading"), Icon: Type },
            { label: "Heading 1", run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }), Icon: Heading1 },
            { label: "Heading 2", run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }), Icon: Heading2 },
            { label: "Heading 3", run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }), Icon: Heading3 },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); opt.run(); }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition",
                opt.active ? "bg-primary/15 text-primary" : "text-foreground hover:bg-muted/60",
              )}
            >
              <opt.Icon className="h-4 w-4 opacity-70" /> {opt.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <Divider />

      {/* Inline formatting */}
      <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold (⌘B)"><Bold className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
      <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic (⌘I)"><Italic className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
      <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Underline (⌘U)"><UnderlineIcon className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bulleted list"><List className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
      <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list"><ListOrdered className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
      <ToolbarButton active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} label="Checklist"><CheckSquare className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>

      <Divider />

      {/* Link */}
      <ToolbarButton active={editor.isActive("link")} onClick={setLink} label="Link (⌘K)"><LinkIcon className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>

      {/* Overflow */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            title="More formatting"
            aria-label="More formatting"
            className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition"
          >
            <ChevronDown className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="w-64 p-2 rounded-xl shadow-lg border-border/60">
          <div className="grid grid-cols-6 gap-0.5">
            <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Quote"><Quote className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Divider"><Minus className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
            <ToolbarButton active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} label="Inline code"><Code className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
            <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} label="Strikethrough"><Strikethrough className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
            <ToolbarButton active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} label="Highlight"><HighlighterIcon className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
            <ColorPickerPopover editor={editor} />
            <ToolbarButton onClick={onInsertImage} label="Image"><ImageIcon className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
            {onOpenMentions && (
              <ToolbarButton onClick={onOpenMentions} label="Mention / link entity"><AtSign className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
            )}
            <ToolbarButton active={editor.isActive("details")} onClick={() => editor.chain().focus().setDetails().run()} label="Toggle"><ChevronRight className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
            <ToolbarButton onClick={doOutdent} label="Outdent"><IndentDecrease className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
            <ToolbarButton onClick={doIndent} label="Indent"><IndentIncrease className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
            {editor.isActive("taskItem") && (
              <ToolbarButton onClick={onPromoteTask} label="Add to Tasks"><ListPlus className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
            )}
            {onAddSubtask && hasSubtaskHost && (
              <ToolbarButton onClick={onAddSubtask} label="Add subtask"><GitBranch className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-1">
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} label="Undo (⌘Z)"><svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/></svg></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} label="Redo (⌘⇧Z)"><svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h4"/></svg></ToolbarButton>
        {onToggleFullscreen && (
          <ToolbarButton onClick={onToggleFullscreen} label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Maximize2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          </ToolbarButton>
        )}
        {onHide && (
          <ToolbarButton onClick={onHide} label="Hide toolbar"><EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} /></ToolbarButton>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Color / Highlight picker                                          */
/* ------------------------------------------------------------------ */
const TEXT_COLORS = [
  { label: "Default", value: null },
  { label: "Gray", value: "#8a8a8a" },
  { label: "Brown", value: "#9a6a3a" },
  { label: "Orange", value: "#e07a3c" },
  { label: "Yellow", value: "#d4a017" },
  { label: "Green", value: "#3f8a52" },
  { label: "Teal", value: "#2a8a8a" },
  { label: "Blue", value: "#3a72d6" },
  { label: "Purple", value: "#7a4fcf" },
  { label: "Pink", value: "#d44a87" },
  { label: "Red", value: "#d94b3a" },
];

const HIGHLIGHT_COLORS = [
  { label: "None", value: null },
  { label: "Yellow", value: "#fff3a3" },
  { label: "Peach", value: "#ffd9b8" },
  { label: "Pink", value: "#ffc7d8" },
  { label: "Mint", value: "#c5ecd0" },
  { label: "Sky", value: "#c6e2f5" },
  { label: "Lavender", value: "#dccdf0" },
  { label: "Sand", value: "#ece1c8" },
];

function ColorPickerPopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const active = editor.getAttributes("textStyle").color || editor.getAttributes("highlight").color;
  return ColorPickerPopoverInner(editor, open, setOpen, active);
}

function BubbleTagPicker({ tagNames, onPick }: { tagNames: string[]; onPick: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = q
    ? tagNames.filter(n => n.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : tagNames.slice(0, 8);
  const exact = !!q && tagNames.some(n => n.toLowerCase() === q.toLowerCase());
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Insert #tag"
          aria-label="Insert tag"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen(o => !o)}
          className={cn(
            "h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md transition",
            open ? "bg-primary/15 text-primary" : "hover:bg-muted/60 text-muted-foreground",
          )}
        >
          <TagIcon className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-2"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find or create #tag"
          className="h-8 text-xs"
        />
        <div className="mt-1 max-h-56 overflow-y-auto">
          {q && !exact && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(q); setOpen(false); setQ(""); }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>Create <span className="font-medium">#{q.replace(/^#+/, "")}</span></span>
            </button>
          )}
          {filtered.map(name => (
            <button
              key={name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(name); setOpen(false); setQ(""); }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60"
            >
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{name}</span>
            </button>
          ))}
          {!q && filtered.length === 0 && (
            <p className="px-2 py-2 text-[11px] text-muted-foreground">No tags yet. Start typing to create one.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColorPickerPopoverInner(editor: Editor, open: boolean, setOpen: (b: boolean | ((o: boolean) => boolean)) => void, active: any) {
  return (
    <div className="relative">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o); }}
        title="Text color & highlight"
        className={cn(
          "h-8 w-8 inline-flex items-center justify-center rounded-md transition",
          open ? "bg-primary/15 text-primary" : "hover:bg-muted/60 text-muted-foreground",
        )}
      >
        <Palette className="h-3.5 w-3.5" style={active ? { color: active } : undefined} />
      </button>
      {open && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-border/60 bg-popover/95 p-2 shadow-xl backdrop-blur-md"
        >
          <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Text</div>
          <div className="mb-2 grid grid-cols-6 gap-1">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.label}
                title={c.label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  try {
                    if (c.value === null) editor.chain().focus().unsetColor().run();
                    else editor.chain().focus().setColor(c.value).run();
                  } catch {}
                  setOpen(false);
                }}
                className="h-6 w-6 rounded-md border border-border/60 transition hover:scale-110"
                style={{
                  background: c.value ?? "transparent",
                  backgroundImage: c.value
                    ? undefined
                    : "linear-gradient(45deg,transparent 45%,hsl(var(--muted-foreground)) 45% 55%,transparent 55%)",
                }}
              />
            ))}
          </div>
          <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Highlight</div>
          <div className="grid grid-cols-6 gap-1">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.label}
                title={c.label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  try {
                    if (c.value === null) editor.chain().focus().unsetHighlight().run();
                    else editor.chain().focus().setHighlight({ color: c.value }).run();
                  } catch {}
                  setOpen(false);
                }}
                className="h-6 w-6 rounded-md border border-border/60 transition hover:scale-110"
                style={{
                  background: c.value ?? "transparent",
                  backgroundImage: c.value
                    ? undefined
                    : "linear-gradient(45deg,transparent 45%,hsl(var(--muted-foreground)) 45% 55%,transparent 55%)",
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Public component                                                  */
/* ------------------------------------------------------------------ */
export function BlockEditor({
  body,
  onChange,
  noteId,
  placeholder = "Press / for blocks · @ to mention · [[ to link",
  goal,
  onGoalChange,
  showFooter = true,
  minHeight,
  subtaskHost,
  toolbarPlacement = "bottom",
}: {
  body: string;
  onChange: (markdown: string, html: string) => void;
  noteId?: string;
  placeholder?: string;
  goal?: number | null;
  onGoalChange?: (next: number | null) => void;
  showFooter?: boolean;
  minHeight?: string;
  /** When provided, the "Add subtask" button creates a real Task linked here. */
  subtaskHost?: { kind: "task" | "note" | "project"; id: string; title?: string };
  /** Where to anchor the formatting toolbar. Defaults to bottom (sticky). */
  toolbarPlacement?: "top" | "bottom";
}) {
  const { state, addTask } = useStore();
  const navigate = useNavigate();
  const [prefs] = useEditorPrefs();
  const isMobile = useIsMobile();
  const { tags: registeredTags } = useTags();
  const refsRef = useRef<RefItem[]>([]);
  const [extraRefs, setExtraRefs] = useState<RefItem[]>([]);
  // Load notes + memories asynchronously so they appear in @-mentions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const notes = await listNotes();
        const memRes = await supabase.from("memories").select("id,title,date").limit(120);
        const noteRefs: RefItem[] = notes.slice(0, 120).map(n => ({
          id: n.id, label: n.title || "Untitled note", type: "Note",
          href: `/notes/${n.id}`, icon: FileText, insertText: n.title || "Note",
        }));
        const memRefs: RefItem[] = (memRes.data ?? []).map((m: any) => ({
          id: m.id, label: m.title || "Memory", type: "Memory",
          href: "/memories", icon: Heart, insertText: m.title || "Memory",
        }));
        if (!cancelled) setExtraRefs([...noteRefs, ...memRefs]);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const transitRefs = useMemo<RefItem[]>(() => {
    const start = addDays(new Date(), -30);
    const events = upcomingEvents(start, 120);
    return events.map(ev => ({
      id: ev.id,
      label: `${ev.glyph}  ${ev.title}`,
      type: "Cosmic",
      href: `/cosmic-flow/event/${encodeURIComponent(ev.id)}`,
      icon: Sparkles,
      insertText: ev.title,
    }));
  }, []);
  refsRef.current = useMemo(
    () => [...buildReferences(state, transitRefs), ...extraRefs],
    [state, transitRefs, extraRefs]
  );
  const lastSyncedRef = useRef<string>(body);
  const noteIdRef = useRef<string | undefined>(noteId);
  noteIdRef.current = noteId;
  const promoteRef = useRef<() => void>(() => {});
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [toolbarHidden, setToolbarHidden] = useState(false);
  const [editorFocused, setEditorFocused] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const uploadAndInsert = useCallback(async (file: File) => {
    const tid = toast.loading("Uploading image…");
    try {
      const meta = await uploadNoteImage(file);
      editorRef.current?.chain().focus().setImage({ src: meta.url, alt: file.name }).run();
      await syncInlineAttachment(noteIdRef.current, {
        id: meta.id, path: meta.path, name: meta.name,
        mimeType: meta.mime, size: meta.size,
        uploadedAt: new Date().toISOString(),
        bucket: meta.bucket, source: "note-inline",
      });
      toast.success("Image added", { id: tid });
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed", { id: tid });
    }
  }, []);

  const triggerImageUpload = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const uploadAndInsertFile = useCallback(async (file: File) => {
    const tid = toast.loading(`Uploading ${file.name}…`);
    try {
      if (file.type.startsWith("image/")) {
        const meta = await uploadNoteImage(file);
        editorRef.current?.chain().focus().setImage({ src: meta.url, alt: file.name }).run();
        await syncInlineAttachment(noteIdRef.current, {
          id: meta.id, path: meta.path, name: meta.name,
          mimeType: meta.mime, size: meta.size,
          uploadedAt: new Date().toISOString(),
          bucket: meta.bucket, source: "note-inline",
        });
      } else {
        const meta = await uploadNoteFile(file);
        editorRef.current
          ?.chain()
          .focus()
          .insertContent({ type: "fileEmbed", attrs: { src: meta.url, name: meta.name, mime: meta.mime, size: meta.size } })
          .run();
        await syncInlineAttachment(noteIdRef.current, {
          id: meta.id, path: meta.path, name: meta.name,
          mimeType: meta.mime, size: meta.size,
          uploadedAt: new Date().toISOString(),
          bucket: meta.bucket, source: "note-inline",
        });
      }
      toast.success("Attached", { id: tid });
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed", { id: tid });
    }
  }, []);

  const triggerFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Union of registered tag names and orphan tag names across data,
  // so the `#` autocomplete surfaces everything the user has ever used.
  const tagNamesRef = useRef<string[]>([]);
  tagNamesRef.current = useMemo(() => {
    const set = new Set<string>();
    registeredTags.forEach(t => set.add(t.name));
    (state.tasks ?? []).forEach(t => (t.tags ?? []).forEach(n => set.add(n)));
    (state.projects ?? []).forEach(p => ((p as any).tags ?? []).forEach((n: string) => set.add(n)));
    (state.grocery ?? []).forEach(g => (g.tags ?? []).forEach(n => set.add(n)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [registeredTags, state.tasks, state.projects, state.grocery]);

  // Debounced sync of body-extracted #tags into note.tags.
  const tagSyncTimer = useRef<number | null>(null);
  const lastTagSetRef = useRef<string>("");
  const syncBodyTags = useCallback((markdown: string) => {
    if (!noteIdRef.current) return;
    if (tagSyncTimer.current) window.clearTimeout(tagSyncTimer.current);
    tagSyncTimer.current = window.setTimeout(async () => {
      const found = extractHashtagsFromText(markdown);
      if (!found.length) return;
      const sig = found.map(s => s.toLowerCase()).sort().join(",");
      if (sig === lastTagSetRef.current) return;
      lastTagSetRef.current = sig;
      // Merge with whatever tags are already on the note.
      const existing = (state as any).notesTagsCache?.[noteIdRef.current!] ?? [];
      const merged = Array.from(new Set([...existing, ...found].map(s => s)))
        .filter((v, i, arr) => arr.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i);
      try { await updateNote(noteIdRef.current!, { tags: merged }); } catch {}
    }, 800) as unknown as number;
  }, [state]);

  const slashExtension = useMemo(() => Extension.create({
    name: "slashCommand",
    addOptions() { return { suggestion: {} as any }; },
    addKeyboardShortcuts() {
      return {
        "Mod-Shift-Enter": () => { promoteRef.current?.(); return true; },
      };
    },
    addProseMirrorPlugins() {
      return [makeSuggestion<SlashItem>(this.editor as Editor, {
        char: "/",
        pluginKey: new PluginKey("slashSuggestion"),
        getItems: (query) => {
          const q = query.toLowerCase();
          const extra: SlashItem[] = [
            {
              title: "Image",
              description: "Upload a photo from your device",
              icon: ImageIcon,
              keywords: ["image", "picture", "photo", "upload", "img", "camera"],
              command: () => triggerImageUpload(),
            },
            {
              title: "Photo",
              description: "Insert a photo inline",
              icon: ImageIcon,
              keywords: ["photo", "picture", "camera", "selfie", "img", "image"],
              command: () => triggerImageUpload(),
            },
            {
              title: "File",
              description: "Attach PDF, doc or any file (inline preview)",
              icon: Paperclip,
              keywords: ["file", "pdf", "doc", "docx", "attachment", "upload", "attach"],
              command: () => triggerFileUpload(),
            },
            {
              title: "Add to Tasks",
              description: "Promote this checkbox to a Task (⌘⇧↵)",
              icon: ListPlus,
              keywords: ["task", "todo", "promote", "add", "send"],
              command: () => promoteRef.current?.(),
            },
          ];
          return [...slashItems(), ...extra].filter(i =>
            i.title.toLowerCase().includes(q) || (i.keywords ?? []).some(k => k.includes(q))
          ).slice(0, 10);
        },
        onSelect: (item, range, editor) => {
          editor.chain().focus().deleteRange(range).run();
          item.command(editor);
        },
        render: (item, active) => (
          <span className="flex items-center gap-2.5">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border border-border/50", active ? "bg-primary/15 text-primary border-primary/30" : "bg-card text-foreground/80")}>
              <item.icon className="h-4 w-4" />
            </span>
            <span className="flex-1">
              <span className="block font-medium leading-tight">{item.title}</span>
              {item.description && <span className="block text-[11px] text-muted-foreground">{item.description}</span>}
            </span>
          </span>
        ),
      })];
    },
  }), [triggerImageUpload, triggerFileUpload]);

  /* --------------------------------------------------------------- */
  /*  Seamless toggle / bullet keymap                                */
  /*  - Enter on a toggle summary jumps into the toggle content and  */
  /*    inserts a bullet list ready to type.                         */
  /*  - Tab on a bullet item converts it into a toggle whose summary */
  /*    is the current text and whose content is a fresh bullet.     */
  /* --------------------------------------------------------------- */
  const toggleKeymap = useMemo(() => Extension.create({
    name: "toggleBulletKeymap",
    addKeyboardShortcuts() {
      return {
        Enter: ({ editor }) => {
          const { state } = editor;
          const { $from, empty } = state.selection;
          if (!empty) return false;

          // Enter inside an EMPTY paragraph inside detailsContent → exit the toggle
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === "paragraph" && $from.node(d).content.size === 0) {
              for (let dd = d - 1; dd > 0; dd--) {
                if ($from.node(dd).type.name === "detailsContent") {
                  const detailsPos = $from.before(dd - 1);
                  const details = $from.node(dd - 1);
                  if (!details || details.type.name !== "details") break;
                  const after = detailsPos + details.nodeSize;
                  editor.chain().focus()
                    .insertContentAt(after, { type: "paragraph" })
                    .setTextSelection(after + 1)
                    .run();
                  return true;
                }
              }
            }
          }

          // Enter inside a details summary -> jump into content as a bullet
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === "detailsSummary") {
              const details = $from.node(d - 1);
              if (!details || details.type.name !== "details") return false;
              const detailsStart = $from.before(d - 1);
              const detailsEnd = detailsStart + details.nodeSize;
              // Ensure open
              editor.chain().command(({ tr }) => {
                tr.setNodeMarkup(detailsStart, undefined, { ...details.attrs, open: true });
                return true;
              }).run();
              // Place cursor just inside the detailsContent and insert a bullet
              const contentNode = details.lastChild;
              if (!contentNode || contentNode.type.name !== "detailsContent") return false;
              const contentStart = detailsEnd - contentNode.nodeSize;
              const isEmpty =
                contentNode.childCount === 1 &&
                contentNode.firstChild?.type.name === "paragraph" &&
                contentNode.firstChild?.content.size === 0;
              if (isEmpty) {
                editor
                  .chain()
                  .focus()
                  .setTextSelection(contentStart + 1)
                  .toggleBulletList()
                  .run();
              } else {
                editor.chain().focus().setTextSelection(contentStart + 1).run();
              }
              return true;
            }
          }
          return false;
        },
        Tab: ({ editor }) => {
          const { state } = editor;
          const { $from, empty } = state.selection;
          if (!empty) return false;

          // Tab on a paragraph that starts with -, *, •, · → convert to bullet list then indent
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "paragraph") {
              const text = node.textContent || "";
              const m = text.match(/^([-*•·]|—)\s+/);
              if (m) {
                const pStart = $from.before(d);
                const removeFrom = pStart + 1;
                const removeTo = removeFrom + m[0].length;
                editor.chain().focus()
                  .setTextSelection({ from: removeFrom, to: removeTo })
                  .deleteSelection()
                  .toggleBulletList()
                  .run();
                if (editor.can().sinkListItem("listItem")) {
                  editor.chain().focus().sinkListItem("listItem").run();
                }
                return true;
              }
              break;
            }
          }

          // Find an enclosing listItem
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "listItem" || node.type.name === "taskItem") {
              // Prefer default nest behavior if it works
              if (editor.can().sinkListItem(node.type.name)) {
                return editor.chain().focus().sinkListItem(node.type.name).run();
              }
              // Top-level item -> convert into a toggle with bullet inside
              const text = (node.textContent || "").trim();
              const itemStart = $from.before(d);
              const itemEnd = itemStart + node.nodeSize;
              const summaryJSON = text
                ? [{ type: "text", text }]
                : [];
              const detailsJSON = {
                type: "details",
                attrs: { open: true },
                content: [
                  { type: "detailsSummary", content: summaryJSON },
                  {
                    type: "detailsContent",
                    content: [
                      {
                        type: "bulletList",
                        content: [
                          { type: "listItem", content: [{ type: "paragraph" }] },
                        ],
                      },
                    ],
                  },
                ],
              };
              editor
                .chain()
                .focus()
                .insertContentAt({ from: itemStart, to: itemEnd }, detailsJSON)
                .run();
              return true;
            }
          }
          return false;
        },
        "Shift-Tab": ({ editor }) => {
          if (editor.can().liftListItem("taskItem")) return editor.chain().focus().liftListItem("taskItem").run();
          if (editor.can().liftListItem("listItem")) return editor.chain().focus().liftListItem("listItem").run();
          return false;
        },
      };
    },
  }), []);

  const refExtension = useMemo(() => Extension.create({
    name: "refMention",
    addProseMirrorPlugins() {
      return [makeSuggestion<RefItem>(this.editor as Editor, {
        char: "@",
        pluginKey: new PluginKey("refSuggestion"),
        getItems: (query) => {
          const q = query.trim().toLowerCase();
          if (!q) return refsRef.current.slice(0, 10);
          return refsRef.current.filter(r => r.label.toLowerCase().includes(q)).slice(0, 10);
        },
        onSelect: (item, range, editor) => {
          const href = item.href || "#";
          editor.chain().focus().deleteRange(range)
            .insertContent({
              type: "text",
              text: `@${item.label}`,
              marks: [{ type: "link", attrs: { href, class: "ref-chip" } }],
            })
            .insertContent(" ")
            .run();
          const entityType = TYPE_TO_ENTITY[item.type];
          if (entityType && noteIdRef.current) {
            void linkNote(noteIdRef.current, entityType, item.id).catch(() => {});
          }
        },
        render: (item, active) => (
          <span className="flex items-center gap-2">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
              <item.icon className="h-3.5 w-3.5" />
            </span>
            <span className="flex-1">
              <span className="block font-medium leading-tight">{item.label}</span>
              <span className="block text-[11px] text-muted-foreground">{item.type}</span>
            </span>
          </span>
        ),
      })];
    },
  }), []);

  type HashItem = { name: string; create?: boolean };
  const hashtagExtension = useMemo(() => Extension.create({
    name: "hashtagMention",
    addProseMirrorPlugins() {
      return [makeSuggestion<HashItem>(this.editor as Editor, {
        char: "#",
        pluginKey: new PluginKey("hashtagSuggestion"),
        getItems: (query) => {
          const q = query.trim().toLowerCase();
          const pool = tagNamesRef.current;
          const matches = q
            ? pool.filter(n => n.toLowerCase().includes(q)).slice(0, 8)
            : pool.slice(0, 8);
          const exact = !!q && pool.some(n => n.toLowerCase() === q);
          const items: HashItem[] = matches.map(name => ({ name }));
          if (q && !exact) items.unshift({ name: query, create: true });
          return items;
        },
        onSelect: (item, range, editor) => {
          const name = item.name.trim().replace(/^#+/, "");
          if (!name) return;
          const href = `/tags/${encodeURIComponent(name)}`;
          editor.chain().focus().deleteRange(range)
            .insertContent({
              type: "text",
              text: `#${name}`,
              marks: [{ type: "link", attrs: { href, class: "tag-chip" } }],
            })
            .insertContent(" ")
            .run();
          // Persist on the note record so it appears on the tag hub immediately.
          if (noteIdRef.current) {
            const text = (editor.getText?.() ?? "") + ` #${name}`;
            const all = extractHashtagsFromText(text);
            updateNote(noteIdRef.current, { tags: all }).catch(() => {});
          }
        },
        render: (item, active) => (
          <span className="flex items-center gap-2">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
              {item.create ? <Plus className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
            </span>
            <span className="flex-1">
              <span className="block font-medium leading-tight">
                {item.create ? `Create #${item.name}` : `#${item.name}`}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {item.create ? "New tag" : "Tag"}
              </span>
            </span>
          </span>
        ),
      })];
    },
  }), []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder, emptyEditorClass: "is-editor-empty" }),
      RefLink.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: "text-primary underline-offset-2 hover:underline" } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Typography,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Details.configure({ persist: true, HTMLAttributes: { class: "cf-toggle" } }),
      DetailsSummary,
      DetailsContent,
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "cf-note-image" },
      }),
      FileEmbed,
      GlobalDragHandle.configure({
        dragHandleWidth: 20,
        scrollTreshold: 50,
        excludedTags: ["summary"],
      }),
      slashExtension,
      refExtension,
      hashtagExtension,
      toggleKeymap,
    ],
    content: bodyToHtml(body),
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none prose-headings:font-display prose-headings:font-semibold prose-a:text-primary dark:prose-invert",
          minHeight ?? "min-h-[40vh]"
        ),
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (!files.length) return false;
        event.preventDefault();
        files.forEach(f => { void uploadAndInsertFile(f); });
        return true;
      },
      handleDrop: (_view, event) => {
        const dt = (event as DragEvent).dataTransfer;
        const files = Array.from(dt?.files ?? []);
        if (!files.length) return false;
        event.preventDefault();
        files.forEach(f => { void uploadAndInsertFile(f); });
        return true;
      },
      handleClickOn: (_view, _pos, _node, _nodePos, event) => {
        const a = (event.target as HTMLElement | null)?.closest("a") as HTMLAnchorElement | null;
        if (!a) return false;
        const href = a.getAttribute("href") || "";
        if (!href || href === "#") return false;
        event.preventDefault();
        if (href.startsWith("/")) navigate(href);
        else window.open(href, "_blank", "noopener,noreferrer");
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const md = htmlToMarkdown(html);
      lastSyncedRef.current = md;
      onChange(md, html);
      syncBodyTags(md);
    },
  }, []);

  // Sync external body changes (e.g. AI replace) without losing focus
  useEffect(() => {
    if (!editor) return;
    editorRef.current = editor;
    if (body === lastSyncedRef.current) return;
    lastSyncedRef.current = body;
    const next = bodyToHtml(body);
    if (next !== editor.getHTML()) editor.commands.setContent(next, { emitUpdate: false });
  }, [body, editor]);

  // Track focus + selection so the toolbar can be context-aware.
  useEffect(() => {
    if (!editor) return;
    const onFocus = () => setEditorFocused(true);
    const onBlur = () => {
      // Defer so clicks on toolbar buttons don't immediately hide it.
      setTimeout(() => {
        const active = document.activeElement;
        const inToolbar = active && (active as HTMLElement).closest?.(".cf-editor-toolbar, .bubble-toolbar, [data-radix-popper-content-wrapper]");
        if (!inToolbar) setEditorFocused(false);
      }, 120);
    };
    const onSel = () => {
      const { from, to } = editor.state.selection;
      setHasSelection(to > from);
    };
    editor.on("focus", onFocus);
    editor.on("blur", onBlur);
    editor.on("selectionUpdate", onSel);
    return () => {
      editor.off("focus", onFocus);
      editor.off("blur", onBlur);
      editor.off("selectionUpdate", onSel);
    };
  }, [editor]);

  // Listen for global "insert into note" events (e.g. from PDF AI summary).
  useEffect(() => {
    const onInsert = (e: Event) => {
      const detail = (e as CustomEvent<{ markdown?: string; html?: string; at?: "cursor" | "end" }>).detail;
      if (!detail || !editorRef.current) return;
      const html = detail.html ?? (detail.markdown ? bodyToHtml(detail.markdown) : "");
      if (!html) return;
      const where = detail.at ?? "cursor";
      const chain = editorRef.current.chain();
      if (where === "end") chain.focus("end"); else chain.focus();
      // Insert as a new paragraph block at the insertion point.
      chain.insertContent("<p></p>" + html).run();
    };
    window.addEventListener("careflow:insert-into-note", onInsert as EventListener);
    return () => window.removeEventListener("careflow:insert-into-note", onInsert as EventListener);
  }, []);

  // Open internal links via router when user clicks
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    // Toggle fit-to-page on an inline PDF embed
    const fitBtn = el.closest("[data-toggle-fit]") as HTMLElement | null;
    if (fitBtn && editorRef.current) {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = fitBtn.closest("[data-file-embed]") as HTMLElement | null;
      if (wrapper) {
        try {
          const view = editorRef.current.view;
          const pos = view.posAtDOM(wrapper, 0);
          const resolved = editorRef.current.state.doc.resolve(pos);
          // The fileEmbed node is the parent of the rendered content.
          const nodePos = resolved.before(resolved.depth);
          const node = editorRef.current.state.doc.nodeAt(nodePos);
          if (node && node.type.name === "fileEmbed") {
            const next = !node.attrs.fit;
            editorRef.current.chain().focus().command(({ tr }) => {
              tr.setNodeMarkup(nodePos, undefined, { ...node.attrs, fit: next });
              return true;
            }).run();
          }
        } catch { /* best-effort */ }
      }
      return;
    }
    // Fullscreen PDF button inside a fileEmbed block
    const pdfBtn = el.closest("[data-fullscreen-pdf]") as HTMLElement | null;
    if (pdfBtn) {
      e.preventDefault();
      e.stopPropagation();
      const src = pdfBtn.getAttribute("data-src") || "";
      const name = pdfBtn.getAttribute("data-name") || "Document";
      if (src) openMediaLightbox({ src, name, kind: "pdf" });
      return;
    }
    // Click on an inline image opens the full-screen viewer
    if (el.tagName === "IMG" && el.closest(".ProseMirror")) {
      const img = el as HTMLImageElement;
      e.preventDefault();
      openMediaLightbox({ src: img.src, name: img.alt || "Image", kind: "image" });
      return;
    }
    // Click on a bullet/numbered marker collapses or expands its nested list
    if (el.tagName === "LI") {
      const li = el as HTMLLIElement;
      const parentList = li.parentElement;
      const isList =
        parentList?.tagName === "UL" || parentList?.tagName === "OL";
      const isTaskList = parentList?.getAttribute("data-type") === "taskList";
      const hasChildren = !!li.querySelector(":scope > ul, :scope > ol");
      if (isList && !isTaskList && hasChildren) {
        const rect = li.getBoundingClientRect();
        // Marker sits in the left padding zone
        if (e.clientX - rect.left < 24) {
          e.preventDefault();
          li.classList.toggle("cf-collapsed");
          try { (navigator as any).vibrate?.(6); } catch {}
          return;
        }
      }
    }
    // Haptic + tiny scale pulse when collapsing/expanding a toggle
    const summary = el.closest("summary");
    if (summary && summary.parentElement?.classList.contains("cf-toggle")) {
      try { (navigator as any).vibrate?.(8); } catch {}
      summary.animate(
        [{ transform: "scale(1)" }, { transform: "scale(0.985)" }, { transform: "scale(1)" }],
        { duration: 160, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
    }
    const target = el.closest("a") as HTMLAnchorElement | null;
    if (!target) return;
    const href = target.getAttribute("href") || "";
    if (href.startsWith("/")) { e.preventDefault(); navigate(href); }
  }, [navigate]);

  // Promote the currently focused task-list item into a real Task
  const promoteTaskItemToTask = useCallback(() => {
    if (!editor) return;
    const { $from } = editor.state.selection;
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (node.type.name === "taskItem") {
        const title = (node.textContent || "").trim();
        if (!title) { toast.message("Add some text first"); return; }
        // Get range of the task item so we can mark its text as a link
        const start = $from.before(d) + 1; // inside taskItem
        const end = start + node.content.size;
        void addTask({ title }).then(() => {
          if (noteIdRef.current && title) {
            // best-effort: find the just-created task and link it to this note
            // (handled by user via @ mention if needed)
          }
        });
        editor
          .chain()
          .focus()
          .setTextSelection({ from: start, to: end })
          .setLink({ href: "/anytime", class: "task-chip" } as any)
          .setTextSelection(end)
          .unsetMark("link")
          .run();
        toast.success("Added to Tasks", { description: title });
        return;
      }
    }
    toast.message("Place cursor on a checkbox first");
  }, [editor, addTask]);
  promoteRef.current = promoteTaskItemToTask;

  /** Turn the current selection into a real Task and tag the chip. */
  const promoteSelectionToTask = useCallback(() => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) { toast.message("Select some text first"); return; }
    const text = editor.state.doc.textBetween(from, to, " ").trim();
    if (!text) { toast.message("Select some text first"); return; }
    const inlineTags = extractHashtagsFromText(text);
    const cleanTitle = text.replace(HASHTAG_RE, " ").replace(/\s+/g, " ").trim();
    void addTask({ title: cleanTitle || text, tags: inlineTags });
    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .setLink({ href: "/anytime", class: "task-chip" } as any)
      .setTextSelection(to)
      .unsetMark("link")
      .run();
    toast.success("Added to Tasks", { description: cleanTitle || text });
  }, [editor, addTask]);

  /** Insert a #tag chip at the end of the selection without overwriting it. */
  const insertTagAtSelection = useCallback((name: string) => {
    if (!editor || !name.trim()) return;
    const cleaned = name.trim().replace(/^#+/, "");
    const href = `/tags/${encodeURIComponent(cleaned)}`;
    const { to } = editor.state.selection;
    editor
      .chain()
      .focus()
      .setTextSelection(to)
      .insertContent(" ")
      .insertContent({
        type: "text",
        text: `#${cleaned}`,
        marks: [{ type: "link", attrs: { href, class: "tag-chip" } }],
      })
      .insertContent(" ")
      .run();
    if (noteIdRef.current) {
      const text = (editor.getText?.() ?? "") + ` #${cleaned}`;
      updateNote(noteIdRef.current, { tags: extractHashtagsFromText(text) }).catch(() => {});
    }
  }, [editor]);

  /** Quick-trigger the @-mention picker from a toolbar button. */
  const openMentions = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent("@").run();
  }, [editor]);

  /** Create a real subtask Task linked back to the host, and insert a chip. */
  const addSubtaskNow = useCallback(async () => {
    if (!editor || !subtaskHost) return;
    const title = window.prompt("Subtask title", "") ?? "";
    const clean = title.trim();
    if (!clean) return;
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) { toast.error("Sign in first"); return; }
      const insertPayload: any = { user_id: uid, title: clean, done: false, priority: "medium", area: "Personal" };
      if (subtaskHost.kind === "task") insertPayload.parent_task_id = subtaskHost.id;
      if (subtaskHost.kind === "project") insertPayload.project_id = subtaskHost.id;
      const { data, error } = await supabase.from("tasks").insert(insertPayload).select().single();
      if (error || !data) throw error;
      const newId = data.id as string;
      // Insert chip in editor
      editor.chain().focus().insertContent({
        type: "text",
        text: `☐ ${clean}`,
        marks: [{ type: "link", attrs: { href: `/anytime`, class: "task-chip" } }],
      }).insertContent(" ").run();
      // If host is a note, also link via note_links so it surfaces in chips/sidebar
      if (subtaskHost.kind === "note") {
        await linkNote(subtaskHost.id, "task", newId).catch(() => {});
      }
      toast.success("Subtask added", { description: clean });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not add subtask");
    }
  }, [editor, subtaskHost]);

  return (
    <div
      onClick={handleClick}
      onDragEnter={(e) => { if (Array.from(e.dataTransfer?.items ?? []).some(i => i.kind === "file")) { setDragActive(true); } }}
      onDragOver={(e) => { if (Array.from(e.dataTransfer?.items ?? []).some(i => i.kind === "file")) { e.preventDefault(); setDragActive(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragActive(false); }}
      onDrop={(e) => {
        const files = Array.from(e.dataTransfer?.files ?? []);
        if (files.length) {
          e.preventDefault();
          files.forEach((f) => { void uploadAndInsertFile(f); });
        }
        setDragActive(false);
      }}
      className={cn(
        "block-editor",
        "relative rounded-2xl transition",
        dragActive && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
        `editor-theme-${prefs.theme}`,
        `editor-density-${prefs.density}`,
        fullscreen && "fixed inset-0 z-[90] overflow-auto bg-background p-4 sm:p-8",
      )}
      style={{
        maxWidth: fullscreen ? "min(960px, 100%)" : WIDTH_PX[prefs.width],
        marginInline: 0,
        ["--editor-font-scale" as any]: String(prefs.fontScale),
        ...(prefs.theme === "custom" ? {
          ["--editor-custom-bg" as any]: prefs.customBg,
          ["--editor-custom-fg" as any]: prefs.customFg,
        } : {}),
      } as React.CSSProperties}
    >
      {/* Bottom toolbar moved below EditorContent (context-aware). */}
      {editor && (
        <BubbleMenu
          editor={editor}
          className="bubble-toolbar flex max-w-[calc(100vw-1.5rem)] items-center gap-0.5 overflow-x-auto rounded-2xl border border-border/40 bg-popover/95 px-1 py-1 shadow-xl backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold"><Bold className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic"><Italic className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Underline"><UnderlineIcon className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} label="Strike"><Strikethrough className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} label="Code"><Code className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} label="Highlight"><HighlighterIcon className="h-3.5 w-3.5" /></ToolbarButton>
          <ColorPickerPopover editor={editor} />
          <span className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="H1"><Heading1 className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="H2"><Heading2 className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Quote"><Quote className="h-3.5 w-3.5" /></ToolbarButton>
          <span className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton
            onClick={() => {
              if (editor.can().liftListItem("taskItem")) return editor.chain().focus().liftListItem("taskItem").run();
              if (editor.can().liftListItem("listItem")) editor.chain().focus().liftListItem("listItem").run();
            }}
            label="Outdent"
          ><IndentDecrease className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton
            onClick={() => {
              if (editor.can().sinkListItem("taskItem")) return editor.chain().focus().sinkListItem("taskItem").run();
              if (editor.can().sinkListItem("listItem")) editor.chain().focus().sinkListItem("listItem").run();
            }}
            label="Indent"
          ><IndentIncrease className="h-3.5 w-3.5" /></ToolbarButton>
          <span className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton
            active={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            label="Convert to checklist"
          ><CheckSquare className="h-3.5 w-3.5" /></ToolbarButton>
          {(editor.isActive("details") || editor.isActive("detailsSummary") || editor.isActive("detailsContent")) ? (
            <ToolbarButton
              onClick={() => {
                // Toggle the open state of the enclosing <details>
                const { state } = editor;
                const { $from } = state.selection;
                for (let d = $from.depth; d > 0; d--) {
                  if ($from.node(d).type.name === "details") {
                    const pos = $from.before(d);
                    const node = $from.node(d);
                    editor.chain().focus().command(({ tr }) => {
                      tr.setNodeMarkup(pos, undefined, { ...node.attrs, open: !node.attrs.open });
                      return true;
                    }).run();
                    return;
                  }
                }
              }}
              label="Hide / show toggle contents"
            ><ChevronDown className="h-3.5 w-3.5" /></ToolbarButton>
          ) : (
            <ToolbarButton
              onClick={() => editor.chain().focus().setDetails().run()}
              label="Wrap in toggle"
            ><ChevronRight className="h-3.5 w-3.5" /></ToolbarButton>
          )}
          <ToolbarButton onClick={promoteSelectionToTask} label="Add selection to Tasks">
            <ListPlus className="h-3.5 w-3.5" />
          </ToolbarButton>
          <BubbleTagPicker
            tagNames={tagNamesRef.current}
            onPick={insertTagAtSelection}
          />
          <ToolbarButton
            active={editor.isActive("link")}
            onClick={() => {
              const previous = editor.getAttributes("link").href;
              const url = window.prompt("Link URL", previous ?? "https://");
              if (url === null) return;
              if (url === "") editor.chain().focus().unsetLink().run();
              else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            }}
            label="Link"
          ><LinkIcon className="h-3.5 w-3.5" /></ToolbarButton>
          {editor.isActive("taskItem") && (
            <>
              <span className="mx-1 h-4 w-px bg-border" />
              <ToolbarButton onClick={promoteTaskItemToTask} label="Add to Tasks">
                <ListPlus className="h-3.5 w-3.5" />
              </ToolbarButton>
            </>
          )}
        </BubbleMenu>
      )}
      {editor && !isMobile && toolbarPlacement === "top" && (
        <div
          className={cn(
            "mb-2 transition-all duration-200",
            (editorFocused || hasSelection) && !toolbarHidden
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-1 pointer-events-none h-0 overflow-hidden mb-0",
          )}
        >
          <Toolbar
            editor={editor}
            onPromoteTask={promoteTaskItemToTask}
            onInsertImage={triggerImageUpload}
            isFullscreen={fullscreen}
            onToggleFullscreen={() => setFullscreen(f => !f)}
            onHide={() => setToolbarHidden(true)}
            onAddSubtask={addSubtaskNow}
            onOpenMentions={openMentions}
            hasSubtaskHost={!!subtaskHost}
          />
        </div>
      )}
      {editor && !isMobile && toolbarPlacement === "top" && toolbarHidden && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setToolbarHidden(false); }}
            aria-label="Show toolbar"
            title="Show toolbar"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
          >
            <Eye className="h-3.5 w-3.5" /> Show toolbar
          </button>
        </div>
      )}
      <EditorContent editor={editor} className="pl-3 sm:pl-4" />
      {editor && !isMobile && toolbarPlacement === "bottom" && (
        <div
          className={cn(
            "sticky bottom-2 mt-3 transition-all duration-200",
            (editorFocused || hasSelection) && !toolbarHidden
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-1 pointer-events-none",
          )}
        >
          <Toolbar
            editor={editor}
            onPromoteTask={promoteTaskItemToTask}
            onInsertImage={triggerImageUpload}
            isFullscreen={fullscreen}
            onToggleFullscreen={() => setFullscreen(f => !f)}
            onHide={() => setToolbarHidden(true)}
            onAddSubtask={addSubtaskNow}
            onOpenMentions={openMentions}
            hasSubtaskHost={!!subtaskHost}
          />
        </div>
      )}
      {editor && !isMobile && toolbarPlacement === "bottom" && toolbarHidden && (
        <div className="sticky bottom-2 mt-2 flex justify-end">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setToolbarHidden(false); }}
            aria-label="Show toolbar"
            title="Show toolbar"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
          >
            <Eye className="h-3.5 w-3.5" /> Show toolbar
          </button>
        </div>
      )}
      {fullscreen && noteId && (
        <aside className="fixed right-4 top-20 z-[95] hidden h-[calc(100vh-6rem)] w-80 overflow-y-auto rounded-2xl border border-border/60 bg-card/95 p-3 shadow-2xl backdrop-blur lg:block">
          <NoteLinksSidebar noteId={noteId} />
        </aside>
      )}
      {editor && isMobile && (
        <div className="no-swipe mt-3">
          <Toolbar
            editor={editor}
            onPromoteTask={promoteTaskItemToTask}
            onInsertImage={triggerImageUpload}
            isFullscreen={fullscreen}
            onToggleFullscreen={() => setFullscreen(f => !f)}
            onAddSubtask={addSubtaskNow}
            onOpenMentions={openMentions}
            hasSubtaskHost={!!subtaskHost}
          />
        </div>
      )}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          files.forEach(f => { void uploadAndInsert(f); });
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          files.forEach(f => { void uploadAndInsertFile(f); });
          e.target.value = "";
        }}
      />
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-primary/5 backdrop-blur-[2px]">
          <div className="rounded-full border border-primary/40 bg-popover/95 px-4 py-2 text-sm font-medium text-primary shadow-lg">
            Drop image to upload
          </div>
        </div>
      )}
      {showFooter && (
        <WordCountFooter body={body} goal={goal ?? null} onGoalChange={onGoalChange} />
      )}
    </div>
  );
}