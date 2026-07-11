import { TaskSelectionProvider } from "@/lib/task-selection";
import { BulkActionBar } from "@/components/tasks/BulkActionBar";
import { CustomizableGrid } from "@/components/dashboard/CustomizableGrid";
import { QuickPresetSwitcher } from "@/components/dashboard/QuickPresetSwitcher";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import { Link } from "react-router-dom";

export default function TodayV2() {
  useEnsureWeather();
  return (
    <TaskSelectionProvider storageKey="today-v2">
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-4 px-2 pb-10 sm:px-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-primary/70">Prototype</p>
            <h1 className="font-display text-2xl font-semibold text-foreground">Today · v2</h1>
          </div>
          <Link to="/today" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to Today
          </Link>
        </div>
        <CustomizableGrid pageKey="today-v2" />
      </div>
      <BulkActionBar />
      <QuickPresetSwitcher pageKey="today-v2" />
    </TaskSelectionProvider>
  );
}