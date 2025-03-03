import React, { useState, useEffect, useRef } from 'react';
import { CommentData } from '../lib/types';
import Image from 'next/image';
import CommentText from './CommentText';
import { formatDistanceToNow } from 'date-fns';

export interface SimpleCommentProps {
  comment: CommentData;
  isReply?: boolean;
}

export function SimpleComment({ comment, isReply = false }: SimpleCommentProps) {
  const [replies, setReplies] = useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const repliesRef = useRef<HTMLDivElement>(null);

  // Track reply count from database
  const [replyCount, setReplyCount] = useState(comment.replyCount || 0);

  // Safe access to optional properties
  const hasCreatorHeart = comment.isHeartedByCreator ?? false;
  const videoTitle = comment.videoTitle ?? 'Unknown Video';

  // Update height when replies change or toggle
  useEffect(() => {
    if (showReplies && repliesRef.current) {
      setHeight(repliesRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [showReplies, replies]);

  // Simpler toggle function that always fetches fresh data
  async function handleToggleReplies() {
    if (isLoading) return;
    
    if (showReplies) {
      // Just hide replies if they're already shown
      setShowReplies(false);
      return;
    }
    
    // Always fetch the latest replies from the API
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching replies for comment ID: ${comment.id}`);
      
      const response = await fetch(`/api/comment-replies?commentId=${comment.id}`);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Found ${data.replies?.length || 0} replies for comment ${comment.id}`);
      
      // Update both the reply count and the replies
      setReplyCount(data.replyCount || 0);
      setReplies(data.replies || []);
      setShowReplies(true);
    } catch (error) {
      console.error('Error fetching replies:', error);
      setError('Failed to load replies. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Check if this component should show a reply button
  const showReplyButton = !isReply; // Only show for top-level comments

  return (
    <div className="py-4 px-4 border-b border-gray-200 last:border-0">
      <div className="flex space-x-3">
        {comment.authorProfileImageUrl ? (
          <img 
            className="h-10 w-10 rounded-full" 
            src={comment.authorProfileImageUrl} 
            alt={`Profile of ${comment.authorDisplayName}`}
          />
        ) : (
          <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-gray-500">?</span>
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{comment.authorDisplayName}</h3>
            <p className="text-sm text-gray-500">
              {comment.publishedAt ? 
                formatDistanceToNow(new Date(comment.publishedAt), { addSuffix: true }) :
                'unknown date'
              }
            </p>
          </div>
          
          <CommentText text={comment.textDisplay || ''} className="mt-1 text-sm text-gray-700 whitespace-pre-line" />
          
          <div className="mt-2 flex items-center space-x-4">
            {/* Likes count */}
            <span className="text-xs text-gray-500 flex items-center">
              <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
              {comment.likeCount || 0}
            </span>
            
            {/* Reply count - only for top-level comments */}
            {showReplyButton && (
              <span 
                className={`text-xs ${
                  replyCount > 0 
                    ? 'text-blue-600 hover:text-blue-800 cursor-pointer' 
                    : 'text-gray-500'
                } flex items-center`}
                onClick={replyCount > 0 ? handleToggleReplies : undefined}
                aria-expanded={showReplies}
                aria-controls={`replies-${comment.id}`}
                role="button"
                tabIndex={replyCount > 0 ? 0 : -1}
              >
                <svg 
                  className={`h-4 w-4 mr-1 transform transition-transform duration-200 ${showReplies ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </span>
            )}
            
            {isLoading && (
              <span className="text-xs text-gray-500 flex items-center">
                <svg className="animate-spin h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading
              </span>
            )}
          </div>
          
          {/* Error message */}
          {error && (
            <div className="mt-2 text-xs text-red-500">
              Error loading replies: {error}
            </div>
          )}
          
          {/* Animated replies container */}
          <div 
            id={`replies-${comment.id}`}
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ 
              maxHeight: height !== undefined ? `${height}px` : undefined,
              opacity: showReplies ? 1 : 0
            }}
          >
            <div ref={repliesRef} className="ml-6 mt-2 border-l-2 border-gray-200 pl-4">
              {replies.length > 0 ? (
                replies.map(reply => (
                  <SimpleComment 
                    key={reply.id} 
                    comment={reply} 
                    isReply={true} 
                  />
                ))
              ) : (
                <p className="text-gray-500 text-sm py-2">No replies found</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 