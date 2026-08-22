/**
 * The dropdown behind a supertag chip: fill in that tag's fields for this
 * item without leaving the row you're on.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTags } from "@/hooks/use-tags";
import { listTagFields, useItemFieldValues, type TagField } from "@/lib/tag-fields";
import { cn } from "@/lib/utils";

export function TagFieldsPopover({ tagName, entityType = "task", entityId, children, className }: {
  tagName: string;
  entityType?: string;
  entityId: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { tags } = useTags();
  const tag = useMemo(
    () => tags.find(t => t.name.toLowerCase() === tagName.toLowerCase()) ?? null,
    [tags, tagName],
  );
  const [fields, setFields] = useState<TagField[]>([]);
  const { values, save } = useItemFieldValues(entityType, entityId);

  useEffect(() => {
    let alive = true;
    if (!tag) { setFields([]); return; }
    void listTagFields([tag.id])
      .then(f => { if (alive) setFields(f); })
      .catch(() => { if (alive) setFields([]); });
    return () => { alive = false; };
  }, [tag]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={e => { e.preventDefault(); e.stopPropagation(); }}
          aria-label={`${tagName} fields`}
          className={cn("inline-flex items-center gap-0.5", className)}
        >
          {children}
          <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-2 p-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold">#{tag?.name ?? tagName}</span>
          {tag && (
            <Link
              to={`/tags/${encodeURIComponent(tag.name)}`}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="h-3 w-3" /> Tag settings
            </Link>
          )}
        </div>

        {fields.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            No fields yet. Add fields on the tag page to make this a supertag.
          </p>
        ) : fields.map(f => {
          const key = `${f.tagId}:${f.key}`;
          const val = values[key];
          return (
            <div key={f.id} className="flex items-center justify-between gap-2">
              <Label htmlFor={key} className="text-[11px] text-muted-foreground">{f.label}</Label>
              <div className="w-32">
                {f.type === "checkbox" ? (
                  <Switch id={key} checked={!!val} onCheckedChange={v => void save(f.tagId, f.key, v)} />
                ) : f.type === "select" && f.options.length ? (
                  <Select value={(val as string) ?? ""} onValueChange={v => void save(f.tagId, f.key, v)}>
                    <SelectTrigger id={key} className="h-7 text-[11px]"><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent>
                      {f.options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={key}
                    className="h-7 text-[11px]"
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    defaultValue={(val as string | number | undefined) ?? ""}
                    onBlur={e => void save(f.tagId, f.key, f.type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
