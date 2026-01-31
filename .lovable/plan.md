
# AI Auto-Moderation Integration Plan

## Overview
This plan connects the existing `moderate-content` edge function to automatically analyze and flag potentially harmful content during video uploads and comment submissions. The AI moderation uses Lovable AI (Gemini) to detect policy violations like hate speech, harassment, spam, and adult content.

## Current Architecture

The `moderate-content` edge function is already fully implemented with:
- Keyword blocklist checking (fast, first pass)
- AI analysis using Lovable AI (Gemini 2.5 Flash)
- Automatic flagging to `content_flags` table
- Returns `blocked: true` for immediate blocks, `safe: false` for flagged content

## Implementation Steps

### Step 1: Create Moderation Utility Hook

Create a reusable hook to call the moderation edge function from anywhere in the app.

**File: `src/hooks/useContentModeration.ts`**

This hook will:
- Provide a `moderateContent()` function that calls the edge function
- Accept content, content type (video/comment), and content ID
- Return moderation results including whether content is safe, blocked, or flagged
- Handle errors gracefully (fail open - allow content if moderation fails)

### Step 2: Integrate into Video Upload

**File: `src/pages/Upload.tsx`**

Modify the upload flow to:
1. After video record is created, call moderation with caption + hashtags combined
2. If content is **blocked** (matched blocking keyword):
   - Delete the video record
   - Remove uploaded video file from storage
   - Show clear error message explaining content was not allowed
3. If content is **flagged** (AI detected issues):
   - Keep the video visible (innocent until proven guilty)
   - Content appears in moderation queue for review
   - Optional: Show toast that video is under review
4. If content is **safe**:
   - Proceed normally with success message

### Step 3: Integrate into Comment Submission

**File: `src/components/video/CommentsSheet.tsx`**

Modify the comment flow to:
1. Before inserting comment, call moderation with comment content
2. If content is **blocked**:
   - Do not insert the comment
   - Show error message that comment violates guidelines
3. If content is **flagged**:
   - Insert comment normally (visible to users)
   - Flag is created in moderation queue
4. If content is **safe**:
   - Proceed normally

### Step 4: Update Edge Function CORS Headers

**File: `supabase/functions/moderate-content/index.ts`**

Add the additional CORS headers required for Lovable Cloud compatibility.

## Technical Details

### Moderation Hook API

```typescript
interface ModerationResult {
  safe: boolean;
  blocked: boolean;
  issues: string[];
  confidence: number;
  flag_type: string | null;
}

const { moderateContent, isLoading } = useContentModeration();

// Usage
const result = await moderateContent({
  content: "text to check",
  content_type: "video" | "comment",
  content_id: "uuid-of-content"
});
```

### Upload Flow Diagram

```text
User clicks Post
       |
       v
Upload video file to storage
       |
       v
Create video record in database
       |
       v
Call moderation with caption + hashtags
       |
       +-- Blocked? --> Delete video & file --> Show error
       |
       +-- Flagged? --> Show success (content under review)
       |
       +-- Safe? --> Show success
```

### Comment Flow Diagram

```text
User submits comment
       |
       v
Call moderation with comment content
       |
       +-- Blocked? --> Show error, don't insert
       |
       v
Insert comment into database
       |
       +-- Flagged? --> Auto-created in content_flags
       |
       +-- Safe? --> Show normally
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useContentModeration.ts` | Create | Reusable moderation hook |
| `src/pages/Upload.tsx` | Modify | Add moderation after video creation |
| `src/components/video/CommentsSheet.tsx` | Modify | Add moderation before comment insert |
| `supabase/functions/moderate-content/index.ts` | Modify | Update CORS headers |

## User Experience

### Video Upload
- User sees "Posting..." during upload and moderation
- If blocked: "Your video couldn't be posted because it may violate our community guidelines"
- If flagged: "Video posted! It will be visible while our team reviews it"
- If safe: "Video uploaded successfully!"

### Comments
- If blocked: "This comment couldn't be posted. Please revise and try again"
- If flagged/safe: Normal behavior (comment appears immediately)

## Edge Cases Handled

1. **Moderation service fails**: Content is allowed (fail open) to prevent blocking legitimate users
2. **Empty caption/hashtags**: Skip moderation for videos with no text content
3. **Rate limiting**: Moderation is called after rate limit check for comments
4. **Cleanup on block**: If video is blocked post-upload, both the database record and storage file are deleted

## Security Considerations

- Moderation runs server-side in edge function with service role key
- Users cannot bypass moderation by calling the API directly (content_flags require admin review)
- Failed moderation gracefully degrades to allow content (prevents denial of service)
