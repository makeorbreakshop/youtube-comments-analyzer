import React, { useState } from 'react';
import { CommentData } from '@/lib/types';
import { CommentReply } from './';
import { tokens, componentStyles } from '@/lib/design-system';
import { motion, AnimatePresence } from 'framer-motion';
import { sanitizeAndRenderHtml } from '@/lib/content-utils';

interface CommentItemProps {
  comment: CommentData;
}

export default function CommentItem({ comment }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [loadedReplies, setLoadedReplies] = useState<CommentData[]>([]);
  const hasReplies = comment.replyCount > 0;
  
  const fetchReplies = async () => {
    if (loadedReplies.length > 0) {
      setShowReplies(!showReplies);
      return;
    }
    
    setIsLoadingReplies(true);
    try {
      const response = await fetch(`/api/comment-replies?commentId=${comment.id}`);
      const data = await response.json();
      
      if (data.replies) {
        setLoadedReplies(data.replies);
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setIsLoadingReplies(false);
      setShowReplies(true);
    }
  };

  return (
    <div className="py-5 border-b border-gray-200 last:border-none">
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
            <div className="flex items-center space-x-2">
              <span className={tokens.typography.body.meta}>
                <svg className="inline-block h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                </svg>
                {comment.likeCount > 0 ? comment.likeCount : 'No'} likes
              </span>
              
              {comment.videoTitle && (
                <span className={tokens.typography.body.meta}>
                  <svg className="inline-block h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                  {comment.videoTitle.length > 30 ? comment.videoTitle.substring(0, 30) + '...' : comment.videoTitle}
                </span>
              )}
            </div>
            
            {hasReplies && (
              <button
                onClick={fetchReplies}
                className={componentStyles.button.secondary}
                disabled={isLoadingReplies}
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
                    : `View ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`
                )}
              </button>
            )}
          </div>
          
          {/* Replies container */}
          <AnimatePresence>
            {showReplies && loadedReplies.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pl-8 space-y-4"
              >
                {loadedReplies.map(reply => (
                  <CommentReply key={reply.id} reply={reply} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
} 