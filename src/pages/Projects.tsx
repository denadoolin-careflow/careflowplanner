import { useSearchParams } from "react-router-dom";
import { AllTasksViews } from "@/components/tasks/AllTasksViews";
import ProjectsHub from "@/components/projects/hub/ProjectsHub";

export default function Projects() {
  const [params] = useSearchParams();
  if (params.get("tab") === "tasks") {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
        <AllTasksViews />
      </div>
    );
  }
  return <ProjectsHub />;
}
