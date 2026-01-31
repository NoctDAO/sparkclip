import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the base URL from request or environment
    const url = new URL(req.url);
    const baseUrl = url.searchParams.get("baseUrl") || "https://example.com";

    // Fetch all videos
    const { data: videos, error: videosError } = await supabase
      .from("videos")
      .select("id, created_at, user_id")
      .order("created_at", { ascending: false });

    if (videosError) {
      throw videosError;
    }

    // Fetch all profiles for profile pages
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, username, updated_at")
      .order("updated_at", { ascending: false });

    if (profilesError) {
      throw profilesError;
    }

    // Fetch all sounds
    const { data: sounds, error: soundsError } = await supabase
      .from("sounds")
      .select("id, created_at")
      .order("created_at", { ascending: false });

    if (soundsError) {
      throw soundsError;
    }

    // Generate sitemap XML
    const now = new Date().toISOString();
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Discover page -->
  <url>
    <loc>${baseUrl}/discover</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Sounds page -->
  <url>
    <loc>${baseUrl}/sounds</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;

    // Add video pages
    if (videos && videos.length > 0) {
      for (const video of videos) {
        const lastmod = video.created_at ? new Date(video.created_at).toISOString() : now;
        sitemap += `
  <!-- Video: ${video.id} -->
  <url>
    <loc>${baseUrl}/video/${video.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    // Add profile pages
    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        const lastmod = profile.updated_at ? new Date(profile.updated_at).toISOString() : now;
        sitemap += `
  <!-- Profile: ${profile.username || profile.user_id} -->
  <url>
    <loc>${baseUrl}/profile/${profile.user_id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    // Add sound pages
    if (sounds && sounds.length > 0) {
      for (const sound of sounds) {
        const lastmod = sound.created_at ? new Date(sound.created_at).toISOString() : now;
        sitemap += `
  <!-- Sound: ${sound.id} -->
  <url>
    <loc>${baseUrl}/sounds/${sound.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
`;
      }
    }

    sitemap += `
</urlset>`;

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error: unknown) {
    console.error("Error generating sitemap:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
