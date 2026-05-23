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
import {
  Heading1, Heading2, Heading3, Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, List, ListOrdered, CheckSquare, Quote, Minus, Link as LinkIcon, Highlighter as HighlighterIcon, Type,
  CheckCircle2, FileText, Folder, Target, Users, BookOpen, Utensils, Sparkles, CalendarDays,
  ChevronRight, Palette, ListPlus,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { linkNote, type EntityType } from "@/lib/note-links";
import { useEditorPrefs, WIDTH_PX } from "@/lib/editor-prefs";

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

export function bodyToHtml(body: string): string {
  if (!body) return "";
  const trimmed = body.trim();
  // Heuristic: if it starts with an HTML tag, treat as HTML already.
  if (/^<[a-zA-Z!]/.test(trimmed)) return trimmed;
  return marked.parse(body, { async: false, gfm: true, breaks: false }) as string;
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

function buildReferences(state: ReturnType<typeof useStore>["state"]): RefItem[] {
  const items: RefItem[] = [];
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
        "h-8 w-8 inline-flex items-center justify-center rounded-md transition",
        active ? "bg-primary/15 text-primary" : "hover:bg-muted/60 text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onPromoteTask }: { editor: Editor; onPromoteTask: () => void }) {
  if (!editor) return null;
  const setLink = () => {
    const previous = editor.getAttributes("link").href;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  return (
    <div className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-0.5 rounded-xl border border-border/60 bg-card/80 p-1 backdrop-blur-md shadow-sm">
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
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bullet list"><List className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list"><ListOrdered className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} label="To-do list"><CheckSquare className="h-4 w-4" /></ToolbarButton>
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
}: {
  body: string;
  onChange: (markdown: string, html: string) => void;
  noteId?: string;
  placeholder?: string;
}) {
  const { state, addTask } = useStore();
  const navigate = useNavigate();
  const [prefs] = useEditorPrefs();
  const refsRef = useRef<RefItem[]>([]);
  refsRef.current = useMemo(() => buildReferences(state), [state]);
  const lastSyncedRef = useRef<string>(body);
  const noteIdRef = useRef<string | undefined>(noteId);
  noteIdRef.current = noteId;
  const promoteRef = useRef<() => void>(() => {});

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
          const extra: SlashItem[] = [{
            title: "Add to Tasks",
            description: "Promote this checkbox to a Task (⌘⇧↵)",
            icon: ListPlus,
            keywords: ["task", "todo", "promote", "add", "send"],
            command: () => promoteRef.current?.(),
          }];
          return [...slashItems(), ...extra].filter(i =>
            i.title.toLowerCase().includes(q) || (i.keywords ?? []).some(k => k.includes(q))
          ).slice(0, 8);
        },
        onSelect: (item, range, editor) => {
          editor.chain().focus().deleteRange(range).run();
          item.command(editor);
        },
        render: (item, active) => (
          <span className="flex items-center gap-2">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
              <item.icon className="h-3.5 w-3.5" />
            </span>
            <span className="font-medium">{item.title}</span>
          </span>
        ),
      })];
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
      GlobalDragHandle.configure({
        dragHandleWidth: 20,
        scrollTreshold: 50,
        excludedTags: ["summary"],
      }),
      slashExtension,
      refExtension,
    ],
    content: bodyToHtml(body),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[40vh] prose-headings:font-display prose-headings:font-semibold prose-a:text-primary dark:prose-invert",
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
    },
  }, []);

  // Sync external body changes (e.g. AI replace) without losing focus
  useEffect(() => {
    if (!editor) return;
    if (body === lastSyncedRef.current) return;
    lastSyncedRef.current = body;
    const next = bodyToHtml(body);
    if (next !== editor.getHTML()) editor.commands.setContent(next, { emitUpdate: false });
  }, [body, editor]);

  // Open internal links via router when user clicks
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest("a") as HTMLAnchorElement | null;
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
          .run();
        toast.success("Added to Tasks", { description: title });
        return;
      }
    }
    toast.message("Place cursor on a checkbox first");
  }, [editor, addTask]);
  promoteRef.current = promoteTaskItemToTask;

  return (
    <div
      onClick={handleClick}
      className={cn(
        "block-editor",
        `editor-theme-${prefs.theme}`,
        `editor-density-${prefs.density}`,
      )}
      style={{
        maxWidth: WIDTH_PX[prefs.width],
        marginInline: prefs.width === "full" ? undefined : "auto",
        ["--editor-font-scale" as any]: String(prefs.fontScale),
        ...(prefs.theme === "custom" ? {
          ["--editor-custom-bg" as any]: prefs.customBg,
          ["--editor-custom-fg" as any]: prefs.customFg,
        } : {}),
      } as React.CSSProperties}
    >
      {editor && <Toolbar editor={editor} onPromoteTask={promoteTaskItemToTask} />}
      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 rounded-xl border border-border/60 bg-popover/95 px-1 py-1 shadow-lg backdrop-blur-md"
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
      <EditorContent editor={editor} />
    </div>
  );
}