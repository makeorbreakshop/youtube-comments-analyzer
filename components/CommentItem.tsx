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
      const replyData = await getCommentReplies(comment.id);
      setReplies(replyData);
      setLoading(false);
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
              <span>💬 {comment.replyCount} replies</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentItem; 