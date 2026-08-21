/**
 * Tag-scoped custom fields as planner table columns.
 *
 * A tag can define typed fields (`tag_fields`) and every item wearing that tag
 * can store a value (`item_field_values`). When a table view narrows to one or
 * more tags, those tags' fields become real, sortable, editable columns.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTags } from "@/hooks/use-tags";
import { listTagFields, setItemFieldValue, type TagField } from "@/lib/tag-fields";

export const FIELD_COL_PREFIX = "field:";

export const fieldColumnId = (tagId: string, key: string) => `${FIELD_COL_PREFIX}${tagId}:${key}`;

export function parseFieldColumn(id: string): { tagId: string; key: string } | null {
  if (!id.startsWith(FIELD_COL_PREFIX)) return null;
  const rest = id.slice(FIELD_COL_PREFIX.length);
  const at = rest.indexOf(":");
  if (at < 0) return null;
  return { tagId: rest.slice(0, at), key: rest.slice(at + 1) };
}

export interface FieldColumn {
  id: string;
  label: string;
  tagName: string;
  field: TagField;
}

const valueKey = (entityId: string, tagId: string, key: string) => `${entityId}:${tagId}:${key}`;

/**
 * Fields belonging to the given tag names, plus the stored values for every
 * entity that carries them. One query per tag set — not per row.
 */
export function useFieldColumns(tagNames: string[], entityType = "task") {
  const { tags } = useTags();
  const [fields, setFields] = useState<TagField[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const wanted = useMemo(
    () => tagNames.map(n => n.toLowerCase()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tagNames.join("|").toLowerCase()],
  );

  const activeTags = useMemo(
    () => tags.filter(t => wanted.includes(t.name.toLowerCase())),
    [tags, wanted],
  );
  const tagIds = useMemo(() => activeTags.map(t => t.id).sort(), [activeTags]);
  const tagIdKey = tagIds.join("|");

  const reload = useCallback(async () => {
    if (!tagIds.length) { setFields([]); setValues({}); return; }
    try {
      const [schema, rows] = await Promise.all([
        listTagFields(tagIds),
        supabase
          .from("item_field_values" as any)
          .select("entity_id,tag_id,field_key,value")
          .eq("entity_type", entityType)
          .in("tag_id", tagIds)
          .then(r => (r.data ?? []) as any[]),
      ]);
      setFields(schema);
      const map: Record<string, unknown> = {};
      for (const r of rows) map[valueKey(r.entity_id, r.tag_id, r.field_key)] = r.value;
      setValues(map);
    } catch (e) {
      console.warn("useFieldColumns failed", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagIdKey, entityType]);

  useEffect(() => { void reload(); }, [reload]);

  const columns: FieldColumn[] = useMemo(() => {
    const nameOf = new Map(activeTags.map(t => [t.id, t.name]));
    return fields
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
      .map(f => ({
        id: fieldColumnId(f.tagId, f.key),
        label: f.label,
        tagName: nameOf.get(f.tagId) ?? "",
        field: f,
      }));
  }, [fields, activeTags]);

  const valueFor = useCallback(
    (entityId: string, colId: string): unknown => {
      const parsed = parseFieldColumn(colId);
      if (!parsed) return undefined;
      return values[valueKey(entityId, parsed.tagId, parsed.key)];
    },
    [values],
  );

  const save = useCallback(
    async (entityId: string, colId: string, value: unknown) => {
      const parsed = parseFieldColumn(colId);
      if (!parsed) return;
      setValues(v => ({ ...v, [valueKey(entityId, parsed.tagId, parsed.key)]: value }));
      try {
        await setItemFieldValue(entityType, entityId, parsed.tagId, parsed.key, value);
      } catch (e) {
        console.warn("setItemFieldValue failed", e);
      }
    },
    [entityType],
  );

  /** Comparable value so a field column can drive the table sort. */
  const sortValue = useCallback(
    (entityId: string, colId: string): string | number => {
      const raw = valueFor(entityId, colId);
      if (raw === null || raw === undefined || raw === "") return "\uffff";
      if (typeof raw === "number") return raw;
      if (typeof raw === "boolean") return raw ? 0 : 1;
      return String(raw).toLowerCase();
    },
    [valueFor],
  );

  return { columns, valueFor, save, sortValue, reload, byId: (id: string) => columns.find(c => c.id === id) };
}
