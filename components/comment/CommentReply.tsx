import React from 'react';
import { CommentData } from '@/lib/types';
import { tokens, componentStyles } from '@/lib/design-system';

interface CommentReplyProps {
  reply: CommentData;
}

export default function CommentReply({ reply }: CommentReplyProps) {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0">
        <img 
          className="h-8 w-8 rounded-full border border-gray-200" 
          src={reply.authorProfileImageUrl || '/default-avatar.png'} 
          alt={`${reply.authorDisplayName}'s profile`} 
        />
      </div>
      <div className="flex-1 min-w-0 bg-gray-50 rounded-md p-3">
        <div className="flex items-center justify-between mb-1">
          <p className={tokens.typography.title.card}>
            {reply.authorDisplayName}
          </p>
          <span className={tokens.typography.body.meta}>
            {new Date(reply.publishedAt).toLocaleDateString()}
          </span>
        </div>
        <p className={`${tokens.typography.body.default} whitespace-pre-line`}>
          {reply.textDisplay}
        </p>
      </div>
    </div>
  );
} 