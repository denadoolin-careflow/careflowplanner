/**
 * Tag-field filtering.
 *
 * When a planner view is narrowed to a tag, that tag's custom fields become
 * filterable: "#appointment where Provider is Dr. Lin", "#med-refill where
 * Refilled is unchecked". Values live in `item_field_values`, so we load the
 * slice for the active tags once and answer predicates from memory.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTags } from "@/hooks/use-tags";
import { listTagFields, type TagField } from "@/lib/tag-fields";
import type { PlannerFeedItem } from "./feed";
import type { WeekFilterState } from "./week-filters";

export type FieldFilterOp = "is" | "contains" | "gte" | "lte" | "checked" | "unchecked" | "empty" | "set";

export interface FieldFilter {
  tagId: string;
  fieldKey: string;
  op: FieldFilterOp;
  value?: string;
}

export const FIELD_OP_LABEL: Record<FieldFilterOp, string> = {
  is: "is",
  contains: "contains",
  gte: "at least",
  lte: "at most",
  checked: "is checked",
  unchecked: "is unchecked",
  empty: "is empty",
  set: "has a value",
};

/** Operators that make sense for each field type. */
export function opsForType(type: TagField["type"]): FieldFilterOp[] {
  switch (type) {
    case "checkbox": return ["checked", "unchecked"];
    case "number": return ["is", "gte", "lte", "empty", "set"];
    case "date": return ["is", "gte", "lte", "empty", "set"];
    case "select": return ["is", "empty", "set"];
    default: return ["contains", "is", "empty", "set"];
  }
}

const asString = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export function matchesFieldFilter(value: unknown, f: FieldFilter): boolean {
  const s = asString(value).toLowerCase();
  const want = (f.value ?? "").toLowerCase();
  switch (f.op) {
    case "checked": return value === true;
    case "unchecked": return value !== true;
    case "empty": return s === "";
    case "set": return s !== "";
    case "contains": return !want || s.includes(want);
    case "is": return s === want;
    case "gte": return want !== "" && (Number.isFinite(Number(s)) && Number.isFinite(Number(want)) ? Number(s) >= Number(want) : s >= want);
    case "lte": return want !== "" && (Number.isFinite(Number(s)) && Number.isFinite(Number(want)) ? Number(s) <= Number(want) : s <= want);
    default: return true;
  }
}

const valueKey = (entityId: string, tagId: string, key: string) => `${entityId}:${tagId}:${key}`;

/** All fields exposed by the tags currently being filtered on. */
export function useFilterableFields(tagNames: string[]) {
  const { tags } = useTags();
  const [fields, setFields] = useState<TagField[]>([]);

  const activeTags = useMemo(() => {
    const wanted = new Set(tagNames.map(n => n.toLowerCase()));
    return tags.filter(t => wanted.has(t.name.toLowerCase()));
  }, [tags, tagNames]);

  const tagIdKey = activeTags.map(t => t.id).sort().join("|");

  useEffect(() => {
    let alive = true;
    if (!tagIdKey) { setFields([]); return; }
    void listTagFields(tagIdKey.split("|"))
      .then(f => { if (alive) setFields(f); })
      .catch(() => { if (alive) setFields([]); });
    return () => { alive = false; };
  }, [tagIdKey]);

  const tagNameById = useMemo(
    () => new Map(activeTags.map(t => [t.id, t.name])),
    [activeTags],
  );

  return { fields, tagNameById };
}

/**
 * A predicate that answers whether a feed item satisfies the active field
 * filters. Returns a pass-through predicate when nothing is filtered.
 */
export function useFieldFilter(filters: WeekFilterState, entityType = "task") {
  const active = filters.fieldFilters ?? [];
  const tagIds = useMemo(
    () => Array.from(new Set(active.map(f => f.tagId))).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active.map(f => f.tagId).sort().join("|")],
  );
  const [values, setValues] = useState<Record<string, unknown>>({});
  const tagIdKey = tagIds.join("|");

  useEffect(() => {
    let alive = true;
    if (!tagIds.length) { setValues({}); return; }
    void supabase
      .from("item_field_values" as any)
      .select("entity_id,tag_id,field_key,value")
      .eq("entity_type", entityType)
      .in("tag_id", tagIds)
      .then(r => {
        if (!alive) return;
        const map: Record<string, unknown> = {};
        for (const row of ((r.data ?? []) as any[])) {
          map[valueKey(row.entity_id, row.tag_id, row.field_key)] = row.value;
        }
        setValues(map);
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagIdKey, entityType]);

  return useCallback((item: PlannerFeedItem): boolean => {
    if (!active.length) return true;
    if (item.sourceRef.type !== entityType) return false;
    return active.every(f =>
      matchesFieldFilter(values[valueKey(item.sourceRef.id, f.tagId, f.fieldKey)], f),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, JSON.stringify(active), entityType]);
}
