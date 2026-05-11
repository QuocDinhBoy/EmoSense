import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound.tsx";
import { AppLayout } from "./components/AppLayout";
import ChildHome from "./pages/ChildHome";
import LearningMap from "./pages/LearningMap";
import Flashcards from "./pages/Flashcards";
import MatchingGame from "./pages/MatchingGame";
import CameraPractice from "./pages/CameraPractice";
import Scenarios from "./pages/Scenarios";
import Journal from "./pages/Journal";
import Rewards from "./pages/Rewards";
import ParentDashboard from "./pages/ParentDashboard";
import Auth from "./pages/Auth";
import { RequireAuth } from "./components/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index element={<ChildHome />} />
            <Route path="learn" element={<LearningMap />} />
            <Route path="flashcards" element={<Flashcards />} />
            <Route path="match" element={<MatchingGame />} />
            <Route path="camera" element={<CameraPractice />} />
            <Route path="scenarios" element={<Scenarios />} />
            <Route path="stories" element={<Scenarios />} />
            <Route path="journal" element={<Journal />} />
            <Route path="rewards" element={<Rewards />} />
            <Route path="parent" element={<ParentDashboard />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
