import { 
  YouTubeChannel, 
  YouTubeVideo, 
  YouTubeComment,
  YouTubeChannelResponse,
  YouTubeVideoResponse,
  YouTubeCommentResponse,
  DbComment,
  CustomYouTubeComment
} from './types';
import { supabase } from './supabase';
import { CommentData, VideoData } from './types';
import { decodeHtmlEntities, decodeAllHtmlEntities } from './utils';

/**
 * YouTube API integration for fetching channel data and comments
 * Based on the YouTube Data API v3 documentation: 
 * https://developers.google.com/youtube/v3/docs
 */

/**
 * Searches for a YouTube channel by name
 * @param channelName The name of the channel to search for
 * @param apiKey YouTube API key
 * @returns The channel ID
 */
export async function searchForChannel(channelName: string, apiKey: string): Promise<string> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(channelName)}&type=channel&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.items || data.items.length === 0) {
    throw new Error('Channel not found');
  }
  
  return data.items[0].id.channelId;
}

/**
 * Fetches videos for a YouTube channel
 */
export async function fetchVideosByChannel(
  channelId: string, 
  apiKey: string, 
  maxResults: number = 50,
  pageToken?: string
): Promise<YouTubeVideoResponse> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * Fetches all videos for a YouTube channel with pagination
 */
export async function fetchAllVideosByChannel(
  channelId: string, 
  apiKey: string
): Promise<YouTubeVideo[]> {
  let allVideos: YouTubeVideo[] = [];
  let nextPageToken: string | undefined;
  
  do {
    console.log(`Fetching videos for channel ${channelId}${nextPageToken ? ` (page token: ${nextPageToken})` : ''}`);
    const response = await fetchVideosByChannel(channelId, apiKey, 50, nextPageToken);
    allVideos = [...allVideos, ...(response.items || [])];
    nextPageToken = response.nextPageToken;
    
    // Add a small delay to avoid API rate limits
    if (nextPageToken) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } while (nextPageToken);
  
  return allVideos;
}

/**
 * Fetches comments for a specific video
 */
export async function fetchComments(
  videoId: string, 
  apiKey: string, 
  pageToken?: string
): Promise<YouTubeCommentResponse> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${videoId}&maxResults=100&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
}

/**
 * Fetches the latest comments from a YouTube channel
 */
export async function fetchLatestChannelComments(
  channelId: string,
  apiKey: string,
  maxVideos: number = 10,
  includeOldVideos: boolean = false,
  maxComments: number = 1000,
  includeReplies: boolean = true
): Promise<CustomYouTubeComment[]> {
  // Fetch videos first
  let videosResponse = await fetchVideosByChannel(channelId, apiKey);
  let processedVideos = videosResponse.items || [];
  
  // If we should include older videos beyond the first page
  if (includeOldVideos && videosResponse.nextPageToken) {
    const allVideos = await fetchAllVideosByChannel(channelId, apiKey);
    processedVideos = allVideos;
    
    // Limit to most recent videos
    if (maxVideos !== -1) {
      processedVideos = processedVideos.slice(0, maxVideos);
    }
  }
  
  // Process each video to get comments
  const allComments: CustomYouTubeComment[] = [];
  let fetchedCommentCount = 0;
  
  for (const video of processedVideos) {
    // Skip if we've reached max comments
    if (maxComments !== -1 && fetchedCommentCount >= maxComments) {
      break;
    }
    
    try {
      // Fix: Ensure videoId is properly accessed with type checking
      const videoId = typeof video.id === 'object' && video.id?.videoId 
        ? video.id.videoId 
        : (typeof video.id === 'string' ? video.id : null);
      
      if (!videoId) {
        console.warn('Missing videoId for video:', video);
        continue;
      }
      
      const commentsResponse = await fetchComments(videoId, apiKey);
      
      // Process only top-level comments to start
      const videoComments = commentsResponse.items || [];
      
      for (const commentThread of videoComments) {
        if (!commentThread?.snippet?.topLevelComment?.snippet) {
          console.warn('Malformed comment thread:', commentThread);
          continue;
        }
        
        const snippet = commentThread.snippet.topLevelComment.snippet;
        
        // Fix for updatedAt property
        const commentUpdatedAt = snippet.updatedAt || snippet.publishedAt;
        
        // Add proper types or handle missing totalReplyCount
        const replyCount = commentThread.snippet?.totalReplyCount || 0;
        
        // Initialize with proper structure
        const emptyReplies = [] as CustomYouTubeComment[]; // Properly typed now
        
        // Add to our list
        allComments.push({
          id: commentThread.id,
          videoId: videoId,
          videoTitle: video.snippet?.title || 'Unknown Video',
          authorName: snippet.authorDisplayName,
          authorProfileUrl: snippet.authorProfileImageUrl,
          text: snippet.textDisplay,
          likeCount: snippet.likeCount || 0,
          publishedAt: snippet.publishedAt,
          updatedAt: commentUpdatedAt,
          totalReplyCount: replyCount,
          replies: emptyReplies
        } as CustomYouTubeComment);
        
        fetchedCommentCount++;
        
        // If there are replies and we want to include them
        if (includeReplies && commentThread.replies && 'comments' in commentThread.replies) {
          // Process each reply
          for (const reply of commentThread.replies.comments) {
            const replySnippet = reply.snippet;
            
            // Add to our list as a separate comment with parentId
            allComments.push({
              id: reply.id,
              videoId: videoId,
              videoTitle: video.snippet?.title || 'Unknown Video',
              authorName: replySnippet.authorDisplayName,
              authorProfileUrl: replySnippet.authorProfileImageUrl,
              text: replySnippet.textDisplay,
              likeCount: replySnippet.likeCount || 0,
              publishedAt: replySnippet.publishedAt,
              updatedAt: replySnippet.updatedAt || replySnippet.publishedAt, // Fallback
              totalReplyCount: 0,
              parentId: commentThread.id,
              replies: [] as CustomYouTubeComment[]
            } as CustomYouTubeComment);
            
            fetchedCommentCount++;
          }
        }
        
        // Check if we've reached the max
        if (maxComments !== -1 && fetchedCommentCount >= maxComments) {
          break;
        }
      }
    } catch (error) {
      // Just log and continue with next video
      console.error(`Error fetching comments for video ${getVideoId(video.id)}:`, error);
    }
  }
  
  return allComments;
}

