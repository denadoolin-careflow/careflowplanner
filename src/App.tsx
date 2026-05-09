import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { StoreProvider } from "@/lib/store";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Today from "./pages/Today";
import Week from "./pages/Week";
import Month from "./pages/Month";
import Year from "./pages/Year";
import Goals from "./pages/Goals";
import Habits from "./pages/Habits";
import Meals from "./pages/Meals";
import Caregiving from "./pages/Caregiving";
import HomeReset from "./pages/HomeReset";
import Journal from "./pages/Journal";
import Ideas from "./pages/Ideas";
import CalendarPage from "./pages/CalendarPage";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <StoreProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/today" element={<Today />} />
                <Route path="/week" element={<Week />} />
                <Route path="/month" element={<Month />} />
                <Route path="/year" element={<Year />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/habits" element={<Habits />} />
                <Route path="/meals" element={<Meals />} />
                <Route path="/caregiving" element={<Caregiving />} />
                <Route path="/home-reset" element={<HomeReset />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/ideas" element={<Ideas />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </StoreProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
