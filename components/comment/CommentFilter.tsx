import React from 'react';
import { tokens, componentStyles } from '@/lib/design-system';

interface CommentFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedVideo: string;
  setSelectedVideo: (videoId: string) => void;
  videos: { id: string; title: string; }[];
  sortOption: string;
  setSortOption: (option: string) => void;
  sortDirection: string;
  setSortDirection: (direction: string) => void;
}

export default function CommentFilter({
  searchQuery,
  setSearchQuery,
  selectedVideo,
  setSelectedVideo,
  videos,
  sortOption,
  setSortOption,
  sortDirection,
  setSortDirection
}: CommentFilterProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div>
        <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search comments</label>
        <div className="mt-1">
          <input
            type="text"
            id="search"
            className={componentStyles.input.default}
            placeholder="Search comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="video-filter" className="block text-sm font-medium text-gray-700">Filter by video</label>
        <div className="mt-1">
          <select
            id="video-filter"
            className={componentStyles.input.default}
            value={selectedVideo}
            onChange={(e) => setSelectedVideo(e.target.value)}
          >
            <option value="">All Videos</option>
            {videos.map(video => (
              <option key={video.id} value={video.id}>
                {video.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div>
        <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700">Sort by</label>
        <div className="mt-1">
          <select
            id="sort-by"
            className={componentStyles.input.default}
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="date">Date</option>
            <option value="likeCount">Likes</option>
          </select>
        </div>
      </div>
      
      <div>
        <label htmlFor="sort-direction" className="block text-sm font-medium text-gray-700">Order</label>
        <div className="mt-1">
          <select
            id="sort-direction"
            className={componentStyles.input.default}
            value={sortDirection}
            onChange={(e) => setSortDirection(e.target.value)}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>
    </div>
  );
} 