// Helper function to safely get the videoId from different formats
function getVideoId(id: string | { videoId: string } | { kind: string; videoId: string }): string {
  if (typeof id === 'string') {
    return id;
  } else if ('videoId' in id) {
    return id.videoId;
  } else {
    return 'unknown';
  }
}

/**
 * Get YouTube comments for a video
 */
export async function getCommentsForVideo(
  videoId: string, 
  apiKey: string, 
  maxComments: number = -1,
  includeReplies: boolean = true
): Promise<CustomYouTubeComment[]> {
  console.log(`Getting comments for video ${videoId}, including replies: ${includeReplies}`);
  
  let comments: CustomYouTubeComment[] = []; // Using proper type
  let nextPageToken: string | undefined;
  let commentCount = 0;
  
  do {
    console.log(`Fetching comments page ${commentCount > 0 ? commentCount / 20 + 1 : 1}`);
    const response = await fetchComments(videoId, apiKey, nextPageToken);
    const videoComments = response.items || [];
    
    // Process each top-level comment
    for (const comment of videoComments) {
      // Convert YouTube API comment to our CustomYouTubeComment format
      const customComment: CustomYouTubeComment = {
        id: comment.id,
        videoId: videoId,
        videoTitle: 'Unknown Video', // We don't have the title here
        authorName: comment.snippet.topLevelComment.snippet.authorDisplayName,
        authorProfileUrl: comment.snippet.topLevelComment.snippet.authorProfileImageUrl,
        text: comment.snippet.topLevelComment.snippet.textDisplay,
        likeCount: comment.snippet.topLevelComment.snippet.likeCount || 0,
        publishedAt: comment.snippet.topLevelComment.snippet.publishedAt,
        updatedAt: comment.snippet.topLevelComment.snippet.updatedAt || comment.snippet.topLevelComment.snippet.publishedAt,
        totalReplyCount: comment.snippet.totalReplyCount || 0,
        replies: []
      };
      
      comments.push(customComment);
      commentCount++;
      
      // Process replies if available and requested
      if (includeReplies && comment.replies && 'comments' in comment.replies) {
        console.log(`Found ${comment.replies.comments.length} replies for comment ${comment.id}`);
        
        for (const reply of comment.replies.comments) {
          // Convert reply to CustomYouTubeComment format
          const replyComment: CustomYouTubeComment = {
            id: reply.id,
            videoId: videoId,
            videoTitle: 'Unknown Video',
            authorName: reply.snippet.authorDisplayName,
            authorProfileUrl: reply.snippet.authorProfileImageUrl,
            text: reply.snippet.textDisplay,
            likeCount: reply.snippet.likeCount || 0,
            publishedAt: reply.snippet.publishedAt,
            updatedAt: reply.snippet.updatedAt || reply.snippet.publishedAt,
            totalReplyCount: 0,
            parentId: comment.id,
            replies: []
          };
          
          comments.push(replyComment);
          commentCount++;
        }
      }
    }
    
    nextPageToken = response.nextPageToken;
    
    // Continue until we've reached max comments or run out of pages
    if (maxComments !== -1 && commentCount >= maxComments) {
      console.log(`Reached maximum of ${maxComments} comments`);
      break;
    }
    
    // Small delay to avoid rate limiting
    if (nextPageToken) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  } while (nextPageToken);
  
  console.log(`Retrieved ${comments.length} comments total`);
  return comments;
}

