/**
 * Supertag schema layer (Tana-style).
 *
 * A tag can carry a small set of typed fields ("dose", "pharmacy", "due from")
 * and every item that wears that tag can fill those fields in. Values live in
 * `item_field_values`, keyed by entity + tag + field key.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FieldType = "text" | "number" | "date" | "select" | "checkbox" | "url";

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  select: "Choice",
  checkbox: "Checkbox",
  url: "Link",
};

export interface TagField {
  id: string;
  tagId: string;
  key: string;
  label: string;
  type: FieldType;
  options: string[];
  required: boolean;
  sortOrder: number;
}

export interface ItemFieldValue {
  id: string;
  entityType: string;
  entityId: string;
  tagId: string;
  fieldKey: string;
  value: unknown;
}

const fieldFromRow = (r: any): TagField => ({
  id: r.id,
  tagId: r.tag_id,
  key: r.key,
  label: r.label,
  type: (r.type ?? "text") as FieldType,
  options: Array.isArray(r.options) ? r.options.map(String) : [],
  required: !!r.required,
  sortOrder: r.sort_order ?? 0,
});

const valueFromRow = (r: any): ItemFieldValue => ({
  id: r.id,
  entityType: r.entity_type,
  entityId: r.entity_id,
  tagId: r.tag_id,
  fieldKey: r.field_key,
  value: r.value,
});

/** Slugify a label into a stable storage key. */
export function fieldKeyFor(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "field";
}

/* ------------------------------------------------------------------ */
/*  Tag field schema                                                   */
/* ------------------------------------------------------------------ */

export async function listTagFields(tagIds?: string[]): Promise<TagField[]> {
  let q = supabase.from("tag_fields" as any).select("*").order("sort_order", { ascending: true });
  if (tagIds?.length) q = q.in("tag_id", tagIds);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(fieldFromRow);
}

export async function createTagField(
  tagId: string,
  patch: { label: string; type?: FieldType; options?: string[]; required?: boolean; sortOrder?: number },
): Promise<TagField> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("Not authenticated");
  const label = patch.label.trim();
  if (!label) throw new Error("Field name is required");
  const { data, error } = await supabase
    .from("tag_fields" as any)
    .insert({
      user_id: u.user.id,
      tag_id: tagId,
      key: fieldKeyFor(label),
      label,
      type: patch.type ?? "text",
      options: patch.options ?? [],
      required: patch.required ?? false,
      sort_order: patch.sortOrder ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return fieldFromRow(data);
}

export async function updateTagField(id: string, patch: Partial<Omit<TagField, "id" | "tagId" | "key">>): Promise<void> {
  const row: any = {};
  if (patch.label !== undefined) row.label = patch.label;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.options !== undefined) row.options = patch.options;
  if (patch.required !== undefined) row.required = patch.required;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  const { error } = await supabase.from("tag_fields" as any).update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteTagField(id: string): Promise<void> {
  const { error } = await supabase.from("tag_fields" as any).delete().eq("id", id);
  if (error) throw error;
}

/** Fields for one tag, kept in local state. */
export function useTagFields(tagId: string | null) {
  const [fields, setFields] = useState<TagField[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!tagId) { setFields([]); return; }
    setLoading(true);
    try { setFields(await listTagFields([tagId])); }
    catch (e) { console.warn("listTagFields failed", e); }
    finally { setLoading(false); }
  }, [tagId]);

  useEffect(() => { void reload(); }, [reload]);

  return { fields, loading, reload };
}

/* ------------------------------------------------------------------ */
/*  Item values                                                        */
/* ------------------------------------------------------------------ */

export async function listItemFieldValues(entityType: string, entityId: string): Promise<ItemFieldValue[]> {
  const { data, error } = await supabase
    .from("item_field_values" as any)
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  if (error) throw error;
  return (data ?? []).map(valueFromRow);
}

export async function setItemFieldValue(
  entityType: string,
  entityId: string,
  tagId: string,
  fieldKey: string,
  value: unknown,
): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("Not authenticated");
  const empty = value === null || value === undefined || value === "";
  if (empty) {
    await supabase
      .from("item_field_values" as any)
      .delete()
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("tag_id", tagId)
      .eq("field_key", fieldKey);
    return;
  }
  const { error } = await supabase
    .from("item_field_values" as any)
    .upsert(
      {
        user_id: u.user.id,
        entity_type: entityType,
        entity_id: entityId,
        tag_id: tagId,
        field_key: fieldKey,
        value: value as any,
      },
      { onConflict: "entity_type,entity_id,tag_id,field_key" },
    );
  if (error) throw error;
}

/** Values for one entity, indexed by `${tagId}:${fieldKey}`. */
export function useItemFieldValues(entityType: string, entityId: string | null) {
  const [values, setValues] = useState<Record<string, unknown>>({});

  const reload = useCallback(async () => {
    if (!entityId) { setValues({}); return; }
    try {
      const rows = await listItemFieldValues(entityType, entityId);
      const map: Record<string, unknown> = {};
      for (const r of rows) map[`${r.tagId}:${r.fieldKey}`] = r.value;
      setValues(map);
    } catch (e) {
      console.warn("listItemFieldValues failed", e);
    }
  }, [entityType, entityId]);

  useEffect(() => { void reload(); }, [reload]);

  const save = useCallback(async (tagId: string, fieldKey: string, value: unknown) => {
    if (!entityId) return;
    setValues(v => ({ ...v, [`${tagId}:${fieldKey}`]: value }));
    await setItemFieldValue(entityType, entityId, tagId, fieldKey, value);
  }, [entityType, entityId]);

  return { values, save, reload };
}
