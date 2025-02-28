import React, { useState, useEffect } from 'react';
import { CommentData } from '../lib/types';
import CommentItem from './CommentItem';
import CommentText from './CommentText';
import { SimpleComment } from './SimpleComment';

interface CommentListProps {
  channelId: string;
}

export function CommentList({ channelId }: CommentListProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const perPage = 50;

  useEffect(() => {
    fetchComments();
  }, [channelId, sortBy, sortDirection, page]);

  async function fetchComments() {
    if (!channelId) return;
    
    setIsLoading(true);
    try {
      console.log(`Fetching comments with sorting: ${sortBy} ${sortDirection}`);
      const response = await fetch(
        `/api/comments?channelId=${channelId}&page=${page}&perPage=${perPage}&sortBy=${sortBy}&sortDirection=${sortDirection}`
      );
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Received ${data.comments?.length} comments`);
      
      // Debug the first few comments
      if (data.comments?.length > 0) {
        data.comments.slice(0, 5).forEach((comment, i) => {
          console.log(`Comment ${i+1}: ID=${comment.id}, ReplyCount=${comment.replyCount}`);
        });
      }
      
      setComments(data.comments);
      setTotalCount(data.totalCount);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSortChange(newSortBy) {
    // If clicking the same sort, toggle direction
    if (newSortBy === sortBy) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New sort type, reset to descending
      setSortBy(newSortBy);
      setSortDirection('desc');
    }
    // Reset to page 1 when sort changes
    setPage(1);
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Comments ({totalCount})</h2>
      
      <div className="space-y-4">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment}>
              {/* No need for nested CommentText since it's handled in CommentItem */}
            </CommentItem>
          ))
        ) : (
          <div className="text-center py-10 text-gray-500">
            No comments found
          </div>
        )}
      </div>
    </div>
  );
}

export default CommentList; 