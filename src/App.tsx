import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Upload from "./pages/Upload";
import Discover from "./pages/Discover";
import Inbox from "./pages/Inbox";
import EditProfile from "./pages/EditProfile";
import Settings from "./pages/Settings";
import ChangePassword from "./pages/ChangePassword";
import FollowList from "./pages/FollowList";
import Sounds from "./pages/Sounds";
import SoundDetail from "./pages/SoundDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/password" element={<ChangePassword />} />
            <Route path="/follow-list/:userId" element={<FollowList />} />
            <Route path="/sounds" element={<Sounds />} />
            <Route path="/sounds/:soundId" element={<SoundDetail />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;