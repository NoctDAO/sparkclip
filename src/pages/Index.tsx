import { useState } from "react";
import { VideoFeed } from "@/components/video/VideoFeed";
import { FeedTabs } from "@/components/layout/FeedTabs";
import { BottomNav } from "@/components/layout/BottomNav";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"foryou" | "following">("foryou");

  return (
    <div className="h-screen w-full bg-background overflow-hidden">
      <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <VideoFeed feedType={activeTab} />
      <BottomNav />
    </div>
  );
};

export default Index;