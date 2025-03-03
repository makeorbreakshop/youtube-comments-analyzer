import React, { useState, useEffect } from 'react';
import { CommentData } from '@/lib/types';
import { tokens, componentStyles } from '@/lib/design-system';
import { motion, AnimatePresence } from 'framer-motion';
import { sanitizeAndRenderHtml } from '@/lib/content-utils';

interface CommentItemProps {
  comment: CommentData;
  level?: number;
  maxLevel?: number;
}

export default function CommentItem({ comment, level = 0, maxLevel = 3 }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [loadedReplies, setLoadedReplies] = useState<CommentData[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Fix for comments with incorrect reply counts
  const [fixedReplyCount, setFixedReplyCount] = useState<number | null>(null);
  const hasReplies = fixedReplyCount !== null ? fixedReplyCount > 0 : (comment.replyCount > 0);
  const canShowMoreReplies = level < maxLevel;
  
  // Auto-fix the reply count for this comment on mount
  useEffect(() => {
    const fixReplyCount = async () => {
      try {
        // Use our new endpoint that doesn't rely on database updates
        const response = await fetch(`/api/fix-comment-ui?commentId=${comment.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setFixedReplyCount(data.replyCount);
            
            // If replies are already available, set them
            if (data.replies && data.replies.length > 0) {
              const mappedReplies = data.replies.map((reply: any) => ({
                id: reply.comment_id,
                authorDisplayName: reply.author_name,
                authorProfileImageUrl: reply.author_profile_url,
                textDisplay: reply.text,
                likeCount: reply.like_count,
                publishedAt: reply.published_at,
                updatedAt: reply.updated_at,
                videoId: reply.video_id,
                videoTitle: reply.video_title,
                replyCount: reply.reply_count,
                isHeartedByCreator: false,
                isPinned: false,
                parentId: reply.parent_id,
                replies: []
              }));
              setLoadedReplies(mappedReplies);
            }
          }
        }
      } catch (error) {
        console.error('Error fixing reply count:', error);
      }
    };
    
    // If the comment shows 0 reply count but we suspect it has replies, fix it
    if (comment.id) {
      fixReplyCount();
    }
  }, [comment.id]);
  
  const fetchReplies = async () => {
    // If replies are already loaded, just toggle visibility
    if (loadedReplies.length > 0) {
      setShowReplies(!showReplies);
      return;
    }
    
    setIsLoadingReplies(true);
    setError(null);
    
    try {
      // Use our new endpoint that doesn't rely on database updates
      const response = await fetch(`/api/fix-comment-ui?commentId=${comment.id}`);
      if (!response.ok) {
        throw new Error(`Error fetching replies: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.replies && data.replies.length > 0) {
        const mappedReplies = data.replies.map((reply: any) => ({
          id: reply.comment_id,
          authorDisplayName: reply.author_name,
          authorProfileImageUrl: reply.author_profile_url,
          textDisplay: reply.text,
          likeCount: reply.like_count,
          publishedAt: reply.published_at,
          updatedAt: reply.updated_at,
          videoId: reply.video_id,
          videoTitle: reply.video_title,
          replyCount: reply.reply_count,
          isHeartedByCreator: false,
          isPinned: false,
          parentId: reply.parent_id,
          replies: []
        }));
        
        setLoadedReplies(mappedReplies);
        setShowReplies(true);
        // Update our fixed count
        setFixedReplyCount(data.replyCount);
      } else if (data.replyCount === 0) {
        // No replies found
        setFixedReplyCount(0);
        setError("No replies found for this comment");
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
      setError(error instanceof Error ? error.message : 'Failed to load replies');
    } finally {
      setIsLoadingReplies(false);
    }
  };

  return (
    <div 
      className={`py-4 ${level > 0 ? 'border-l-2 border-gray-100 pl-4 ml-4' : 'border-b border-gray-200'} last:border-none`}
      data-comment-id={comment.id}
    >
      <div className="flex space-x-4">
        {/* Author avatar */}
        <div className="flex-shrink-0">
          <img 
            className="h-10 w-10 rounded-full border border-gray-200"
            src={comment.authorProfileImageUrl || '/default-avatar.png'} 
            alt={comment.authorDisplayName}
          />
        </div>

        {/* Comment content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={tokens.typography.title.card}>
              {comment.authorDisplayName}
            </h3>
            <time dateTime={comment.publishedAt} className={tokens.typography.body.meta}>
              {new Date(comment.publishedAt).toLocaleDateString()}
            </time>
          </div>
          
          <div 
            className={`mt-1 ${tokens.typography.body.default} comment-text whitespace-pre-line`}
            dangerouslySetInnerHTML={sanitizeAndRenderHtml(comment.textDisplay)}
          />
          
          <div className="mt-2 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span className={tokens.typography.body.meta}>
                <svg className="inline-block h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                </svg>
                {comment.likeCount > 0 ? comment.likeCount : 'No'} likes
              </span>
              
              {hasReplies && !canShowMoreReplies && (
                <a 
                  href={`/debug-replies?commentId=${comment.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${tokens.typography.body.meta} text-blue-600 hover:underline`}
                >
                  View {fixedReplyCount || comment.replyCount} more {(fixedReplyCount || comment.replyCount) === 1 ? 'reply' : 'replies'}
                </a>
              )}
            </div>
            
            {hasReplies && canShowMoreReplies && (
              <button
                onClick={fetchReplies}
                className={componentStyles.button.secondary}
                disabled={isLoadingReplies}
                aria-expanded={showReplies}
                aria-label={showReplies ? "Hide replies" : "Show replies"}
              >
                {isLoadingReplies ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  showReplies 
                    ? `Hide ${loadedReplies.length} ${loadedReplies.length === 1 ? 'reply' : 'replies'}`
                    : `View ${fixedReplyCount || comment.replyCount} ${(fixedReplyCount || comment.replyCount) === 1 ? 'reply' : 'replies'}`
                )}
              </button>
            )}
          </div>
          
          {error && (
            <div className="mt-2 p-2 text-sm text-red-600 bg-red-50 rounded">
              {error}
            </div>
          )}
          
          {/* Replies container */}
          <AnimatePresence>
            {showReplies && loadedReplies.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-4"
              >
                {loadedReplies.map(reply => (
                  <CommentItem 
                    key={reply.id} 
                    comment={reply}
                    level={level + 1}
                    maxLevel={maxLevel}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
} 