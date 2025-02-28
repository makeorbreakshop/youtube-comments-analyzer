import React from 'react';
import { tokens, componentStyles } from '@/lib/design-system';
import { VideoData } from '@/lib/types';

interface FilterBarProps {
  videos: any[];  // Change to proper type based on your data
  selectedVideo: string;
  setSelectedVideo: (videoId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (option: string) => void;
  sortDirection: 'asc' | 'desc';
  setSortDirection: (direction: 'asc' | 'desc') => void;
}

export function FilterBar({
  videos,
  selectedVideo,
  setSelectedVideo,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  sortDirection,
  setSortDirection
}: FilterBarProps) {
  
  // Handle video title truncation
  const truncateTitle = (title: string, maxLength: number = 35) => {
    if (!title) return '';
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  };

  return (
    <div className="mb-6 flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-4">
      <div className="flex-1">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search comments..."
          className={componentStyles.input.default}
        />
      </div>
      
      <div className="w-full md:w-64">
        <select
          value={selectedVideo}
          onChange={(e) => setSelectedVideo(e.target.value)}
          className={componentStyles.input.default}
          aria-label="Filter by video"
        >
          <option value="">All Videos</option>
          {videos.map((video) => (
            <option key={video.id} value={video.id}>
              {truncateTitle(video.title || '')}
            </option>
          ))}
        </select>
      </div>
      
      <div className="w-full md:w-48">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className={componentStyles.input.default}
          aria-label="Sort by"
        >
          <option value="date">Date</option>
          <option value="likes">Likes</option>
          <option value="replies">Replies</option>
        </select>
      </div>
      
      <div>
        <button
          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
          className={componentStyles.button.secondary}
          aria-label={sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'}
        >
          {sortDirection === 'asc' ? '↑ Ascending' : '↓ Descending'}
        </button>
      </div>
    </div>
  );
} 