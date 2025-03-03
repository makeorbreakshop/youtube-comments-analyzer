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
  
  const handleSortClick = (option: string) => {
    if (option === sortBy) {
      // If clicking the same sort option, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New sort type, set to descending by default
      setSortBy(option);
      setSortDirection('desc');
    }
  };

  return (
    <div className="mb-8">
      <div className="mb-4">
        <div className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search comments..."
            className="block w-full p-3 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 focus-visible:outline-none"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          {/* Empty div to maintain spacing */}
        </div>
        
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-700 mr-3">Sort by:</span>
          <div className="inline-flex shadow-sm rounded-md">
            <button
              onClick={() => handleSortClick('date')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md focus:z-10 focus:ring-2 focus:outline-none
                ${sortBy === 'date' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-200 border border-gray-300'}`}
            >
              Date {sortBy === 'date' && (sortDirection === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => handleSortClick('likes')}
              className={`px-4 py-2 text-sm font-medium focus:z-10 focus:ring-2 focus:outline-none border-t border-b 
                ${sortBy === 'likes' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border-blue-600' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-200 border-gray-300'}`}
            >
              Likes {sortBy === 'likes' && (sortDirection === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => handleSortClick('replies')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md focus:z-10 focus:ring-2 focus:outline-none
                ${sortBy === 'replies' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-200 border border-gray-300'}`}
            >
              Replies {sortBy === 'replies' && (sortDirection === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 