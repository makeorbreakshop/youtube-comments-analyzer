import React from 'react';
import { CommentData } from '@/lib/types';
import { CommentItem } from './';
import { tokens, componentStyles } from '@/lib/design-system';

interface CommentListProps {
  comments: CommentData[];
  isLoading: boolean;
}

export default function CommentList({ comments, isLoading }: CommentListProps) {
  if (isLoading && comments.length === 0) {
    return <CommentSkeleton />;
  }
  
  if (comments.length === 0) {
    return <CommentEmptyState />;
  }
  
  return (
    <div className="divide-y divide-gray-200">
      {comments.map(comment => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className={`${componentStyles.card.default} ${tokens.spacing.card.default}`}>
      <div className="animate-pulse space-y-4">
        <div className="flex items-start space-x-4">
          <div className="rounded-full bg-gray-200 h-10 w-10"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentEmptyState() {
  return (
    <div className={`${componentStyles.card.default} ${tokens.spacing.card.default} text-center`}>
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      </svg>
      <h3 className={`mt-2 ${tokens.typography.title.card}`}>No comments found</h3>
      <p className={`mt-1 ${tokens.typography.body.default}`}>No comments match your current filter criteria.</p>
    </div>
  );
} 