// Updated mapYouTubeCommentToDbComment function with more robust type checking
export function mapYouTubeCommentToDbComment(comment: YouTubeComment | CustomYouTubeComment | Record<string, any>, channelId: string): DbComment {
  // Very explicitly extract parentId from all possible locations
  let parentId = null;
  
  // Handle CustomYouTubeComment format
  if ('authorName' in comment && 'text' in comment) {
    // This is our CustomYouTubeComment format
    return {
      comment_id: comment.id,
      video_id: comment.videoId,
      author_name: comment.authorName,
      author_profile_url: comment.authorProfileUrl,
      text: comment.text,
      like_count: comment.likeCount,
      published_at: comment.publishedAt,
      updated_at: comment.updatedAt,
      channel_id: channelId,
      is_owner_comment: false, // Default
      parent_id: comment.parentId || null,
      video_title: comment.videoTitle || ''
    };
  }
  
  // Handle standard YouTube API format
  // First check if it's in snippet.parentId
  if (comment.snippet?.parentId) {
    parentId = comment.snippet.parentId;
  } 
  // Then check reply structure
  else if (comment.snippet?.topLevelComment?.id && comment.id !== comment.snippet.topLevelComment.id) {
    parentId = comment.snippet.topLevelComment.id;
  }
  
  // If this is a direct API reply, it might be structured differently
  if (comment.snippet?.type === 'reply' && comment.snippet?.parentId) {
    parentId = comment.snippet.parentId;
  }
  
  // Ensure we have proper access to all required properties
  const topLevelSnippet = comment.snippet?.topLevelComment?.snippet;
  const directSnippet = comment.snippet;
  
  return {
    comment_id: comment.id,
    video_id: directSnippet?.videoId,
    author_name: topLevelSnippet?.authorDisplayName || directSnippet?.authorDisplayName,
    author_profile_url: topLevelSnippet?.authorProfileImageUrl || directSnippet?.authorProfileImageUrl,
    text: topLevelSnippet?.textDisplay || directSnippet?.textDisplay,
    like_count: topLevelSnippet?.likeCount || directSnippet?.likeCount || 0,
    published_at: topLevelSnippet?.publishedAt || directSnippet?.publishedAt,
    channel_id: channelId,
    is_owner_comment: false,
    parent_id: parentId,
    video_title: directSnippet?.videoTitle || '',
  };
}

// Enhanced mapping function that handles all possible properties
export function mapDbCommentToCommentData(dbComment: Record<string, any>): CommentData {
  return {
    id: dbComment.comment_id,
    authorDisplayName: dbComment.author_name || 'Unknown User',
    authorProfileImageUrl: dbComment.author_profile_url || 'https://www.gravatar.com/avatar/?d=mp',
    textDisplay: decodeAllHtmlEntities(dbComment.text || ''),
    likeCount: dbComment.like_count || 0,
    publishedAt: dbComment.published_at,
    updatedAt: dbComment.updated_at || dbComment.published_at,
    videoId: dbComment.video_id,
    videoTitle: dbComment.video_title || '',
    replyCount: dbComment.reply_count || 0,
    isHeartedByCreator: false,
    isPinned: false,
    parentId: dbComment.parent_id,
    replies: [] // Will be populated separately if needed
  };
}

