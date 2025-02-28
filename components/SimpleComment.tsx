import React, { useState, useEffect, useRef } from 'react';
import { CommentData } from '@/lib/types';
import CommentText from './CommentText';

interface SimpleCommentProps {
  comment: CommentData;
  onDelete?: (commentId: string) => void;
}

export function SimpleComment({ comment, onDelete }: SimpleCommentProps) {
  const [replies, setReplies] = useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);
  
  // Refs for measuring content height
  const repliesRef = useRef<HTMLDivElement>(null);
  
  // Safe access to optional properties
  const hasCreatorHeart = comment.isHeartedByCreator ?? false;
  const videoTitle = comment.videoTitle ?? 'Unknown Video';
  const replyCount = comment.replyCount || 0;
  
  // Update height when replies change or toggle
  useEffect(() => {
    if (showReplies && repliesRef.current) {
      setHeight(repliesRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [showReplies, replies]);
  
  async function handleToggleReplies() {
    if (isLoading) return;
    
    if (showReplies) {
      // Just hide replies if already loaded
      setShowReplies(false);
      return;
    }
    
    // If we have replies already loaded, just show them
    if (replies.length > 0) {
      setShowReplies(true);
      return;
    }
    
    // Otherwise load replies
    setIsLoading(true);
    try {
      const response = await fetch(`/api/comment-replies?commentId=${comment.id}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching replies: ${response.status}`);
      }
      
      const data = await response.json();
      
      setReplies(data.replies || []);
      setShowReplies(true);
    } catch (error) {
      console.error("Error loading replies:", error);
      setError("Failed to load replies");
    } finally {
      setIsLoading(false);
    }
  }

  // Check if this component should show a reply button
  const showReplyButton = !comment.parentId; // Always show for top-level comments

  return (
    <div className="py-4 px-4 border-b border-gray-200 last:border-0">
      <div className="flex space-x-3">
        <img 
          className="h-10 w-10 rounded-full" 
          src={comment.authorProfileImageUrl} 
          alt={`Profile of ${comment.authorDisplayName}`}
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{comment.authorDisplayName}</h3>
            <p className="text-sm text-gray-500">
              {new Date(comment.publishedAt).toLocaleDateString()}
            </p>
          </div>
          
          <CommentText text={comment.textDisplay} className="mt-1 text-sm text-gray-700 whitespace-pre-line" />
          
          <div className="mt-2 flex items-center space-x-4">
            {/* Likes count */}
            <span className="text-xs text-gray-500 flex items-center">
              <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
              {comment.likeCount}
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
                {replyCount}
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
                    onDelete={onDelete}
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