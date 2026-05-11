import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  props?: { title?: string; body?: string };
  onChange?: (next: Record<string, any>) => void;
}

export function NoteWidget({ props, onChange }: Props) {
  const [title, setTitle] = useState(props?.title ?? "Note");
  const [body, setBody] = useState(props?.body ?? "");

  useEffect(() => {
    setTitle(props?.title ?? "Note");
    setBody(props?.body ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounced save
  useEffect(() => {
    const id = setTimeout(() => {
      onChange?.({ title, body });
    }, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body]);

  return (
    <div className="flex h-full flex-col gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title"
        className="h-8 border-none bg-transparent px-0 text-base font-display font-semibold focus-visible:ring-0"
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write something soft…"
        className="min-h-0 flex-1 resize-none border-none bg-muted/30 text-sm focus-visible:ring-1"
      />
    </div>
  );
}