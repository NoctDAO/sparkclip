import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isValidUUID, validationErrorResponse } from "../_shared/validation.ts";
import {
  createSecurityLog,
  logSecurityEvent,
  getClientIp,
  createTimer,
} from "../_shared/logger.ts";

const FUNCTION_NAME = "delete-user-data";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const timer = createTimer();
  const clientIp = getClientIp(req);

  // Only allow POST method
  if (req.method !== "POST") {
    logSecurityEvent(createSecurityLog(FUNCTION_NAME, "method_not_allowed", clientIp, {
      level: "warn",
      success: false,
      durationMs: timer(),
      metadata: { method: req.method },
    }));

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logSecurityEvent(createSecurityLog(FUNCTION_NAME, "missing_auth", clientIp, {
        level: "warn",
        success: false,
        durationMs: timer(),
      }));

      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate auth header format
    if (!authHeader.startsWith("Bearer ")) {
      logSecurityEvent(createSecurityLog(FUNCTION_NAME, "invalid_auth_format", clientIp, {
        level: "warn",
        success: false,
        durationMs: timer(),
      }));

      return new Response(
        JSON.stringify({ error: "Invalid authorization header format" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user token to get user ID
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      logSecurityEvent(createSecurityLog(FUNCTION_NAME, "unauthorized", clientIp, {
        level: "warn",
        success: false,
        durationMs: timer(),
      }));

      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Log the deletion request start
    logSecurityEvent(createSecurityLog(FUNCTION_NAME, "deletion_started", clientIp, {
      level: "info",
      success: true,
      userId,
      metadata: { stage: "initiated" },
    }));

    // Validate user ID is a proper UUID (defense in depth)
    if (!isValidUUID(userId)) {
      return validationErrorResponse(["Invalid user ID format"], corsHeaders);
    }

    // Use service role client for cascade deletion
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user data in order (respecting foreign key constraints)
    const deletionResults: Record<string, number> = {};

    // 1. Delete notifications (where user is actor or recipient)
    const { count: notificationsCount } = await supabaseAdmin
      .from("notifications")
      .delete({ count: "exact" })
      .or(`user_id.eq.${userId},actor_id.eq.${userId}`);
    deletionResults.notifications = notificationsCount ?? 0;

    // 2. Delete comment likes
    const { count: commentLikesCount } = await supabaseAdmin
      .from("comment_likes")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    deletionResults.comment_likes = commentLikesCount ?? 0;

    // 3. Delete comments
    const { count: commentsCount } = await supabaseAdmin
      .from("comments")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    deletionResults.comments = commentsCount ?? 0;

    // 4. Delete likes
    const { count: likesCount } = await supabaseAdmin
      .from("likes")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    deletionResults.likes = likesCount ?? 0;

    // 5. Delete bookmarks
    const { count: bookmarksCount } = await supabaseAdmin
      .from("bookmarks")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    deletionResults.bookmarks = bookmarksCount ?? 0;

    // 6. Delete follows (both as follower and following)
    const { count: followsCount } = await supabaseAdmin
      .from("follows")
      .delete({ count: "exact" })
      .or(`follower_id.eq.${userId},following_id.eq.${userId}`);
    deletionResults.follows = followsCount ?? 0;

    // 7. Delete search history
    const { count: searchCount } = await supabaseAdmin
      .from("search_history")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    deletionResults.search_history = searchCount ?? 0;

    // 8. Delete user interactions
    const { count: interactionsCount } = await supabaseAdmin
      .from("user_interactions")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    deletionResults.user_interactions = interactionsCount ?? 0;

    // 9. Delete sound favorites
    const { count: soundFavoritesCount } = await supabaseAdmin
      .from("sound_favorites")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    deletionResults.sound_favorites = soundFavoritesCount ?? 0;

    // 10. Delete video views
    const { count: viewsCount } = await supabaseAdmin
      .from("video_views")
      .delete({ count: "exact" })
      .eq("viewer_id", userId);
    deletionResults.video_views = viewsCount ?? 0;

    // 11. Delete reports made by user
    const { count: reportsCount } = await supabaseAdmin
      .from("reports")
      .delete({ count: "exact" })
      .eq("reporter_id", userId);
    deletionResults.reports = reportsCount ?? 0;

    // 12. Delete user roles
    const { count: rolesCount } = await supabaseAdmin
      .from("user_roles")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    deletionResults.user_roles = rolesCount ?? 0;

    // 13. Get user's videos to delete associated content
    const { data: userVideos } = await supabaseAdmin
      .from("videos")
      .select("id, video_url, thumbnail_url")
      .eq("user_id", userId);

    // Delete videos and their storage files
    if (userVideos && userVideos.length > 0) {
      // Delete video files from storage
      const videoFiles = userVideos
        .map((v) => {
          if (v.video_url) {
            const match = v.video_url.match(/\/videos\/(.+)$/);
            return match ? match[1] : null;
          }
          return null;
        })
        .filter(Boolean) as string[];

      if (videoFiles.length > 0) {
        await supabaseAdmin.storage.from("videos").remove(videoFiles);
      }

      // Delete video records
      const { count: videosCount } = await supabaseAdmin
        .from("videos")
        .delete({ count: "exact" })
        .eq("user_id", userId);
      deletionResults.videos = videosCount ?? 0;
    }

    // 14. Delete sounds created by user
    const { count: soundsCount } = await supabaseAdmin
      .from("sounds")
      .delete({ count: "exact" })
      .eq("created_by", userId);
    deletionResults.sounds = soundsCount ?? 0;

    // 15. Get profile for avatar deletion
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", userId)
      .single();

    // Delete avatar from storage
    if (profile?.avatar_url) {
      const avatarMatch = profile.avatar_url.match(/\/avatars\/(.+)$/);
      if (avatarMatch) {
        await supabaseAdmin.storage.from("avatars").remove([avatarMatch[1]]);
      }
    }

    // 16. Delete profile
    const { count: profileCount } = await supabaseAdmin
      .from("profiles")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    deletionResults.profiles = profileCount ?? 0;

    // 17. Finally, delete the auth user
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      logSecurityEvent(createSecurityLog(FUNCTION_NAME, "deletion_partial_failure", clientIp, {
        level: "error",
        success: false,
        userId,
        durationMs: timer(),
        error: deleteUserError.message,
        metadata: { partialDeletion: deletionResults },
      }));

      return new Response(
        JSON.stringify({ 
          error: "Failed to delete auth account", 
          details: deleteUserError.message,
          partialDeletion: deletionResults 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logSecurityEvent(createSecurityLog(FUNCTION_NAME, "deletion_complete", clientIp, {
      level: "info",
      success: true,
      userId,
      durationMs: timer(),
      metadata: { deletedCounts: deletionResults },
    }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Account and all associated data deleted successfully",
        deletedCounts: deletionResults 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logSecurityEvent(createSecurityLog(FUNCTION_NAME, "internal_error", clientIp, {
      level: "error",
      success: false,
      durationMs: timer(),
      error: error instanceof Error ? error.message : "Unknown error",
    }));

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
