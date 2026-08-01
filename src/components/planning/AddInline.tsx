import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** Shared single-line add row used across the planning dashboards. */
export function AddInline({ onAdd, placeholder }: { onAdd: (v: string) => void; placeholder: string }) {
  const [v, setV] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); const t = v.trim(); if (!t) return; onAdd(t); setV(""); }}
      className="mt-2 flex gap-1.5"
    >
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="h-8 rounded-lg text-xs" />
      <Button type="submit" size="sm" variant="ghost" className="h-8 rounded-lg px-2" aria-label="Add">
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}