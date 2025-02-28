"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Comment {
  id: string;
  videoId: string;
  videoTitle: string;
  authorName: string;
  authorProfileUrl: string;
  text: string;
  likeCount: number;
  publishedAt: string;
  replyCount?: number;
}

interface CommentsListProps {
  comments: Comment[];
}

export default function CommentsList({ comments }: CommentsListProps) {
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const toggleComment = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  if (comments.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        No comments found matching your filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4">
            <div className="flex items-start">
              <img 
                src={comment.authorProfileUrl || "https://via.placeholder.com/40"} 
                alt={comment.authorName} 
                className="w-10 h-10 rounded-full mr-4"
              />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{comment.authorName}</h3>
                    <p className="text-sm text-gray-500">
                      {format(new Date(comment.publishedAt), 'MM/dd/yyyy')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{comment.videoTitle}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-gray-700" 
                     dangerouslySetInnerHTML={{ 
                       __html: comment.text
                     }}
                  />
                </div>
                {comment.replyCount && comment.replyCount > 0 && (
                  <button
                    onClick={() => toggleComment(comment.id)}
                    className="mt-2 flex items-center text-sm text-gray-600 hover:text-gray-900"
                  >
                    {expandedComments.has(comment.id) ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Hide replies
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Replies section - would fetch from API in a real implementation */}
          {expandedComments.has(comment.id) && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <div className="pl-14">
                <p className="text-sm text-gray-500">
                  Replies would be loaded here in a real implementation.
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 