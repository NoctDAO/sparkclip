import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { VideoSoundProvider } from "@/contexts/VideoSoundContext";
import { useAppViewportHeight } from "@/hooks/useAppViewportHeight";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Upload from "./pages/Upload";
import Discover from "./pages/Discover";
import Search from "./pages/Search";
import HashtagPage from "./pages/HashtagPage";
import Inbox from "./pages/Inbox";
import Messages from "./pages/Messages";
import EditProfile from "./pages/EditProfile";
import Settings from "./pages/Settings";
import ChangePassword from "./pages/ChangePassword";
import Privacy from "./pages/Privacy";
import BlockedUsers from "./pages/BlockedUsers";
import FollowList from "./pages/FollowList";
import Sounds from "./pages/Sounds";
import SoundDetail from "./pages/SoundDetail";
import FollowedSeries from "./pages/FollowedSeries";
import VideoPage from "./pages/VideoPage";
import SeriesDetail from "./pages/SeriesDetail";
import Analytics from "./pages/Analytics";
import Moderation from "./pages/Moderation";
import AdminDashboard from "./pages/AdminDashboard";
import Onboarding from "./pages/Onboarding";
import DuetRecording from "./pages/DuetRecording";
import AdvertiserDashboard from "./pages/AdvertiserDashboard";
import AdAnalytics from "./pages/AdAnalytics";
import CreatorEarnings from "./pages/CreatorEarnings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useAppViewportHeight();

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <VideoSoundProvider>
            <NotificationProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <OnboardingGuard>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/profile/:userId" element={<Profile />} />
                      <Route path="/upload" element={<Upload />} />
                      <Route path="/discover" element={<Discover />} />
                      <Route path="/search" element={<Search />} />
                      <Route path="/hashtag/:tag" element={<HashtagPage />} />
                      <Route path="/inbox" element={<Inbox />} />
                      <Route path="/messages" element={<Messages />} />
                      <Route path="/messages/:conversationId" element={<Messages />} />
                      <Route path="/edit-profile" element={<EditProfile />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/settings/password" element={<ChangePassword />} />
                      <Route path="/settings/privacy" element={<Privacy />} />
                      <Route path="/settings/privacy/blocked" element={<BlockedUsers />} />
                      <Route path="/follow-list/:userId" element={<FollowList />} />
                      <Route path="/sounds" element={<Sounds />} />
                      <Route path="/sounds/:soundId" element={<SoundDetail />} />
                      <Route path="/following-series" element={<FollowedSeries />} />
                      <Route path="/video/:videoId" element={<VideoPage />} />
                      <Route path="/series/:seriesId" element={<SeriesDetail />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/moderation" element={<Moderation />} />
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/advertiser" element={<AdvertiserDashboard />} />
                      <Route path="/advertiser/analytics" element={<AdAnalytics />} />
                      <Route path="/earnings" element={<CreatorEarnings />} />
                      <Route path="/duet/:videoId" element={<DuetRecording />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </OnboardingGuard>
                </BrowserRouter>
              </TooltipProvider>
            </NotificationProvider>
          </VideoSoundProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;