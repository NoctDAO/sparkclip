/**
 * Rate limit error detection and user-friendly messaging
 */

// Action-specific rate limit messages
const RATE_LIMIT_MESSAGES: Record<string, { title: string; description: string; waitTime: string }> = {
  video_upload: {
    title: "Upload limit reached",
    description: "You've uploaded too many videos recently.",
    waitTime: "Please wait about an hour before uploading again.",
  },
  comment: {
    title: "Comment limit reached", 
    description: "You're commenting too quickly.",
    waitTime: "Please wait a few minutes before commenting again.",
  },
  like: {
    title: "Like limit reached",
    description: "You're liking content too quickly.",
    waitTime: "Please wait a few minutes before liking again.",
  },
  follow: {
    title: "Follow limit reached",
    description: "You're following users too quickly.",
    waitTime: "Please wait a few minutes before following again.",
  },
  report: {
    title: "Report limit reached",
    description: "You've submitted too many reports recently.",
    waitTime: "Please wait about an hour before reporting again.",
  },
  message: {
    title: "Message limit reached",
    description: "You're sending messages too quickly.",
    waitTime: "Please wait a few minutes before sending another message.",
  },
  default: {
    title: "Slow down!",
    description: "You're performing this action too quickly.",
    waitTime: "Please wait a moment and try again.",
  },
};

/**
 * Check if an error is a rate limit violation from RLS
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;
  
  const errorMessage = error instanceof Error 
    ? error.message 
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  
  // RLS policy violations that include rate limit function names
  return (
    errorMessage.includes('row-level security') ||
    errorMessage.includes('violates row-level security policy') ||
    errorMessage.includes('new row violates') ||
    errorMessage.includes('check constraint')
  );
}

/**
 * Get a user-friendly rate limit message based on the action type
 */
export function getRateLimitMessage(actionType?: string): { title: string; description: string } {
  const message = actionType && RATE_LIMIT_MESSAGES[actionType] 
    ? RATE_LIMIT_MESSAGES[actionType]
    : RATE_LIMIT_MESSAGES.default;
  
  return {
    title: message.title,
    description: `${message.description} ${message.waitTime}`,
  };
}

/**
 * Determine action type from table/context for better error messages
 */
export function inferActionType(context: string): string {
  const contextLower = context.toLowerCase();
  
  if (contextLower.includes('video') || contextLower.includes('upload')) return 'video_upload';
  if (contextLower.includes('comment')) return 'comment';
  if (contextLower.includes('like')) return 'like';
  if (contextLower.includes('follow')) return 'follow';
  if (contextLower.includes('report')) return 'report';
  if (contextLower.includes('message')) return 'message';
  
  return 'default';
}
