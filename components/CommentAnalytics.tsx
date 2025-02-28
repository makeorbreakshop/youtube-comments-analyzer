import React, { useState, useEffect } from 'react';
import { CommentData, VideoData, SortDirection } from '../lib/types';
import { getCommentThreads, getChannelVideos, getCommentReplies } from '../lib/youtube';
import CommentList from './CommentList';
import { FilterBar } from './FilterBar';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { tokens, componentStyles } from '@/lib/design-system';
import { sanitizeAndRenderHtml } from '@/lib/content-utils';
import { SimpleComment } from './SimpleComment';

// Updated TypeScript type definitions
interface CommentAnalyticsProps {
  channelId: string;
}

// Define SortOption locally to avoid conflicts
type SortOption = 'date' | 'likes' | 'replies';

// Add this component to handle individual comments and their replies
function CommentWithReplies({ comment, comments, setComments }: { comment: CommentData, comments: CommentData[], setComments: React.Dispatch<React.SetStateAction<CommentData[]>> }) {
  const [replies, setReplies] = useState<CommentData[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replyCount, setReplyCount] = useState(comment.replyCount || 0);
  const [hasLoadedReplies, setHasLoadedReplies] = useState(false);

  useEffect(() => {
    // Check immediately if this comment has replies
    if (comment.replyCount > 0) {
      setReplyCount(comment.replyCount);
    }
  }, [comment.replyCount, comment.id]);

  const toggleReplies = async () => {
    // If replies haven't been loaded yet and we're expanding
    if (!hasLoadedReplies && !showReplies) {
      setLoading(true);
      try {
        const commentReplies = await getCommentReplies(comment.id);
        setReplies(commentReplies);
        setReplyCount(commentReplies.length);
        setHasLoadedReplies(true);
      } catch (error) {
        console.error("Error loading replies:", error);
      } finally {
        setLoading(false);
      }
    }
    
    // Toggle the visibility
    setShowReplies(!showReplies);
  };

  // Only for development - less intrusive debug info
  const debugInfo = process.env.NODE_ENV === 'development' ? (
    <div className="mt-2 text-xs text-gray-500 text-right">
      {replyCount > 0 ? `${replyCount} replies` : "No replies"}
    </div>
  ) : null;

  const checkForRepliesManually = async () => {
    try {
      console.log(`🔍 Manually checking for replies to comment ${comment.id}`);
      const resp = await fetch(`/api/debug-replies?commentId=${comment.id}`);
      const data = await resp.json();
      console.log(`📊 Manual reply check result:`, data);
      
      if (data.replies && data.replies.length > 0) {
        setReplies(data.replies);
        setReplyCount(data.replies.length);
        setHasLoadedReplies(true);
        setShowReplies(true);
      } else {
        console.log('No replies found in manual check');
      }
    } catch (error) {
      console.error('Error in manual reply check:', error);
    }
  };

  // Add a debug button in the JSX for development mode only
  const debugButton = process.env.NODE_ENV === 'development' ? (
    <button 
      onClick={checkForRepliesManually}
      className="text-xs text-blue-600 hover:text-blue-800"
    >
      Check replies manually
    </button>
  ) : null;

  return (
    <div className="border-b border-gray-200 py-5 last:border-none">
      <div className="flex space-x-4">
        {/* Author avatar */}
        <div className="flex-shrink-0">
          <img 
            className="h-10 w-10 rounded-full border border-gray-200"
            src={comment.authorProfileImageUrl} 
            alt={comment.authorDisplayName}
          />
        </div>

        {/* Comment content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">
              {comment.authorDisplayName}
            </h3>
            <time dateTime={comment.publishedAt} className="text-xs text-gray-500">
              {new Date(comment.publishedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </time>
          </div>
          
          <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">
            <div dangerouslySetInnerHTML={sanitizeAndRenderHtml(comment.textDisplay)} />
          </div>
          
          <div className="mt-2 flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-500">
              {/* Simple, clean thumb up icon */}
              <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
              <span>{comment.likeCount}</span>
            </div>
            
            <button 
              className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors duration-150"
              onClick={async () => {
                try {
                  // If comment already has replies loaded, just toggle visibility
                  if (comment.replies && comment.replies.length > 0) {
                    // Toggle show/hide for existing replies
                    setShowReplies(prev => !prev);
                    return;
                  }
                  
                  // Otherwise fetch the replies
                  const resp = await fetch(`/api/debug-replies?commentId=${comment.id}`);
                  const data = await resp.json();
                  
                  if (data.replies && data.replies.length > 0) {
                    // Update the comment's replies
                    const updatedComments = comments.map(c => {
                      if (c.id === comment.id) {
                        return {...c, replies: data.replies};
                      }
                      return c;
                    });
                    setComments(updatedComments);
                    
                    // Also show the replies
                    setShowReplies(true);
                  } else {
                    // Show a notification that no replies were found
                    alert('No replies found for this comment');
                  }
                } catch (error) {
                  console.error('Error fetching replies:', error);
                  alert('Error fetching replies. Please try again.');
                }
              }}
            >
              <svg 
                className="h-4 w-4 mr-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              <span>{comment.replyCount || (comment.replies?.length || 0)}</span>
              <svg 
                className={`ml-1 h-4 w-4 transition-transform duration-200 ${
                  showReplies ? 'transform rotate-180' : ''
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
          
          {/* Display the heart icon for creator-hearted comments */}
          {comment.isHeartedByCreator && (
            <div className="mt-2 flex items-center">
              <span className="text-xs text-red-500 flex items-center">
                <svg className="h-4 w-4 mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                Hearted by creator
              </span>
            </div>
          )}
          
          {/* Replies section */}
          {showReplies && replies.length > 0 && (
            <div className="mt-4 ml-4 pl-4 border-l-2 border-gray-200">
              {replies.map(reply => (
                <div key={reply.id} className="mb-4">
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0">
                      <img 
                        className="h-8 w-8 rounded-full border border-gray-200"
                        src={reply.authorProfileImageUrl} 
                        alt={reply.authorDisplayName}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-medium text-gray-900">
                          {reply.authorDisplayName}
                        </h4>
                        <time dateTime={reply.publishedAt} className="text-xs text-gray-500">
                          {new Date(reply.publishedAt).toLocaleDateString()}
                        </time>
                      </div>
                      <div className="mt-1 text-xs text-gray-700 whitespace-pre-line">
                        <div dangerouslySetInnerHTML={sanitizeAndRenderHtml(reply.textDisplay)} />
                      </div>
                      <div className="mt-2 flex items-center">
                        <div className="flex items-center text-xs text-gray-500">
                          {/* Simple thumb up icon */}
                          <svg className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                          </svg>
                          <span>{reply.likeCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Modify your existing CommentsList component to use the new CommentWithReplies component
function CommentsList({ comments, setComments }: { comments: CommentData[], setComments: React.Dispatch<React.SetStateAction<CommentData[]>> }) {
  return (
    <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
      {comments.map(comment => (
        <CommentWithReplies key={comment.id} comment={comment} comments={comments} setComments={setComments} />
      ))}
    </div>
  );
}

interface Video {
  id: string;
  title: string;
}

export default function CommentAnalytics({ channelId }: CommentAnalyticsProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const COMMENTS_PER_PAGE = 50;
  const [totalComments, setTotalComments] = useState<number>(0);
  const [showReplyIds, setShowReplyIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const videoData = await getChannelVideos(channelId);
        setVideos(videoData);
      } catch (error) {
        console.error('Error fetching videos:', error);
      }
    };
    fetchVideos();
  }, [channelId]);

  // Fetch comments based on filters
  useEffect(() => {
    async function fetchComments() {
      if (!channelId) return;
      
      setIsLoading(true);
      
      try {
        // Update the API endpoint to use our consolidated route
        const response = await fetch(
          `/api/filtered-comments?channelId=${channelId}` + 
          `&page=${page}` +
          `&perPage=${COMMENTS_PER_PAGE}` +
          `&sortBy=${sortOption}` +
          `&sortDirection=${sortDirection}` +
          (selectedVideo ? `&videoId=${selectedVideo}` : '') +
          (searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '')
        );
        
        const data = await response.json();
        
        // Add console logging to help debug
        console.log('Fetched comments data:', data);
        
        if (data.comments) {
          setComments(data.comments);
          setTotalComments(data.count || data.comments.length);
        }
        
        if (data.videos) {
          setVideos(data.videos);
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchComments();
  }, [channelId, selectedVideo, sortOption, sortDirection, searchQuery, page]);

  // Function to sort comments
  const sortComments = (commentsToSort: CommentData[], option: SortOption, direction: SortDirection): CommentData[] => {
    return [...commentsToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (option) {
        case 'date':
          comparison = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
          break;
        case 'likes':
          comparison = a.likeCount - b.likeCount;
          break;
        case 'replies':
          comparison = a.replyCount - b.replyCount;
          break;
        default:
          comparison = 0;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
  };

  // Filter comments by search query
  const filteredComments = comments.filter(comment => 
    comment.textDisplay.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const testWithDummyData = () => {
    const dummyData: CommentData[] = [
      {
        id: 'test-1',
        authorDisplayName: 'Test User',
        authorProfileImageUrl: 'https://via.placeholder.com/48',
        textDisplay: 'This is a test comment',
        likeCount: 5,
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        videoId: 'test-video',
        videoTitle: 'Test Video',
        replyCount: 2,
        isHeartedByCreator: true,
        isPinned: false,
        replies: []
      }
    ];
    
    setComments(dummyData);
    setIsLoading(false);
  };

  // Add this useEffect just below your other useEffect blocks
  useEffect(() => {
    console.log('CommentAnalytics received channelId:', channelId);
    
    // Verify the type and format
    console.log('channelId type:', typeof channelId);
    console.log('channelId length:', channelId.length);
    
    // Add a direct database query to check matching
    const checkChannelData = async () => {
      try {
        const { data: channelData, error: channelError } = await supabase
          .from('channels')
          .select('*')
          .eq('channel_id', channelId)
          .single();
        
        if (channelError) {
          console.error('Error fetching channel data:', channelError);
          return;
        }
        
        console.log('Direct channel lookup result:', channelData);
        
        // Also check comments with this exact channelId
        const { data: directComments, error: commentsError } = await supabase
          .from('comments')
          .select('*')
          .eq('channel_id', channelId)
          .limit(1);
        
        if (commentsError) {
          console.error('Error fetching direct comments:', commentsError);
          return;
        }
        
        console.log('Direct comment lookup result:', directComments);
      } catch (error) {
        console.error('Error in channel data check:', error);
      }
    };
    
    checkChannelData();
  }, [channelId]);

  // Add near the top of your useEffect
  useEffect(() => {
    // Call the debug API endpoint to log to server terminal
    fetch(`/api/debug?channelId=${encodeURIComponent(channelId)}`)
      .then(res => res.json())
      .then(data => {
        console.log('Debug API response:', data);
      })
      .catch(err => {
        console.error('Error calling debug API:', err);
      });
    
    // Rest of your existing code...
  }, [channelId]);

  // Add load more button
  const loadMoreComments = () => {
    setPage(prevPage => prevPage + 1);
  };

  // Add after the loadMoreComments function
  useEffect(() => {
    // Add this console log to see when new comments are received
    console.log(`Loaded ${comments.length} comments`);
    
    // If we have comments, log the first one for debugging
    if (comments.length > 0) {
      console.log('First comment sample:', {
        id: comments[0].id,
        authorName: comments[0].authorDisplayName,
        text: comments[0].textDisplay.substring(0, 30) + '...'
      });
    }
  }, [comments]);

  // Handle comment replies
  const fetchReplies = async (commentId: string) => {
    if (showReplyIds.includes(commentId)) {
      // If it's already open, just close it
      setShowReplyIds(prev => prev.filter(id => id !== commentId));
      return;
    }
    
    try {
      // Find the comment
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;
      
      // If it already has replies, just show them
      if (comment.replies && comment.replies.length > 0) {
        setShowReplyIds(prev => [...prev, commentId]);
        return;
      }
      
      // Use the consistent getCommentReplies function instead of direct API call
      const replies = await getCommentReplies(commentId);
      
      if (replies && replies.length > 0) {
        // Update the comment with replies
        setComments(prevComments => 
          prevComments.map(c => 
            c.id === commentId 
              ? { ...c, replies, replyCount: replies.length } 
              : c
          )
        );
        // Open the replies
        setShowReplyIds(prev => [...prev, commentId]);
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  // Get the video title safely with optional chaining and nullish coalescing
  const getVideoTitle = (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    return video ? video.title : '';
  };
  
  // Truncate title safely
  const truncateTitle = (title: string, maxLength: number = 35) => {
    if (!title) return '';
    return title.length > maxLength 
      ? title.substring(0, maxLength) + '...' 
      : title;
  };

  return (
    <div className={tokens.spacing.stack.default}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Channel Comments</h1>
        <p className="text-sm text-gray-600 mt-1">
          Viewing {totalComments} comments from this channel
        </p>
      </div>

      {/* Filter Bar with proper type definitions */}
      <FilterBar 
        videos={videos}
        selectedVideo={selectedVideo}
        setSelectedVideo={setSelectedVideo}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortOption}
        setSortBy={(option: string) => setSortOption(option as SortOption)}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
      />
      
      {/* Comments Section */}
      {isLoading ? (
        <div className={`${componentStyles.card.default} ${tokens.spacing.card.default} text-center py-16`}>
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-4 text-gray-500">Loading comments...</p>
        </div>
      ) : comments.length > 0 ? (
        <div className={`${componentStyles.card.default} ${tokens.spacing.card.default}`}>
          <div className="divide-y divide-gray-200">
            {comments.map(comment => (
              <SimpleComment key={comment.id} comment={comment} />
            ))}
          </div>
        </div>
      ) : (
        <div className={`${componentStyles.card.default} ${tokens.spacing.card.default} text-center py-10`}>
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No comments found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {selectedVideo 
              ? 'No comments available for this video.' 
              : 'No comments found. Try selecting a different filter.'}
          </p>
        </div>
      )}
    </div>
  );
} 