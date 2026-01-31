import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { VideoFeed } from "@/components/video/VideoFeed";
import { FeedTabs } from "@/components/layout/FeedTabs";
import { BottomNav } from "@/components/layout/BottomNav";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"foryou" | "following">("foryou");
  const [barsVisible, setBarsVisible] = useState(true);

  const handleScrollDirectionChange = useCallback((isScrollingUp: boolean) => {
    setBarsVisible(isScrollingUp);
  }, []);

  // SEO metadata
  const siteName = "VidShare";
  const pageTitle = `${siteName} | Watch, Create & Share Short Videos`;
  const pageDescription = "Discover trending short videos, follow your favorite creators, and share your own content. Join millions creating and watching viral videos.";
  const pageUrl = window.location.origin;

  // JSON-LD structured data for WebSite
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": siteName,
    "url": pageUrl,
    "description": pageDescription,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${pageUrl}/discover?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  // JSON-LD structured data for Organization
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": siteName,
    "url": pageUrl,
    "logo": `${pageUrl}/favicon.ico`,
    "sameAs": []
  };

  // JSON-LD for WebApplication
  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": siteName,
    "url": pageUrl,
    "applicationCategory": "SocialNetworkingApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Short video sharing",
      "Video creation tools",
      "Social networking",
      "Content discovery",
      "Sound library"
    ]
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={siteName} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={`${pageUrl}/og-image.png`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={`${pageUrl}/og-image.png`} />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="keywords" content="short videos, viral videos, video sharing, creators, trending, social media" />
        <link rel="canonical" href={pageUrl} />
        
        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(websiteJsonLd)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(organizationJsonLd)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(webAppJsonLd)}
        </script>
      </Helmet>

      <div className="h-[var(--app-height)] w-full bg-background overflow-hidden">
        <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} isVisible={barsVisible} />
        <VideoFeed
          feedType={activeTab}
          onScrollDirectionChange={handleScrollDirectionChange}
          bottomNavVisible={barsVisible}
        />
        <BottomNav isVisible={barsVisible} />
      </div>
    </>
  );
};

export default Index;