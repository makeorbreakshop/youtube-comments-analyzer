import React, { useState } from 'react';
import { CommentData } from '../lib/types';
import { getCommentReplies } from '../lib/youtube';
import CommentReplies from './CommentReplies';
import DOMPurify from 'isomorphic-dompurify';
import CommentText from './CommentText';
import { decodeAllHtmlEntities } from '../lib/utils';

interface CommentItemProps {
  comment: CommentData;
  children?: React.ReactNode;
}

const CommentItem = ({ comment, children }: CommentItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleReplies = async () => {
    if (!expanded && !replies.length && comment.replyCount > 0) {
      setLoading(true);
      try {
        const replyData = await getCommentReplies(comment.id);
        setReplies(replyData);
      } catch (error) {
        console.error("Error fetching replies:", error);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <div className="border-b border-gray-200 py-4">
      <div className="flex items-start space-x-3">
        <img 
          src={comment.authorProfileImageUrl} 
          alt={comment.authorDisplayName}
          className="w-10 h-10 rounded-full"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">{comment.authorDisplayName}</h3>
            <span className="text-xs text-gray-500">
              {new Date(comment.publishedAt).toLocaleDateString()}
            </span>
          </div>
          
          <CommentText 
            text={comment.textDisplay} 
            className="mt-2" 
            useHtml={true}
          />
          
          {children}
          
          <div className="mt-2 text-xs text-gray-500 flex items-center space-x-4">
            <span>👍 {comment.likeCount}</span>
            
            {comment.replyCount > 0 && (
              <button 
                onClick={toggleReplies}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
              >
                <span>💬 {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${expanded ? 'transform rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Show loading indicator or replies */}
          {loading && (
            <div className="mt-3 pl-6 py-2">
              <div className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-gray-200 h-8 w-8"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-2 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          )}
          
          {expanded && !loading && replies.length > 0 && (
            <CommentReplies replies={replies} />
          )}
          
          {expanded && !loading && replies.length === 0 && comment.replyCount > 0 && (
            <div className="mt-3 pl-6 text-sm text-gray-500">
              Unable to load replies. Please try again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentItem; 