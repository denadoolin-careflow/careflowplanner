import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { StoreProvider } from "@/lib/store";
import { CycleProvider } from "@/lib/cycle-store";
import "@/lib/theme-preset";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Today from "./pages/Today";
import Week from "./pages/Week";
import Month from "./pages/Month";
import Year from "./pages/Year";
import Goals from "./pages/Goals";
import Habits from "./pages/Habits";
import Meals from "./pages/Meals";
import MealsLibrary from "./pages/MealsLibrary";
import Caregiving from "./pages/Caregiving";
import HomeReset from "./pages/HomeReset";
import Journal from "./pages/Journal";
import Ideas from "./pages/Ideas";
import CalendarPage from "./pages/CalendarPage";
import Settings from "./pages/Settings";
import PomodoroPicker from "./pages/PomodoroPicker";
import Health from "./pages/Health";
import Wealth from "./pages/Wealth";
import HomeAreas from "./pages/HomeAreas";
import AreaPage from "./pages/AreaPage";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Inbox from "./pages/Inbox";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Upcoming from "./pages/Upcoming";
import Anytime from "./pages/Anytime";
import Someday from "./pages/Someday";
import Logbook from "./pages/Logbook";
import Notes from "./pages/Notes";
import NoteDetail from "./pages/NoteDetail";
import Review from "./pages/Review";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { FloatingPomodoro } from "@/components/tasks/FloatingPomodoro";
import { PomodoroToastsBridge } from "@/components/tasks/PomodoroTimer";
import { PomodoroBoundaryFlash } from "@/components/tasks/PomodoroBoundaryFlash";
import { FullScreenFocus } from "@/components/tasks/FullScreenFocus";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <StoreProvider>
        <CycleProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PomodoroToastsBridge />
            <FloatingPomodoro />
            <PomodoroBoundaryFlash />
            <FullScreenFocus />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/upcoming" element={<Upcoming />} />
                <Route path="/anytime" element={<Anytime />} />
                <Route path="/someday" element={<Someday />} />
                <Route path="/logbook" element={<Logbook />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/notes/:id" element={<NoteDetail />} />
                <Route path="/review" element={<Review />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/areas/:name" element={<AreaPage />} />
                <Route path="/today" element={<Today />} />
                <Route path="/week" element={<Week />} />
                <Route path="/month" element={<Month />} />
                <Route path="/year" element={<Year />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/habits" element={<Habits />} />
                <Route path="/meals" element={<Meals />} />
                <Route path="/meals/library" element={<MealsLibrary />} />
                <Route path="/caregiving" element={<Caregiving />} />
                <Route path="/home-reset" element={<HomeReset />} />
                <Route path="/health" element={<Health />} />
                <Route path="/wealth" element={<Wealth />} />
                <Route path="/home-areas" element={<HomeAreas />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/ideas" element={<Ideas />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/focus" element={<PomodoroPicker />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </CycleProvider>
      </StoreProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
