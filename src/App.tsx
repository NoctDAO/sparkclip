import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { VideoSoundProvider } from "@/contexts/VideoSoundContext";
import { useAppViewportHeight } from "@/hooks/useAppViewportHeight";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Upload from "./pages/Upload";
import Discover from "./pages/Discover";
import Search from "./pages/Search";
import HashtagPage from "./pages/HashtagPage";
import Inbox from "./pages/Inbox";
import EditProfile from "./pages/EditProfile";
import Settings from "./pages/Settings";
import ChangePassword from "./pages/ChangePassword";
import Privacy from "./pages/Privacy";
import BlockedUsers from "./pages/BlockedUsers";
import FollowList from "./pages/FollowList";
import Sounds from "./pages/Sounds";
import SoundDetail from "./pages/SoundDetail";
import VideoPage from "./pages/VideoPage";
import Analytics from "./pages/Analytics";
import Moderation from "./pages/Moderation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useAppViewportHeight();

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <VideoSoundProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/profile/:userId" element={<Profile />} />
                  <Route path="/upload" element={<Upload />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/hashtag/:tag" element={<HashtagPage />} />
                  <Route path="/inbox" element={<Inbox />} />
                  <Route path="/edit-profile" element={<EditProfile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/password" element={<ChangePassword />} />
                  <Route path="/settings/privacy" element={<Privacy />} />
                  <Route path="/settings/privacy/blocked" element={<BlockedUsers />} />
                  <Route path="/follow-list/:userId" element={<FollowList />} />
                  <Route path="/sounds" element={<Sounds />} />
                  <Route path="/sounds/:soundId" element={<SoundDetail />} />
                  <Route path="/video/:videoId" element={<VideoPage />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/moderation" element={<Moderation />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </VideoSoundProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;