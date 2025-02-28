import React, { useState } from 'react';
import { CommentData } from '@/lib/types';
import { sanitizeAndRenderHtml } from '@/lib/content-utils';
import { componentStyles, tokens } from '@/lib/design-system';

interface CommentWithRepliesProps {
  comment: CommentData;
  comments: CommentData[];
  setComments: React.Dispatch<React.SetStateAction<CommentData[]>>;
}

export default function CommentWithReplies({ comment, comments, setComments }: CommentWithRepliesProps) {
  const [showReplies, setShowReplies] = useState<string[]>([]);

  const handleRepliesToggle = (commentId: string) => {
    if (showReplies.includes(commentId)) {
      setShowReplies(prev => prev.filter(id => id !== commentId));
    } else {
      setShowReplies(prev => [...prev, commentId]);
    }
  };

  return (
    <div className="py-4 px-4">
      <div className="flex space-x-3">
        <img 
          className="h-10 w-10 rounded-full" 
          src={comment.authorProfileImageUrl} 
          alt={comment.authorDisplayName}
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{comment.authorDisplayName}</h3>
            <p className="text-sm text-gray-500">
              {new Date(comment.publishedAt).toLocaleDateString()}
            </p>
          </div>
          
          <div 
            className="mt-1 text-sm text-gray-700 whitespace-pre-line"
            dangerouslySetInnerHTML={sanitizeAndRenderHtml(comment.textDisplay)}
          />
          
          <div className="mt-2 flex items-center space-x-4">
            <span className="text-xs text-gray-500">
              {comment.likeCount} likes
            </span>
            {comment.replyCount > 0 && (
              <button
                onClick={() => handleRepliesToggle(comment.id)}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                {showReplies.includes(comment.id) ? 'Hide replies' : `Show ${comment.replyCount} replies`}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {showReplies.includes(comment.id) && comment.replies && (
        <div className="mt-4 pl-14 space-y-4">
          {comment.replies.map(reply => (
            <div key={reply.id} className="flex space-x-3">
              <img 
                className="h-8 w-8 rounded-full" 
                src={reply.authorProfileImageUrl} 
                alt={reply.authorDisplayName}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium">{reply.authorDisplayName}</h4>
                  <p className="text-xs text-gray-500">
                    {new Date(reply.publishedAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div 
                  className="mt-1 text-xs text-gray-700 whitespace-pre-line"
                  dangerouslySetInnerHTML={sanitizeAndRenderHtml(reply.textDisplay)}
                />
                
                <div className="mt-2 flex items-center">
                  <div className="flex items-center text-xs text-gray-500">
                    {reply.likeCount} likes
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 