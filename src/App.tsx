import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { StoreProvider } from "@/lib/store";
import { CycleProvider } from "@/lib/cycle-store";
import { WorkspaceLayoutProvider } from "@/components/workspace/useWorkspaceLayout";
import "@/lib/theme-preset";
import { AppLayout } from "@/components/layout/AppLayout";
import { InlineTagPreviewLayer } from "@/components/tags/InlineTagPreviewLayer";
import { MediaLightbox } from "@/components/media/MediaLightbox";
import { IndexRedirect } from "@/components/auth/IndexRedirect";
import Today from "./pages/Today";
import Week from "./pages/Week";
import Month from "./pages/Month";
import MonthOverview from "./pages/MonthOverview";
import Year from "./pages/Year";
import Goals from "./pages/Goals";
import Habits from "./pages/Habits";
import Meals from "./pages/Meals";
import MealsLibrary from "./pages/MealsLibrary";
import Pantry from "./pages/Pantry";
import HomeGroceries from "./pages/HomeGroceries";
import Caregiving from "./pages/Caregiving";
import HomeReset from "./pages/HomeReset";
import HomeHub from "./pages/HomeHub";
import Journal from "./pages/Journal";
import JournalFlow from "./pages/JournalFlow";
import Ideas from "./pages/Ideas";
import Tags from "./pages/Tags";
import TagDetail from "./pages/TagDetail";
import CalendarPage from "./pages/CalendarPage";
import Settings from "./pages/Settings";
import PomodoroPicker from "./pages/PomodoroPicker";
import Health from "./pages/Health";
import WealthHub from "./pages/WealthHub";
import HomeAreas from "./pages/HomeAreas";
import AreaPage from "./pages/AreaPage";
import AreasManager from "./pages/AreasManager";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Inbox from "./pages/Inbox";
import TaskDetail from "./pages/TaskDetail";
import Graph from "./pages/Graph";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Upcoming from "./pages/Upcoming";
import Anytime from "./pages/Anytime";
import Someday from "./pages/Someday";
import NotToday from "./pages/NotToday";
import Logbook from "./pages/Logbook";
import Notes from "./pages/Notes";
import NoteDetail from "./pages/NoteDetail";
import NotesTimeline from "./pages/NotesTimeline";
import NotesFiles from "./pages/NotesFiles";
import Review from "./pages/Review";
import Reset from "./pages/Reset";
import Routines from "./pages/Routines";
import PlanTimeline from "./pages/PlanTimeline";
import PlanDay from "./pages/PlanDay";
import Whiteboards from "./pages/Whiteboards";
import WhiteboardDetail from "./pages/WhiteboardDetail";
import MentalLoad from "./pages/MentalLoad";
import Onboarding from "./pages/Onboarding";
import Memories from "./pages/Memories";
import CareLoop from "./pages/CareLoop";
import CareHub from "./pages/CareHub";
import CareRhythm from "./pages/CareRhythm";
import CareExhale from "./pages/CareExhale";
import Automations from "./pages/Automations";
import Trips from "./pages/Trips";
import TripDetail from "./pages/TripDetail";
import RhythmOverview from "./pages/RhythmOverview";
import Insights from "./pages/Insights";
import Quiz from "./pages/Quiz";
import Pricing from "./pages/Pricing";
import Waitlist from "./pages/Waitlist";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Updates from "./pages/Updates";
import AdminUpdates from "./pages/AdminUpdates";
import Roadmap from "./pages/Roadmap";
import AdminRoadmap from "./pages/AdminRoadmap";
import FamilySettings from "./pages/FamilySettings";
import JoinHousehold from "./pages/JoinHousehold";
import FamilyRequests from "./pages/FamilyRequests";
import FlowLanding from "./pages/FlowLanding";
import FlowColorsPreview from "./pages/FlowColorsPreview";
import Seasons from "./pages/Seasons";
import SeasonsCelebrations from "./pages/SeasonsCelebrations";
import SeasonsCelebrationDetail from "./pages/SeasonsCelebrationDetail";
import SeasonsHolidays from "./pages/SeasonsHolidays";
import SeasonsHolidayDetail from "./pages/SeasonsHolidayDetail";
import SeasonsTraditions from "./pages/SeasonsTraditions";
import SeasonsMemoryBook from "./pages/SeasonsMemoryBook";
import SeasonsBucketLists from "./pages/SeasonsBucketLists";
import SeasonsRemembrance from "./pages/SeasonsRemembrance";
import CosmicFlow from "./pages/CosmicFlow";
import CosmicFlowTimeline from "./pages/CosmicFlowTimeline";
import CosmicFlowEventDetail from "./pages/CosmicFlowEventDetail";
import CosmicFlowBirthChart from "./pages/CosmicFlowBirthChart";
import CosmicChapter from "./pages/CosmicChapter";
import CosmicNatal from "./pages/CosmicNatal";
import CosmicPredictive from "./pages/CosmicPredictive";
import CosmicCalendar from "./pages/CosmicCalendar";
import Carey from "./pages/Carey";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { FloatingPomodoro } from "@/components/tasks/FloatingPomodoro";
import { PomodoroToastsBridge } from "@/components/tasks/PomodoroTimer";
import { PomodoroBoundaryFlash } from "@/components/tasks/PomodoroBoundaryFlash";
import { FullScreenFocus } from "@/components/tasks/FullScreenFocus";
import { MoonPrefetcher } from "@/components/rhythm/MoonPrefetcher";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { CyclePlanningListener } from "@/components/cycle/CyclePlanningListener";
import { ExhaleReminderHost } from "@/components/today/ExhaleReminderHost";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <StoreProvider>
        <CycleProvider>
        <WorkspaceLayoutProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <PomodoroToastsBridge />
            <FloatingPomodoro />
            <PomodoroBoundaryFlash />
            <FullScreenFocus />
            <MoonPrefetcher />
            <CyclePlanningListener />
            <ExhaleReminderHost />
            <InlineTagPreviewLayer />
            <MediaLightbox />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/join/:token" element={<JoinHousehold />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/waitlist" element={<Waitlist />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/updates" element={<Updates />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/" element={<IndexRedirect />} />
              <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                <Route path="/dashboard" element={<HomeHub />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/tasks/:id" element={<TaskDetail />} />
                <Route path="/upcoming" element={<Upcoming />} />
                <Route path="/anytime" element={<Anytime />} />
                <Route path="/someday" element={<Someday />} />
                <Route path="/not-today" element={<NotToday />} />
                <Route path="/logbook" element={<Logbook />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/notes/timeline" element={<NotesTimeline />} />
                <Route path="/notes/files" element={<NotesFiles />} />
                <Route path="/notes/:id" element={<NoteDetail />} />
                <Route path="/graph" element={<Graph />} />
                <Route path="/review" element={<Review />} />
                <Route path="/reset" element={<Reset />} />
                <Route path="/reset/:period" element={<Reset />} />
                <Route path="/whiteboards" element={<Whiteboards />} />
                <Route path="/whiteboards/:id" element={<WhiteboardDetail />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/areas/:name" element={<AreaPage />} />
                <Route path="/areas" element={<AreasManager />} />
                <Route path="/today" element={<Today />} />
                <Route path="/rhythm" element={<RhythmOverview />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/plan" element={<PlanTimeline />} />
                <Route path="/plan/:date" element={<PlanDay />} />
                <Route path="/week" element={<Week />} />
                <Route path="/month" element={<Month />} />
               <Route path="/month/overview" element={<MonthOverview />} />
                <Route path="/year" element={<Year />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/habits" element={<Habits />} />
                <Route path="/meals" element={<Meals />} />
                <Route path="/meals/library" element={<MealsLibrary />} />
                <Route path="/pantry" element={<Pantry />} />
                <Route path="/caregiving" element={<Caregiving />} />
                <Route path="/home-reset" element={<HomeHub />} />
                <Route path="/home" element={<HomeHub />} />
                <Route path="/home/groceries" element={<HomeGroceries />} />
                <Route path="/health" element={<Health />} />
                <Route path="/wealth" element={<WealthHub />} />
                <Route path="/mental-load" element={<MentalLoad />} />
                <Route path="/care" element={<CareHub />} />
                <Route path="/care/rhythm" element={<CareRhythm />} />
                <Route path="/care/exhale" element={<CareExhale />} />
                <Route path="/care-loop" element={<CareLoop />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/home-areas" element={<HomeAreas />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/journal-flow" element={<JournalFlow />} />
                <Route path="/routines" element={<Routines />} />
                <Route path="/ideas" element={<Ideas />} />
               <Route path="/tags" element={<Tags />} />
               <Route path="/tags/:name" element={<TagDetail />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/focus" element={<PomodoroPicker />} />
                <Route path="/memories" element={<Memories />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/automations" element={<Automations />} />
                <Route path="/admin/updates" element={<AdminUpdates />} />
                <Route path="/admin/roadmap" element={<AdminRoadmap />} />
                <Route path="/trips" element={<Trips />} />
                <Route path="/trips/:id" element={<TripDetail />} />
                <Route path="/family" element={<FamilySettings />} />
                <Route path="/family/requests" element={<FamilyRequests />} />
                <Route path="/flow/:id" element={<FlowLanding />} />
                <Route path="/settings/flow-colors" element={<FlowColorsPreview />} />
                <Route path="/seasons" element={<Seasons />} />
                <Route path="/seasons/celebrations" element={<SeasonsCelebrations />} />
                <Route path="/seasons/celebrations/:id" element={<SeasonsCelebrationDetail />} />
                <Route path="/seasons/holidays" element={<SeasonsHolidays />} />
                <Route path="/seasons/holidays/:id" element={<SeasonsHolidayDetail />} />
                <Route path="/seasons/traditions" element={<SeasonsTraditions />} />
                <Route path="/seasons/memory-book" element={<SeasonsMemoryBook />} />
                <Route path="/seasons/bucket-lists" element={<SeasonsBucketLists />} />
                <Route path="/seasons/remembrance" element={<SeasonsRemembrance />} />
                <Route path="/cosmic-flow" element={<CosmicFlow />} />
                <Route path="/cosmic-flow/timeline" element={<CosmicFlowTimeline />} />
                <Route path="/cosmic-flow/event/:id" element={<CosmicFlowEventDetail />} />
                <Route path="/cosmic-flow/birth-chart" element={<CosmicFlowBirthChart />} />
                <Route path="/cosmic-flow/chapter" element={<CosmicChapter />} />
                <Route path="/cosmic-flow/natal" element={<CosmicNatal />} />
                <Route path="/cosmic-flow/predictive" element={<CosmicPredictive />} />
                <Route path="/cosmic-flow/calendar" element={<CosmicCalendar />} />
                <Route path="/carey" element={<Carey />} />
                <Route path="/carey/:threadId" element={<Carey />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </WorkspaceLayoutProvider>
        </CycleProvider>
      </StoreProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
