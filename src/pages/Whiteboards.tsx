import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  listWhiteboards,
  createWhiteboard,
  deleteWhiteboard,
  type Whiteboard,
} from "@/lib/whiteboards";

export default function Whiteboards() {
  const [boards, setBoards] = useState<Whiteboard[] | null>(null);

  const refresh = async () => {
    try {
      setBoards(await listWhiteboards());
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load boards");
    }
  };
  useEffect(() => { void refresh(); }, []);

  const add = async () => {
    const b = await createWhiteboard({ title: "Untitled board" });
    window.location.assign(`/whiteboards/${b.id}`);
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this board?")) return;
    await deleteWhiteboard(id);
    void refresh();
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Whiteboards</h1>
          <p className="text-sm text-muted-foreground">Sticky notes, freeform planning, visual connections.</p>
        </div>
        <Button onClick={add} className="gap-1.5"><Plus className="h-4 w-4" /> New board</Button>
      </header>

      {!boards ? (
        <div className="grid place-items-center py-16 text-sm text-muted-foreground">Loading…</div>
      ) : boards.length === 0 ? (
        <div className="cozy-card grid place-items-center gap-3 p-12 text-center">
          <PenLine className="h-8 w-8 text-muted-foreground" />
          <div>
            <h2 className="font-display text-lg font-semibold">Your first whiteboard</h2>
            <p className="text-sm text-muted-foreground">Map projects, goals, and ideas visually with sticky notes and connections.</p>
          </div>
          <Button onClick={add} className="gap-1.5"><Plus className="h-4 w-4" /> New board</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map(b => (
            <div key={b.id} className="cozy-card group relative flex flex-col gap-2 p-4">
              <Link to={`/whiteboards/${b.id}`} className="absolute inset-0" aria-label={b.title} />
              <h3 className="font-display text-base font-semibold">{b.title || "Untitled"}</h3>
              <p className="text-xs text-muted-foreground">
                {b.data.nodes.length} note{b.data.nodes.length === 1 ? "" : "s"} · {b.data.edges.length} link{b.data.edges.length === 1 ? "" : "s"}
              </p>
              <p className="mt-auto text-[11px] text-muted-foreground">
                Updated {format(parseISO(b.updatedAt), "MMM d, h:mm a")}
              </p>
              <button
                onClick={(e) => { e.preventDefault(); void remove(b.id); }}
                className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-md text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                aria-label="Delete board"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
