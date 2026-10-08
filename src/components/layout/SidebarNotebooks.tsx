import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NotebookDateTree } from "@/components/notes/NotebookDateTree";
import { listNotes, type Note } from "@/lib/notes";

export function SidebarNotebooks({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => {
      void listNotes().then(items => { if (alive) setNotes(items); }).catch(() => {});
    };
    const onVisibility = () => { if (document.visibilityState === "visible") load(); };
    load();
    window.addEventListener("careflow:notes:pinned-changed", load);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      window.removeEventListener("careflow:notes:pinned-changed", load);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [location.key]);
  const params = new URLSearchParams(location.search);
  const selectedMonth = location.pathname === "/notes" && params.get("view") === "notebook"
    ? params.get("month") : null;
  return <div className="mb-2 px-1">
    <NotebookDateTree notes={notes} selectedMonth={selectedMonth} onSelectMonth={month => {
      navigate(`/notes?view=notebook&collection=all&month=${encodeURIComponent(month)}`);
      onNavigate?.();
    }} />
  </div>;
}