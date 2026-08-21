/**
 * Renders the custom fields contributed by an item's supertags and lets the
 * user fill them in. Values save immediately to `item_field_values`.
 */
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTags } from "@/hooks/use-tags";
import { listTagFields, useItemFieldValues, type TagField } from "@/lib/tag-fields";
import { matchTags } from "@/lib/supertag";
import { readableTextOn } from "@/lib/tags";
import { cn } from "@/lib/utils";

interface Props {
  entityType?: string;
  entityId: string | null;
  tags?: string[] | null;
  className?: string;
}

export function ItemFieldsSection({ entityType = "task", entityId, tags, className }: Props) {
  const { tags: allTags } = useTags();
  const [fields, setFields] = useState<TagField[]>([]);
  const { values, save } = useItemFieldValues(entityType, entityId);

  const matched = useMemo(() => matchTags(allTags, tags), [allTags, tags]);
  const tagIds = useMemo(() => matched.map(t => t.id).sort().join(","), [matched]);

  useEffect(() => {
    let alive = true;
    if (!tagIds) { setFields([]); return; }
    void listTagFields(tagIds.split(","))
      .then(f => { if (alive) setFields(f); })
      .catch(() => { if (alive) setFields([]); });
    return () => { alive = false; };
  }, [tagIds]);

  if (!entityId || fields.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {matched.map(tag => {
        const own = fields.filter(f => f.tagId === tag.id);
        if (!own.length) return null;
        return (
          <div key={tag.id} className="space-y-2 rounded-xl border border-border/60 bg-card/50 p-3">
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: tag.color, color: readableTextOn(tag.color) }}
            >
              {tag.name}
            </span>
            {own.map(f => {
              const key = `${tag.id}:${f.key}`;
              const val = values[key];
              return (
                <div key={f.id} className="flex items-center justify-between gap-3">
                  <Label htmlFor={key} className="text-[11px] text-muted-foreground">
                    {f.label}{f.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <div className="w-44">
                    {f.type === "checkbox" ? (
                      <Switch id={key} checked={!!val} onCheckedChange={v => void save(tag.id, f.key, v)} />
                    ) : f.type === "select" && f.options.length ? (
                      <Select value={(val as string) ?? ""} onValueChange={v => void save(tag.id, f.key, v)}>
                        <SelectTrigger id={key} className="h-8 text-xs"><SelectValue placeholder="Choose" /></SelectTrigger>
                        <SelectContent>
                          {f.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={key}
                        className="h-8 text-xs"
                        type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "url" ? "url" : "text"}
                        defaultValue={(val as string | number | undefined) ?? ""}
                        onBlur={e => void save(tag.id, f.key, f.type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
