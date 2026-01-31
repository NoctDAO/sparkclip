

# Plan: Scale to 1 Million Concurrent Users

## Current Architecture Analysis

After thoroughly reviewing the codebase, I've identified several areas that need attention to handle 1M concurrent users reliably.

### What's Already Good
- ✅ Database indexes exist on key query columns (likes_count, created_at, user_id)
- ✅ Full-text search indexes (GIN) on videos, profiles, sounds
- ✅ Client-side rate limiting on likes/comments/follows
- ✅ Efficient batch profile fetching (grouping by user IDs)
- ✅ RLS policies for security
- ✅ Triggers for count updates (likes_count, followers_count, etc.)

### Critical Bottlenecks Identified

| Issue | Impact | Severity |
|-------|--------|----------|
| No caching layer | Every user hits database directly | 🔴 Critical |
| Realtime on high-traffic tables | 1M subscriptions = massive overhead | 🔴 Critical |
| N+1 query patterns | Multiple DB calls per page load | 🟠 High |
| Video views table unbounded writes | Could grow to billions of rows | 🟠 High |
| Recommendations edge function does many queries | Not cached, slow for each request | 🟠 High |
| No connection pooling optimization | Database connections exhausted | 🟠 High |

---

## Implementation Plan

### Phase 1: Add Caching Layer

**1.1 Create trending_cache table** (already exists but underutilized)

The existing `trending_cache` table should be populated by a scheduled edge function instead of computed on-the-fly:

```text
New Edge Function: cache-trending-content
- Runs every 5 minutes via cron
- Pre-computes trending videos, hashtags, creators, sounds
- Stores results with TTL
- Frontend reads from cache instead of computing live
```

**1.2 Add response caching headers to edge functions**

All edge functions should return appropriate `Cache-Control` headers:
- Trending content: `max-age=300` (5 minutes)
- Recommendations: `max-age=60` (1 minute, personalized)
- Static content: `max-age=3600` (1 hour)

**1.3 Client-side query caching with React Query**

Configure stale-while-revalidate patterns:
```text
- Trending content: staleTime 5 minutes
- User profile: staleTime 1 minute  
- Video feed: staleTime 30 seconds
- Notifications: real-time only
```

### Phase 2: Optimize Database Queries

**2.1 Add composite indexes for common query patterns**

```text
New indexes needed:
- videos(user_id, created_at DESC) - for user's video feed
- videos(series_id, series_order) - for series navigation  
- follows(follower_id, following_id) - for follow checks
- likes(user_id, video_id) - for like status checks
- notifications(user_id, is_read, created_at DESC) - for notification queries
```

**2.2 Optimize the video feed query**

Current: 5+ separate queries (videos, profiles, sounds, series, interactions)
Target: 1-2 queries with proper JOINs or batch operations

```text
Create database function: get_feed_videos(user_id, feed_type, limit, offset)
- Returns videos with all joined data in one call
- Handles blocked users filtering at DB level
- Returns user's like/bookmark status in same query
```

**2.3 Partition video_views table**

```text
- Partition by month (video_views_2026_01, video_views_2026_02, etc.)
- Add automatic partition creation trigger
- Aggregate old partitions into daily summaries
- Keep only 7 days of raw data, rest as aggregates
```

### Phase 3: Optimize Realtime Subscriptions

**3.1 Limit realtime to essential tables only**

Currently enabled on: messages, conversations, video_views, notifications

Changes:
```text
- REMOVE: video_views (use polling instead)
- KEEP: messages (essential for DMs)
- KEEP: notifications (essential for alerts)
- MODIFY: conversations (use last_message_at polling instead)
```

**3.2 Add realtime filters**

Instead of subscribing to all notifications:
```text
Current: filter: user_id=eq.${user.id}
Better: Use compound filters and debounce updates
```

### Phase 4: Edge Function Optimizations

**4.1 Optimize get-recommendations function**

Current issues:
- 5-7 database queries per request
- No caching
- Sequential query execution

Solution:
```text
1. Pre-compute user affinities in background job
2. Store user_recommendations table with pre-computed results
3. Refresh every 15 minutes per active user
4. Edge function just reads from cache
```

**4.2 Add connection pooling awareness**

Use single Supabase client per request, not multiple:
```text
- Reuse client across all queries in a request
- Use Promise.all() for parallel queries
- Implement request-level caching
```

### Phase 5: CDN & Asset Optimization

**5.1 Video delivery optimization**

```text
- Supabase Storage already uses CDN
- Add video transcoding for adaptive bitrate
- Pre-generate multiple quality levels (360p, 720p, 1080p)
- Implement HLS streaming for large videos
```

**5.2 Thumbnail optimization**

Already implemented image transformations, but ensure:
```text
- Pre-generate common sizes on upload
- Use WebP format with JPEG fallback
- Set long cache TTLs (1 year for immutable content)
```

### Phase 6: Backend Scaling Configuration

**6.1 Database configuration**

Lovable Cloud handles most of this, but ensure:
```text
- Connection pool size appropriate for traffic
- Statement timeout to prevent long-running queries
- Vacuum/analyze schedules optimized
```

**6.2 Edge function concurrency**

```text
- Increase memory allocation for complex functions
- Add timeout handling and graceful degradation
- Implement circuit breaker pattern for external calls
```

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `supabase/functions/cache-trending/index.ts` | **NEW** - Background job to populate trending cache |
| `supabase/functions/get-recommendations/index.ts` | Add caching, optimize queries |
| `src/hooks/useRecommendations.ts` | Use React Query with proper cache config |
| `src/hooks/useNotifications.ts` | Reduce realtime overhead |
| `src/components/video/VideoFeed.tsx` | Optimize query batching |
| `src/hooks/useTrendingCache.ts` | **NEW** - Read from pre-computed cache |
| SQL migrations | Add composite indexes, partitioning, helper functions |

---

## Database Migrations Needed

```text
1. Add composite indexes for optimized queries
2. Create get_feed_videos() stored procedure  
3. Create refresh_trending_cache() function
4. Partition video_views table
5. Add user_recommendations cache table
6. Remove realtime from video_views table
```

---

## Implementation Priority

1. **Immediate** (Critical for scale):
   - Add trending cache population
   - Optimize video feed queries
   - Add missing composite indexes

2. **Short-term** (Within 1 week):
   - Implement React Query caching
   - Optimize recommendations edge function
   - Reduce realtime subscriptions

3. **Medium-term** (Within 1 month):
   - Partition video_views
   - Add video transcoding pipeline
   - Implement user recommendation pre-computation

---

## Expected Performance Improvements

| Metric | Current | After Optimization |
|--------|---------|-------------------|
| DB queries per feed load | 5-7 | 1-2 |
| Trending page load | 200-500ms | 50-100ms (cached) |
| Recommendations latency | 300-800ms | 50-150ms (cached) |
| Realtime connections | 1M+ | ~200K (messages/notifications only) |
| Database connections | Exhausted at ~100K | Sustainable at 1M+ |

---

## Monitoring Recommendations

To ensure the optimizations work at scale:
```text
- Monitor query execution times
- Track cache hit rates
- Alert on slow queries (>500ms)
- Monitor connection pool utilization
- Track edge function cold starts
```

