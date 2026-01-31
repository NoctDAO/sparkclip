
# Discovery & Engagement Features

## Overview
Implement a complete discovery system with advanced search, trending content, personalized recommendations, and hashtag exploration.

## Phase 1: Database Schema Updates
We need to track engagement signals for recommendations:

### New Tables:
1. **user_interactions** - Track detailed engagement for recommendations
   - user_id, video_id, interaction_type (view, like, share, complete), created_at, watch_percentage

2. **trending_cache** - Cache trending calculations (updated periodically)
   - entity_type (hashtag, sound, video), entity_id, score, period (hourly, daily, weekly), updated_at

### Index Additions:
- Full-text search indexes on videos.caption, profiles.username, sounds.title
- Indexes on hashtags array for faster lookups

---

## Phase 2: Advanced Search

### Features:
- **Unified search bar** with autocomplete
- **Tabbed results**: Videos, Users, Sounds, Hashtags
- **Filters**: Date range, sort by (relevance, recent, popular)
- **Search history** for logged-in users

### Components:
```text
src/components/search/
├── SearchBar.tsx         # Main search input with autocomplete
├── SearchResults.tsx     # Tabbed results container
├── VideoResults.tsx      # Video grid with infinite scroll
├── UserResults.tsx       # User list with follow buttons
├── SoundResults.tsx      # Sound cards
├── HashtagResults.tsx    # Hashtag chips with video counts
└── SearchHistory.tsx     # Recent searches
```

---

## Phase 3: Trending Section

### Features:
- **Trending Now** carousel on Discover page
- **Trending Hashtags** with video counts
- **Trending Sounds** with usage counts
- **Trending Creators** (rising profiles)

### Components:
```text
src/components/trending/
├── TrendingSection.tsx      # Container for all trending
├── TrendingHashtags.tsx     # Horizontal scroll of hashtags
├── TrendingVideos.tsx       # Featured video carousel
└── TrendingCreators.tsx     # Creator cards
```

---

## Phase 4: Recommendation Algorithm

### Signals (weighted):
1. **Watch completion** (highest weight) - Videos watched >75%
2. **Likes** - Explicit positive signal
3. **Follows** - Content from followed creators
4. **Hashtag affinity** - Hashtags user engages with
5. **Sound affinity** - Sounds user engages with
6. **Recency** - Newer content boosted

### Implementation:
- Edge function `get-recommendations` calculates personalized feed
- Falls back to trending for new/anonymous users
- Caches recommendations per user (refreshed on scroll)

### Feed Types:
- **For You** - Personalized recommendations
- **Following** - Only from followed creators (existing)

---

## Phase 5: Hashtag Exploration

### Features:
- **Hashtag detail page** (`/hashtag/:tag`)
- Video count and related hashtags
- Videos sorted by recent/popular
- "Use this sound" style button for hashtags

### Components:
```text
src/pages/HashtagPage.tsx     # Full hashtag exploration
src/components/HashtagChip.tsx # Clickable hashtag with count
```

---

## File Changes Summary

### New Files:
- `src/pages/Search.tsx` - Search page
- `src/pages/HashtagPage.tsx` - Hashtag detail page
- `src/components/search/*` - Search components
- `src/components/trending/*` - Trending components
- `src/hooks/useSearch.ts` - Search hook with debounce
- `src/hooks/useRecommendations.ts` - Recommendation fetching
- `supabase/functions/get-recommendations/index.ts` - Recommendation engine

### Modified Files:
- `src/pages/Discover.tsx` - Add trending section
- `src/pages/Index.tsx` - Integrate recommendation feed
- `src/App.tsx` - Add new routes
- `src/components/layout/BottomNav.tsx` - Search icon link

### Database Migrations:
- Add full-text search indexes
- Create user_interactions table
- Create trending_cache table
- Add search history support

---

## Visual Layout

**Discover Page:**
```text
+----------------------------------+
|  🔍 Search...                    |
+----------------------------------+
|  🔥 Trending Hashtags            |
|  [#dance] [#comedy] [#fyp] →     |
+----------------------------------+
|  📈 Trending Videos              |
|  [Video] [Video] [Video] →       |
+----------------------------------+
|  🎵 Trending Sounds              |
|  [Sound] [Sound] [Sound] →       |
+----------------------------------+
|  ⭐ Rising Creators              |
|  [Creator] [Creator] →           |
+----------------------------------+
```

**Search Results:**
```text
+----------------------------------+
|  🔍 "dance"                   ✕  |
+----------------------------------+
| [Videos] [Users] [Sounds] [Tags] |
+----------------------------------+
|  +-------+  +-------+  +-------+ |
|  | Video |  | Video |  | Video | |
|  +-------+  +-------+  +-------+ |
|  +-------+  +-------+  +-------+ |
|  | Video |  | Video |  | Video | |
|  +-------+  +-------+  +-------+ |
+----------------------------------+
```
