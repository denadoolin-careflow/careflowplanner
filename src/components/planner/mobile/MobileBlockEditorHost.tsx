import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { onOpenMobileBlockEditor, type MobileBlockMode } from "@/lib/open-mobile-block-editor";
import { MobileBlockSheet } from "./MobileBlockSheet";
import { MobileBlockQuickMenu } from "./MobileBlockQuickMenu";

/** Mounted once in AppLayout: renders the mobile grid editor / quick menu. */
export function MobileBlockEditorHost() {
  const { state } = useStore();
  const [id, setId] = useState<string | null>(null);
  const [mode, setMode] = useState<MobileBlockMode>("sheet");

  useEffect(() => onOpenMobileBlockEditor((tid, m) => { setId(tid); setMode(m); }), []);
  const task = id ? state.tasks.find(t => t.id === id) ?? null : null;

  return (
    <>
      <MobileBlockSheet
        task={task}
        open={!!task && mode === "sheet"}
        onOpenChange={(o) => !o && setId(null)}
      />
      <MobileBlockQuickMenu
        task={task}
        open={!!task && mode === "quick"}
        onOpenChange={(o) => !o && setId(null)}
        onOpenSheet={() => setMode("sheet")}
      />
    </>
  );
}