// Debug function to inspect parent-child relationships in the database
function logAllParentChildRelationships() {
  return supabase
    .from('comments')
    .select('comment_id, parent_id')
    .not('parent_id', 'is', null)
    .limit(20)
    .then(({ data, error }) => {
      console.log('🔍 PARENT-CHILD DEBUG - Sample comments with parents:', data);
      console.log('Error if any:', error);
      return data;
    });
}

// Modified getCommentReplies function to fix reply lookup
export async function getCommentReplies(commentId: string) {
  try {
    console.log('🔍 getCommentReplies - Looking for replies to commentId:', commentId);
    
    // First, check if any comments in the database have parent_id matching our commentId
    const { data: replyCheck, error: replyCheckError } = await supabase
      .from('comments')
      .select('count(*)')
      .eq('parent_id', commentId)
      .single();
      
    console.log('📊 getCommentReplies - Reply check result:', replyCheck);
    
    if (replyCheckError) {
      console.error('❌ Reply check error:', replyCheckError);
    }
    
    // Check the actual comment we're looking for replies to
    const { data: parentComment, error: parentError } = await supabase
      .from('comments')
      .select('*')
      .eq('comment_id', commentId)
      .single();
      
    if (parentComment) {
      console.log('✅ Found parent comment:', {
        id: parentComment.id,
        comment_id: parentComment.comment_id,
        video_id: parentComment.video_id,
        text: parentComment.text?.substring(0, 50) + '...' || ''
      });
    } else {
      console.log('⚠️ Parent comment not found for ID:', commentId);
    }
    
    // Search for replies directly 
    const { data: replies, error } = await supabase
      .from('comments')
      .select('*')
      .eq('parent_id', commentId) // This assumes parent_id references comment_id 
      .order('published_at', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching replies:', error);
      return [];
    }
    
    console.log(`📊 Found ${replies?.length || 0} replies for comment:`, commentId);
    
    if (replies && replies.length > 0) {
      // Sample the first reply
      console.log('🔍 First reply sample:', {
        id: replies[0].id,
        comment_id: replies[0].comment_id,
        parent_id: replies[0].parent_id,
        video_id: replies[0].video_id,
        text: replies[0].text?.substring(0, 50) + '...' || ''
      });
    }
    
    // Map to the expected format
    const replyData = replies?.map(reply => mapDbCommentToCommentData(reply)) || [];
    
    return replyData;
  } catch (error) {
    console.error('❌ Error in getCommentReplies:', error);
    return [];
  }
}

// Get videos for a channel
export async function getChannelVideos(channelId: string) {
  try {
    // Step 1: Get the internal UUID for this YouTube channel ID
    const { data: channel } = await supabase
      .from('channels')
      .select('id')
      .eq('channel_id', channelId)
      .single();
    
    if (!channel) {
      console.log('Channel not found with ID:', channelId);
      return [];
    }
    
    console.log('Found channel, internal ID:', channel.id);
    
    // Step 2: Use the internal UUID to query videos
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .eq('channel_id', channel.id);  // Using internal UUID instead of YouTube channel ID
    
    if (error) {
      console.error('Error fetching videos:', error);
      throw error;
    }
    
    if (!videos || videos.length === 0) {
      return [];
    }
    
    // Map DB videos to VideoData format
    const videoData: VideoData[] = videos.map(video => ({
      id: video.video_id,
      title: video.title || 'Untitled Video',
      description: video.description || '',
      publishedAt: video.published_at,
      thumbnailUrl: video.thumbnail_url || '',
      channelId: video.channel_id
    }));
    
    return videoData;
  } catch (error) {
    console.error('Error in getChannelVideos:', error);
    return [];
  }
}

// Add this function to inspect a comment record
function inspectComment(comment: Record<string, any>) {
  console.log('Comment structure:', {
    id: comment.id,
    comment_id: comment.comment_id,
    video_id: comment.video_id,
    parent_id: comment.parent_id,
    channel_id: comment.channel_id,
    // Add other fields you expect
  });
}

