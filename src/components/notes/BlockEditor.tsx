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
import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import GlobalDragHandle from "tiptap-extension-global-drag-handle";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { marked } from "marked";
import TurndownService from "turndown";
import Image from "@tiptap/extension-image";
import { uploadNoteImage } from "@/lib/note-images";
import {
  Heading1, Heading2, Heading3, Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, List, ListOrdered, CheckSquare, Quote, Minus, Link as LinkIcon, Highlighter as HighlighterIcon, Type,
  CheckCircle2, FileText, Folder, Target, Users, BookOpen, Utensils, Sparkles, CalendarDays,
  ChevronRight, Palette, ListPlus, Hash, Tag as TagIcon, Plus, Image as ImageIcon,
  IndentIncrease, IndentDecrease, ChevronDown,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { linkNote, type EntityType } from "@/lib/note-links";
import { useEditorPrefs, WIDTH_PX } from "@/lib/editor-prefs";
import { WordCountFooter } from "@/components/notes/WordCountFooter";
import { useTags } from "@/hooks/use-tags";
import { useIsMobile } from "@/hooks/use-mobile";
import { updateNote } from "@/lib/notes";
import { upcomingEvents } from "@/lib/cosmic/events";
import { addDays, format as formatDate } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

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
  if (!items.length) return <div className="rounded-xl border border-border/60 bg-popover p-3 text-xs text-muted-foreground shadow-lg">No matches</div>;
  return (
    <div className="max-h-72 w-72 overflow-y-auto rounded-xl border border-border/60 bg-popover p-1.5 shadow-xl">
      {items.map((it, i) => (
        <button
          key={i}
          onMouseDown={(e) => { e.preventDefault(); onSelect(it); }}
          onMouseEnter={() => setActive(i)}
          className={cn("w-full rounded-lg px-2 py-1.5 text-left text-sm transition", i === active ? "bg-muted" : "hover:bg-muted/50")}
        >
          {render(it, i === active)}
        </button>
      ))}
    </div>
  );
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
}) {
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
          component = new ReactRenderer(FloatingMenu as any, {
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
      className={cn(
        "h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md transition",
        active ? "bg-primary/15 text-primary" : "hover:bg-muted/60 text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onPromoteTask, onInsertImage }: { editor: Editor; onPromoteTask: () => void; onInsertImage: () => void }) {
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
    // Fallback: insert a tab character
    editor.chain().focus().insertContent("\t").run();
  };
  const doOutdent = () => {
    if (editor.can().liftListItem("taskItem")) return editor.chain().focus().liftListItem("taskItem").run();
    if (editor.can().liftListItem("listItem")) return editor.chain().focus().liftListItem("listItem").run();
  };
  return (
    <div className="cf-editor-toolbar z-10 mb-3 flex w-full max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-border/60 bg-card/90 p-1 backdrop-blur-md shadow-sm sm:sticky sm:top-2 sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ToolbarButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="Heading 1"><Heading1 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Heading 2"><Heading2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Heading 3"><Heading3 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()} label="Paragraph"><Type className="h-4 w-4" /></ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold"><Bold className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic"><Italic className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Underline"><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} label="Strikethrough"><Strikethrough className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} label="Code"><Code className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} label="Highlight"><HighlighterIcon className="h-4 w-4" /></ToolbarButton>
      <ColorPickerPopover editor={editor} />
      <ToolbarButton active={editor.isActive("link")} onClick={setLink} label="Link"><LinkIcon className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={onInsertImage} label="Insert image"><ImageIcon className="h-4 w-4" /></ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bullet list"><List className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list"><ListOrdered className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} label="To-do list"><CheckSquare className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={doOutdent} label="Outdent (Shift+Tab)"><IndentDecrease className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={doIndent} label="Indent (Tab)"><IndentIncrease className="h-4 w-4" /></ToolbarButton>
      {editor.isActive("taskItem") && (
        <ToolbarButton onClick={onPromoteTask} label="Add this checkbox to Tasks"><ListPlus className="h-4 w-4" /></ToolbarButton>
      )}
      <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Quote"><Quote className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Divider"><Minus className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton
        active={editor.isActive("details")}
        onClick={() => editor.chain().focus().setDetails().run()}
        label="Toggle (nest indented content)"
      ><ChevronRight className="h-4 w-4" /></ToolbarButton>
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
}: {
  body: string;
  onChange: (markdown: string, html: string) => void;
  noteId?: string;
  placeholder?: string;
  goal?: number | null;
  onGoalChange?: (next: number | null) => void;
  showFooter?: boolean;
  minHeight?: string;
}) {
  const { state, addTask } = useStore();
  const navigate = useNavigate();
  const [prefs] = useEditorPrefs();
  const { tags: registeredTags } = useTags();
  const refsRef = useRef<RefItem[]>([]);
  const transitRefs = useMemo<RefItem[]>(() => {
    const start = addDays(new Date(), -30);
    const events = upcomingEvents(start, 120);
    return events.map(ev => ({
      id: ev.id,
      label: `${ev.glyph}  ${ev.title}`,
      type: `Transit · ${formatDate(new Date(ev.date), "MMM d")}`,
      href: `/cosmic-flow/event/${encodeURIComponent(ev.id)}`,
      icon: Sparkles,
      insertText: ev.title,
    }));
  }, []);
  refsRef.current = useMemo(() => buildReferences(state, transitRefs), [state, transitRefs]);
  const lastSyncedRef = useRef<string>(body);
  const noteIdRef = useRef<string | undefined>(noteId);
  noteIdRef.current = noteId;
  const promoteRef = useRef<() => void>(() => {});
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  const uploadAndInsert = useCallback(async (file: File) => {
    const tid = toast.loading("Uploading image…");
    try {
      const url = await uploadNoteImage(file);
      editorRef.current?.chain().focus().setImage({ src: url, alt: file.name }).run();
      toast.success("Image added", { id: tid });
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed", { id: tid });
    }
  }, []);

  const triggerImageUpload = useCallback(() => {
    imageInputRef.current?.click();
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
              description: "Upload from your device",
              icon: ImageIcon,
              keywords: ["image", "picture", "photo", "upload", "img"],
              command: () => triggerImageUpload(),
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
  }), [triggerImageUpload]);

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
        const files = Array.from(event.clipboardData?.files ?? []).filter(f => f.type.startsWith("image/"));
        if (!files.length) return false;
        event.preventDefault();
        files.forEach(f => { void uploadAndInsert(f); });
        return true;
      },
      handleDrop: (_view, event) => {
        const dt = (event as DragEvent).dataTransfer;
        const files = Array.from(dt?.files ?? []).filter(f => f.type.startsWith("image/"));
        if (!files.length) return false;
        event.preventDefault();
        files.forEach(f => { void uploadAndInsert(f); });
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

  // Open internal links via router when user clicks
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
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

  return (
    <div
      onClick={handleClick}
      onDragEnter={(e) => { if (Array.from(e.dataTransfer?.items ?? []).some(i => i.kind === "file")) { setDragActive(true); } }}
      onDragOver={(e) => { if (Array.from(e.dataTransfer?.items ?? []).some(i => i.kind === "file")) { e.preventDefault(); setDragActive(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragActive(false); }}
      onDrop={() => setDragActive(false)}
      className={cn(
        "block-editor",
        "relative rounded-2xl transition",
        dragActive && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
        `editor-theme-${prefs.theme}`,
        `editor-density-${prefs.density}`,
      )}
      style={{
        maxWidth: WIDTH_PX[prefs.width],
        marginInline: 0,
        ["--editor-font-scale" as any]: String(prefs.fontScale),
        ...(prefs.theme === "custom" ? {
          ["--editor-custom-bg" as any]: prefs.customBg,
          ["--editor-custom-fg" as any]: prefs.customFg,
        } : {}),
      } as React.CSSProperties}
    >
      {editor && <Toolbar editor={editor} onPromoteTask={promoteTaskItemToTask} onInsertImage={triggerImageUpload} />}
      {editor && (
        <BubbleMenu
          editor={editor}
          className="bubble-toolbar flex items-center gap-0.5 rounded-2xl border border-border/40 bg-popover/95 px-1 py-1 shadow-xl backdrop-blur-xl"
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
            active={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            label="Convert to checklist"
          ><CheckSquare className="h-3.5 w-3.5" /></ToolbarButton>
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
      <EditorContent editor={editor} className="pl-3 sm:pl-4" />
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