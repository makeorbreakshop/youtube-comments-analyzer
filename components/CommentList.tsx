import React, { useState, useEffect, useRef } from 'react';
import { CommentData } from '../lib/types';
import CommentItem from './CommentItem';
import CommentText from './CommentText';
import { SimpleComment } from './SimpleComment';

interface CommentListProps {
  channelId: string;
  initialSortBy?: string;
  initialSortDirection?: 'asc' | 'desc';
}

export function CommentList({ 
  channelId, 
  initialSortBy = 'date', 
  initialSortDirection = 'desc' 
}: CommentListProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [displayedComments, setDisplayedComments] = useState<CommentData[]>([]);
  const perPage = 50;

  // Update sort settings if initialSort props change
  useEffect(() => {
    if (initialSortBy) setSortBy(initialSortBy);
    if (initialSortDirection) setSortDirection(initialSortDirection);
  }, [initialSortBy, initialSortDirection]);

  useEffect(() => {
    // Don't refetch if we're already loading
    if (!isLoading) {
      fetchComments();
    }
  }, [channelId, sortBy, sortDirection, page]);

  async function fetchComments() {
    if (!channelId) return;
    
    // Set a flag to prevent multiple fetches
    setIsLoading(true);
    
    try {
      console.log(`Fetching comments for channel ${channelId} with sort: ${sortBy} ${sortDirection}`);
      
      const apiUrl = `/api/filtered-comments?channelId=${channelId}&page=${page}&perPage=${perPage}&sortBy=${sortBy}&sortDirection=${sortDirection}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.comments?.length > 0) {
        setComments(data.comments);
        setDisplayedComments(data.comments);
        setTotalCount(data.totalCount);
      } else {
        if (data.comments !== undefined) {
          setComments([]);
          setDisplayedComments([]);
          setTotalCount(data.totalCount || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSortChange(newSortBy: string) {
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Comments ({totalCount.toLocaleString()})
        </h2>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedComments.length > 0 ? (
            displayedComments.map((comment) => (
              <SimpleComment
                key={comment.id}
                comment={comment}
              />
            ))
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <p className="text-gray-500">No comments found matching your criteria.</p>
            </div>
          )}
          
          {displayedComments.length > 0 && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CommentList; 