// Update the getCommentThreads function with additional debugging
export async function getCommentThreads(
  channelId: string, 
  videoId?: string, 
  page: number = 1, 
  perPage: number = 20
) {
  try {
    console.log('🔎 getCommentThreads - Inputs:', { channelId, videoId, page, perPage });

    // Step 1: Get the internal UUID for this YouTube channel ID
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_id', channelId)
      .single();
    
    if (channelError) {
      console.error('❌ getCommentThreads - Error finding channel:', channelError);
      return [];
    }
    
    if (!channel) {
      console.log('⚠️ getCommentThreads - Channel not found with ID:', channelId);
      return [];
    }
    
    console.log('✅ getCommentThreads - Found channel:', { 
      internal_id: channel.id, 
      channel_id: channel.channel_id,
      title: channel.title
    });
    
    // Step 2: Use the internal UUID to query comments
    const startIdx = (page - 1) * perPage;
    const endIdx = page * perPage - 1;
    
    console.log(`🔢 getCommentThreads - Range: ${startIdx} to ${endIdx}`);
    
    let query = supabase
      .from('comments')
      .select('*')
      .eq('channel_id', channel.id)
      .is('parent_id', null) // Only get top-level comments
      .order('published_at', { ascending: false })
      .range(startIdx, endIdx);
    
    if (videoId) {
      query = query.eq('video_id', videoId);
    }
    
    const { data: comments, error: commentsError } = await query;
    
    if (commentsError) {
      console.error('❌ getCommentThreads - Error fetching comments:', commentsError);
      return [];
    }
    
    console.log(`📊 getCommentThreads - Found ${comments?.length || 0} comments`);
    
    if (!comments || comments.length === 0) {
      return [];
    }
    
    // Sample the first comment to debug
    if (comments.length > 0) {
      console.log('🔍 getCommentThreads - First comment:', {
        id: comments[0].id,
        comment_id: comments[0].comment_id,
        parent_id: comments[0].parent_id,
        channel_id: comments[0].channel_id
      });
    }
    
    // For each comment, count replies and map to CommentData format
    const commentData = await Promise.all(
      comments.map(async (comment) => {
        // Count replies for this comment 
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', comment.comment_id);
        
        const replyCount = count || 0;
        
        // Map DB comment to CommentData format with reply count
        return {
          ...mapDbCommentToCommentData(comment),
          replyCount
        };
      })
    );
    
    return commentData;
  } catch (error) {
    console.error('❌ getCommentThreads - Unhandled error:', error);
    return [];
  }
}

export async function updateCommentReplyCounts() {
  console.log('Updating reply counts for all comments...');
  
  try {
    // For each comment with replies, count them and update the reply_count
    const { data: comments } = await supabase
      .from('comments')
      .select('comment_id')
      .is('parent_id', null);
    
    if (!comments) return;
    
    for (const comment of comments) {
      // Count the replies for this comment
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', comment.comment_id);
      
      // Update the reply_count
      if (count !== undefined) {
        await supabase
          .from('comments')
          .update({ reply_count: count })
          .eq('comment_id', comment.comment_id);
      }
    }
    
    console.log('Reply counts updated successfully');
  } catch (error) {
    console.error('Error updating reply counts:', error);
  }
}

/**
 * Fetches channel information from YouTube API using access token
 */
export async function fetchChannelInfo(accessToken: string) {
  try {
    const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch channels: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching channel info:', error);
    throw error;
  }
}

/**
 * Ensures videos exist in the database
 */
export async function ensureVideosExist(videoIds: string[], channelId: string, apiKey: string) {
  try {
    // Check which videos already exist in the database
    const { data: existingVideos } = await supabase
      .from('videos')
      .select('video_id')
      .in('video_id', videoIds);
    
    const existingVideoIds = existingVideos?.map(v => v.video_id) || [];
    const missingVideoIds = videoIds.filter(id => !existingVideoIds.includes(id));
    
    if (missingVideoIds.length === 0) {
      return true; // All videos already exist
    }
    
    // Fetch details for missing videos from YouTube API
    const videoDetailsPromises = missingVideoIds.map(async (videoId) => {
      const videoResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
      );
      return videoResponse.json();
    });
    
    const videoDetailsResponses = await Promise.all(videoDetailsPromises);
    
    // Insert missing videos into database
    for (const response of videoDetailsResponses) {
      if (response.items?.length > 0) {
        for (const item of response.items) {
          const snippet = item.snippet;
          await supabase
            .from('videos')
            .insert({
              video_id: item.id,
              channel_id: channelId,
              title: snippet.title,
              description: snippet.description,
              thumbnail_url: snippet.thumbnails?.default?.url || null,
              published_at: snippet.publishedAt
            });
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring videos exist:', error);
    throw error;
  }
} 