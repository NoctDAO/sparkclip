import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Ad } from "@/types/ad";

interface UserTargetingData {
  interests: Record<string, number>;
  location: string | null;
  deviceType: "mobile" | "desktop" | "tablet";
}

// Detect device type from user agent
function getDeviceType(): "mobile" | "desktop" | "tablet" {
  const ua = navigator.userAgent.toLowerCase();
  if (/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(ua)) {
    return "tablet";
  }
  if (/(mobi|ipod|phone|blackberry|opera mini|fennec|minimo|symbian|psp|nintendo ds|archos|skyfire|puffin|blazer|bolt|gobrowser|iris|maemo|semc|teashark|uzard)/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

// Get user's approximate location from timezone (privacy-respecting)
function getApproximateLocation(): string | null {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Map common timezones to country codes
    const timezoneToCountry: Record<string, string> = {
      "America/New_York": "US",
      "America/Los_Angeles": "US",
      "America/Chicago": "US",
      "America/Denver": "US",
      "Europe/London": "GB",
      "Europe/Paris": "FR",
      "Europe/Berlin": "DE",
      "Europe/Rome": "IT",
      "Europe/Madrid": "ES",
      "Asia/Tokyo": "JP",
      "Asia/Seoul": "KR",
      "Asia/Shanghai": "CN",
      "Asia/Singapore": "SG",
      "Australia/Sydney": "AU",
      "America/Toronto": "CA",
      "America/Mexico_City": "MX",
      "America/Sao_Paulo": "BR",
      "Asia/Dubai": "AE",
      "Asia/Kolkata": "IN",
    };
    return timezoneToCountry[timezone] || null;
  } catch {
    return null;
  }
}

export function useSmartAdTargeting(userId: string | undefined) {
  const [userTargeting, setUserTargeting] = useState<UserTargetingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserInterests = async () => {
      setLoading(true);
      
      const deviceType = getDeviceType();
      const location = getApproximateLocation();
      
      let interests: Record<string, number> = {};
      
      if (userId) {
        // Fetch user interests from database
        const { data } = await supabase
          .from("user_interests")
          .select("*")
          .eq("user_id", userId)
          .single();
        
        if (data) {
          interests = {
            entertainment: data.entertainment_weight || 0,
            music: data.music_weight || 0,
            sports: data.sports_weight || 0,
            gaming: data.gaming_weight || 0,
            fashion: data.fashion_weight || 0,
            food: data.food_weight || 0,
            travel: data.travel_weight || 0,
            tech: data.tech_weight || 0,
            education: data.education_weight || 0,
            lifestyle: data.lifestyle_weight || 0,
          };
        }
      }
      
      setUserTargeting({ interests, location, deviceType });
      setLoading(false);
    };

    fetchUserInterests();
  }, [userId]);

  // Score an ad based on targeting match
  const scoreAd = useCallback((ad: Ad): number => {
    if (!userTargeting) return 1;
    
    let score = 1;
    
    // Device type matching
    if (ad.target_device_types && ad.target_device_types.length > 0) {
      if (ad.target_device_types.includes(userTargeting.deviceType)) {
        score += 2;
      } else {
        score -= 1; // Penalty for device mismatch
      }
    }
    
    // Location matching
    if (ad.target_locations && ad.target_locations.length > 0 && userTargeting.location) {
      if (ad.target_locations.includes(userTargeting.location)) {
        score += 3;
      } else {
        score -= 1;
      }
    }
    
    // Interest matching
    if (ad.target_interests && ad.target_interests.length > 0) {
      let interestScore = 0;
      for (const interest of ad.target_interests) {
        const weight = userTargeting.interests[interest] || 0;
        interestScore += weight;
      }
      // Normalize interest score
      score += Math.min(interestScore / 10, 5);
    }
    
    // Add ad priority as a factor
    score += (ad.priority || 0) * 0.5;
    
    return Math.max(score, 0.1); // Never return 0
  }, [userTargeting]);

  // Filter and sort ads by targeting relevance
  const getTargetedAds = useCallback((ads: Ad[]): Ad[] => {
    if (!userTargeting || ads.length === 0) return ads;
    
    // Score each ad
    const scoredAds = ads.map(ad => ({
      ad,
      score: scoreAd(ad),
    }));
    
    // Sort by score (highest first)
    scoredAds.sort((a, b) => b.score - a.score);
    
    return scoredAds.map(item => item.ad);
  }, [userTargeting, scoreAd]);

  return {
    userTargeting,
    loading,
    scoreAd,
    getTargetedAds,
  };
}
