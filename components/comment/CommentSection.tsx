import React, { useState, useEffect } from 'react';
import { CommentData } from '@/lib/types';
import { CommentList } from './';
import { CommentFilter } from './';
import { CommentStats } from './';
import { CommentPagination } from './';
import { tokens, componentStyles } from '@/lib/design-system';

interface CommentSectionProps {
  channelId: string;
}

export default function CommentSection({ channelId }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [videos, setVideos] = useState<{ id: string, title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState('');
  const [sortOption, setSortOption] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [totalPages, setTotalPages] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const COMMENTS_PER_PAGE = 200;

  const loadComments = async (newPage = 1) => {
    setIsLoading(true);
    
    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        channelId: channelId,
        page: newPage.toString(),
        perPage: COMMENTS_PER_PAGE.toString(),
        sortBy: sortOption,
        sortDirection: sortDirection
      });
      
      if (selectedVideo) {
        queryParams.append('videoId', selectedVideo);
      }
      
      if (searchQuery) {
        queryParams.append('search', searchQuery);
      }
      
      // Use the filtered comments endpoint
      const response = await fetch(`/api/filtered-comments?${queryParams.toString()}`);
      const data = await response.json();
      
      if (newPage === 1) {
        // Replace comments for new searches/filters
        setComments(data.comments);
      } else {
        // Append for pagination
        setComments(prevComments => [...prevComments, ...data.comments]);
      }
      
      setVideos(data.videos);
      setPage(newPage);
      setTotalPages(data.totalPages);
      setTotalComments(data.total);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update when filters change
  useEffect(() => {
    loadComments(1);
  }, [channelId, selectedVideo, sortOption, sortDirection, searchQuery]);

  // Add this code to initialize reply counts when loading comments
  useEffect(() => {
    async function fetchReplyCountsForComments() {
      if (!comments.length) return;
      
      try {
        const commentIds = comments.map(c => c.id);
        const response = await fetch('/api/comment-reply-counts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ commentIds })
        });
        
        const data = await response.json();
        
        // Update comments with reply counts
        if (data.counts) {
          setComments(prev => prev.map(comment => ({
            ...comment,
            replyCount: data.counts[comment.id] || 0
          })));
        }
      } catch (error) {
        console.error('Error fetching reply counts:', error);
      }
    }
    
    fetchReplyCountsForComments();
  }, [comments.length]);

  return (
    <section aria-labelledby="comments-heading" className={tokens.spacing.stack.default}>
      <h2 id="comments-heading" className="sr-only">Comments</h2>
      
      <CommentStats 
        totalComments={totalComments} 
        totalVideos={videos.length}
        currentFilter={selectedVideo ? videos.find(v => v.id === selectedVideo)?.title || '' : 'All Videos'}
      />
      
      <CommentFilter
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedVideo={selectedVideo}
        setSelectedVideo={setSelectedVideo}
        videos={videos}
        sortOption={sortOption}
        setSortOption={setSortOption}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
      />
      
      <CommentList 
        comments={comments}
        isLoading={isLoading}
      />
      
      <CommentPagination 
        page={page}
        totalPages={totalPages}
        onLoadMore={() => loadComments(page + 1)}
        isLoading={isLoading}
        totalShown={comments.length}
        totalAvailable={totalComments}
      />
    </section>
  );
} 