"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Calendar, ChevronDown, Bookmark } from 'lucide-react';
import { CommentsList } from './comments-list';

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

export default function CommentsDashboard() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('comments');
  const [selectedVideo, setSelectedVideo] = useState('all');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [showSaved, setShowSaved] = useState(false);
  const [videos, setVideos] = useState<{id: string, title: string}[]>([]);
  const [dateFilter, setDateFilter] = useState('all');
  
  useEffect(() => {
    async function fetchComments() {
      try {
        const response = await fetch('/api/youtube-comments');
        if (!response.ok) {
          throw new Error('Failed to fetch comments');
        }
        const data = await response.json();
        
        // Extract unique videos from comments
        const uniqueVideos = Array.from(
          new Set(data.comments.map((comment: any) => comment.videoId))
        ).map(videoId => {
          const comment = data.comments.find((c: any) => c.videoId === videoId);
          return {
            id: videoId as string,
            title: comment.videoTitle
          };
        });
        
        setVideos(uniqueVideos);
        
        // Add mock reply counts for the demo
        const commentsWithReplies = data.comments.map((comment: any) => ({
          ...comment,
          replyCount: Math.floor(Math.random() * 20)
        }));
        
        setComments(commentsWithReplies);
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, []);

  // Filter comments based on search query, selected video, and date range
  const filteredComments = comments.filter(comment => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      comment.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.videoTitle.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Video filter
    const matchesVideo = selectedVideo === 'all' || comment.videoId === selectedVideo;
    
    // Date filter
    let matchesDate = true;
    const commentDate = new Date(comment.publishedAt);
    
    if (dateFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      matchesDate = commentDate >= oneWeekAgo;
    } else if (dateFilter === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      matchesDate = commentDate >= oneMonthAgo;
    } else if (dateFilter === 'year') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      matchesDate = commentDate >= oneYearAgo;
    } else if (dateRange[0] && dateRange[1]) {
      matchesDate = commentDate >= dateRange[0] && commentDate <= dateRange[1];
    }
    
    return matchesSearch && matchesVideo && matchesDate;
  });

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Search and filters row */}
      <div className="p-4 flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search comments..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2">
          <div className="relative">
            <select
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">Date</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="year">Past Year</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="relative">
            <select
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={selectedVideo}
              onChange={(e) => setSelectedVideo(e.target.value)}
            >
              <option value="all">All Videos</option>
              {videos.map((video) => (
                <option key={video.id} value={video.id}>
                  {video.title.length > 30 ? video.title.substring(0, 30) + '...' : video.title}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="px-4 -mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('comments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'comments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Comments
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analysis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analysis
          </button>
        </nav>
      </div>
      
      {/* Additional filters */}
      <div className="p-4 flex flex-wrap justify-between items-center border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-2 sm:mb-0">
          <span className="text-gray-700">Select Video:</span>
          <div className="relative w-64">
            <select
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={selectedVideo}
              onChange={(e) => setSelectedVideo(e.target.value)}
            >
              <option value="all">All Videos</option>
              {videos.map((video) => (
                <option key={video.id} value={video.id}>
                  {video.title.length > 30 ? video.title.substring(0, 30) + '...' : video.title}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => {/* Open date picker */}}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Select date range
          </button>
          
          <button
            className={`flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
              showSaved
                ? 'bg-blue-100 border-blue-300 text-blue-800'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            onClick={() => setShowSaved(!showSaved)}
          >
            <Bookmark className={`h-4 w-4 mr-2 ${showSaved ? 'text-blue-600' : 'text-gray-400'}`} />
            Show Saved
          </button>
        </div>
      </div>
      
      {/* Content based on active tab */}
      <div className="p-4">
        {activeTab === 'comments' ? (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Comments ({filteredComments.length})
            </h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <CommentsList comments={filteredComments} />
            )}
          </>
        ) : (
          <div className="py-8 text-center text-gray-500">
            Analysis features coming soon
          </div>
        )}
      </div>
    </div>
  );
} 