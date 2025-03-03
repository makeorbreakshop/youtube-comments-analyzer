import { NextRequest } from 'next/server';
import { 
  fetchComments, 
  fetchChannelInfo, 
  mapYouTubeCommentToDbComment,
  fetchAllVideosByChannel 
} from '@/lib/youtube';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const runtime = 'nodejs';

// Define interfaces for better type safety
interface ProgressData {
  message?: string;
  stage?: string;
  current?: number;
  total?: number;
  percentage?: number;
  videoTitle?: string;
  videoId?: string;
  commentsCount?: number;
  [key: string]: any; // Allow additional properties
}

interface YouTubeVideo {
  id: string | { videoId: string; } | { kind: string; videoId: string; };
  snippet: {
    title: string;
    description?: string;
    publishedAt?: string;
    channelTitle?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface YouTubeComment {
  id: string;
  snippet: {
    videoId?: string;
    textDisplay?: string;
    authorDisplayName?: string;
    authorProfileImageUrl?: string;
    likeCount?: number;
    publishedAt?: string;
    parentId?: string;
    topLevelComment?: any;
    canReply?: boolean;
    totalReplyCount?: number;
    [key: string]: any;
  };
  replies?: {
    comments?: YouTubeComment[];
  };
  [key: string]: any;
}

interface YouTubeAPIResponse {
  items?: any[];
  nextPageToken?: string;
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const channelName = url.searchParams.get('channelName');
  const maxVideos = parseInt(url.searchParams.get('maxVideos') || '10');
  const includeOldVideos = url.searchParams.get('includeOldVideos') === 'true';
  const maxComments = parseInt(url.searchParams.get('maxComments') || '1000');
  const includeReplies = url.searchParams.get('includeReplies') !== 'false';
  const skipDuplicates = true;
  
  if (!channelName) {
    return new Response(JSON.stringify({ error: 'Channel name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'YouTube API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Create a stream response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Helper function to send progress updates
        const sendProgress = (progress: ProgressData) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', progress })}\n\n`));
        };
        
        // First, find the channel
        sendProgress({ stage: 'Finding channel', message: `Looking up channel "${channelName}"` });
        
        // Get channel details from YouTube
        const channelInfo = await fetchChannelInfo(channelName);
        const channelId = channelInfo?.channelId;
        
        if (!channelId) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: `Channel "${channelName}" not found. Please check the name and try again.` 
          })}\n\n`));
          return;
        }
        
        // Check if this channel exists in our database
        let { data: existingChannel, error: channelError } = await supabase
          .from('channels')
          .select('id, title')
          .eq('channel_id', channelId)
          .single();
        
        let dbChannelId: string;
        
        // If channel doesn't exist, create it
        if (channelError || !existingChannel) {
          sendProgress({ 
            stage: 'Creating channel', 
            message: `First time seeing this channel. Creating database entry for "${channelName}"` 
          });
          
          // Get more channel info from YouTube
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`
          );
          
          if (!response.ok) {
            throw new Error(`Failed to fetch channel details: ${response.statusText}`);
          }
          
          const channelData = await response.json();
          const channelSnippet = channelData.items?.[0]?.snippet;
          
          if (!channelSnippet) {
            throw new Error('Channel details not found');
          }
          
          // Insert the new channel
          const { data: newChannel, error: insertError } = await supabase
            .from('channels')
            .insert({
              channel_id: channelId,
              title: channelSnippet.title,
              description: channelSnippet.description,
              thumbnail_url: channelSnippet.thumbnails?.default?.url
            })
            .select('id')
            .single();
          
          if (insertError || !newChannel) {
            throw new Error(`Failed to create channel: ${insertError?.message || 'Unknown error'}`);
          }
          
          dbChannelId = newChannel.id;
        } else {
          dbChannelId = existingChannel.id;
          sendProgress({ 
            stage: 'Using existing channel', 
            message: `Found existing channel "${existingChannel.title}" in database` 
          });
        }
        
        // Now that we have the channel, fetch its videos
        sendProgress({ stage: 'Fetching videos', message: 'Getting video list from YouTube' });
        
        let videos: YouTubeVideo[];
        if (includeOldVideos) {
          // Fetch all videos (might be slower)
          videos = await fetchAllVideosByChannel(channelId, apiKey);
        } else {
          // Just fetch recent uploads (faster)
          // If no fetchUserVideos is available, use fetchAllVideosByChannel with a limit
          videos = await fetchAllVideosByChannel(channelId, apiKey).then(
            allVideos => allVideos.slice(0, maxVideos)
          );
        }
        
        if (!videos || videos.length === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: `No videos found for channel "${channelName}"` 
          })}\n\n`));
          return;
        }
        
        sendProgress({ 
          stage: 'Found videos', 
          message: `Found ${videos.length} videos for this channel` 
        });
        
        // Check which videos we already have
        const allVideoIds = videos.map(v => {
          // Handle different video ID formats
          if (typeof v.id === 'string') return v.id;
          if ('videoId' in v.id) return v.id.videoId;
          return '';
        }).filter(Boolean);
        
        const { data: existingVideos } = await supabase
          .from('videos')
          .select('video_id')
          .in('video_id', allVideoIds);
        
        const existingVideoIds = new Set(existingVideos?.map(v => v.video_id) || []);
        
        const newVideos = videos.filter(v => {
          const videoId = typeof v.id === 'string' 
            ? v.id 
            : ('videoId' in v.id ? v.id.videoId : '');
          return videoId && !existingVideoIds.has(videoId);
        });
        
        const processedVideos = [...videos];
        
        sendProgress({ 
          stage: 'Processing videos', 
          message: `Processing ${videos.length} videos (${newVideos.length} new)` 
        });
        
        // Process videos and fetch comments
        let allComments: YouTubeComment[] = [];
        let totalCommentsFound = 0;
        
        for (let i = 0; i < processedVideos.length; i++) {
          const video = processedVideos[i];
          const videoId = typeof video.id === 'string' 
            ? video.id 
            : ('videoId' in video.id ? video.id.videoId : '');
          const videoTitle = video.snippet.title;
          
          sendProgress({ 
            stage: 'Fetching comments', 
            message: `Getting comments for video ${i + 1} of ${processedVideos.length}`,
            current: i + 1,
            total: processedVideos.length,
            percentage: Math.round(((i + 1) / processedVideos.length) * 100),
            videoTitle,
            videoId
          });
          
          if (!videoId) {
            console.error('Invalid video ID format:', video.id);
            continue;
          }
          
          try {
            const videoComments = await fetchCommentsWithProgress(
              videoId,
              videoTitle,
              apiKey,
              includeReplies,
              (count: number) => {
                totalCommentsFound += count;
                sendProgress({
                  stage: 'Fetching comments',
                  current: i + 1,
                  total: processedVideos.length,
                  percentage: Math.round(((i + 1) / processedVideos.length) * 100),
                  videoTitle,
                  videoId,
                  commentsCount: count,
                  message: `Found ${count} comments for "${videoTitle.substring(0, 40)}${videoTitle.length > 40 ? '...' : ''}"`
                });
              }
            );
            
            allComments = [...allComments, ...videoComments];
          } catch (error) {
            console.error(`Error fetching comments for video ${videoId}:`, error);
          }
          
          // Respect the max comments limit
          if (totalCommentsFound >= maxComments) {
            sendProgress({ 
              stage: 'Max comments reached', 
              message: `Reached maximum limit of ${maxComments} comments` 
            });
            break;
          }
        }
        
        // Sort comments to ensure parent comments come before replies (more robustly)
        const sortedComments = [...allComments].sort((a: YouTubeComment, b: YouTubeComment) => {
          // Extract parent IDs (if any)
          const aParentId = a.snippet.parentId;
          const bParentId = b.snippet.parentId;
          
          // If a is a reply to b, b should come first
          if (aParentId === b.id) return 1;
          
          // If b is a reply to a, a should come first
          if (bParentId === a.id) return -1;
          
          // Put all top-level comments before all replies
          if (aParentId && !bParentId) return 1;
          
          // Put all top-level comments before all replies
          if (!aParentId && bParentId) return -1;
          
          // If both are top-level or neither is a direct reply to the other,
          // sort by published date (newest first)
          const aDate = new Date(a.snippet.publishedAt || '').getTime() || 0;
          const bDate = new Date(b.snippet.publishedAt || '').getTime() || 0;
          
          return bDate - aDate;
        });
        
        // Extract all video IDs from comments
        const commentVideoIds = Array.from(new Set(allComments.map(comment => comment.snippet.videoId || '')))
          .filter(Boolean);
        
        // Ensure all videos exist in the database
        await ensureVideosExist(commentVideoIds, dbChannelId, apiKey);
        
        // Convert YouTube comment format to our database format
        const dbComments = sortedComments.map(comment => 
          mapYouTubeCommentToDbComment(comment, dbChannelId)
        );
        
        // Split the comments into batches of 100 for insertion
        const batchSize = 100;
        const batches = [];
        
        for (let i = 0; i < dbComments.length; i += batchSize) {
          batches.push(dbComments.slice(i, i + batchSize));
        }
        
        sendProgress({ 
          stage: 'Saving to database', 
          message: `Saving ${dbComments.length} comments in ${batches.length} batches`,
          total: batches.length,
          current: 0
        });
        
        let newCommentsInserted = 0;
        let skippedComments = 0;
        
        // Process each batch
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          sendProgress({ 
            stage: 'Saving to database', 
            message: `Processing batch ${i + 1} of ${batches.length}`,
            current: i + 1,
            total: batches.length,
            percentage: Math.round(((i + 1) / batches.length) * 100)
          });
          
          if (skipDuplicates) {
            // Get comment IDs from this batch
            const commentIds = batch.map(c => c.comment_id);
            
            // Check which ones already exist
            const { data: existingComments } = await supabase
              .from('comments')
              .select('comment_id')
              .in('comment_id', commentIds);
            
            const existingIds = new Set(existingComments?.map(c => c.comment_id) || []);
            
            // Filter out comments that already exist
            const newComments = batch.filter(c => !existingIds.has(c.comment_id));
            
            // Update counts
            skippedComments += batch.length - newComments.length;
            
            // Insert only new comments
            if (newComments.length > 0) {
              const { data, error } = await supabase
                .from('comments')
                .insert(newComments);
              
              if (error) {
                console.error('Error inserting comments:', error);
              } else {
                newCommentsInserted += newComments.length;
              }
            }
          } else {
            // Insert all comments using upsert
            const { data, error } = await supabase
              .from('comments')
              .upsert(batch, { onConflict: 'comment_id' });
            
            if (error) {
              console.error('Error upserting comments:', error);
            } else {
              newCommentsInserted += batch.length;
            }
          }
        }
        
        // Send completion event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          result: {
            channel: {
              id: dbChannelId,
              name: channelName
            },
            videos: {
              total: processedVideos.length,
              processed: processedVideos.length
            },
            comments: {
              total: totalCommentsFound,
              processed: dbComments.length,
              inserted: newCommentsInserted,
              skipped: skippedComments
            }
          }
        })}\n\n`));
      } catch (error: unknown) {
        console.error('Streaming error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

async function fetchCommentsWithProgress(
  videoId: string, 
  videoTitle: string,
  apiKey: string,
  includeReplies: boolean,
  progressCallback: (count: number) => void
): Promise<YouTubeComment[]> {
  let allComments: YouTubeComment[] = [];
  let commentNextPageToken: string | null = null;
  let page = 1;
  
  do {
    console.log(`Fetching comments for video: ${videoTitle} (page ${page})`);
    
    const fetchUrl: string = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${videoId}&key=${apiKey}&maxResults=100${commentNextPageToken ? `&pageToken=${commentNextPageToken}` : ''}`;
    const response = await fetch(fetchUrl);
    const data: YouTubeAPIResponse = await response.json();
    
    const videoComments = data.items || [];
    let newCommentsCount = 0;
    
    // Process comment threads
    for (const thread of videoComments) {
      // Extract top-level comment
      const topLevelComment = thread.snippet?.topLevelComment;
      
      if (topLevelComment) {
        // Ensure the comment has the video ID
        if (topLevelComment.snippet) {
          topLevelComment.snippet.videoId = videoId;
          topLevelComment.snippet.videoTitle = videoTitle;
        }
        
        allComments.push(topLevelComment);
        newCommentsCount++;
        
        // Add replies if they exist and we want them
        if (includeReplies && thread.replies && thread.replies.comments) {
          const replies = thread.replies.comments;
          
          for (const reply of replies) {
            // Ensure replies have videoId and are properly tagged as replies
            if (reply.snippet) {
              reply.snippet.videoId = videoId;
              reply.snippet.videoTitle = videoTitle;
              reply.snippet.parentId = topLevelComment.id;
            }
            
            allComments.push(reply);
            newCommentsCount++;
          }
        }
        
        // If there are more replies than the first page (usually 5), fetch them
        if (includeReplies && 
            thread.snippet.totalReplyCount > (thread.replies?.comments?.length || 0) && 
            thread.snippet.totalReplyCount > 5) {
          
          // We'll need to fetch additional replies in separate API calls
          // This would be a good place to add that logic if needed
        }
      }
    }
    
    // Report progress
    progressCallback(newCommentsCount);
    
    // Get the next page token
    commentNextPageToken = data.nextPageToken || null;
    page++;
    
    // Respect YouTube's rate limits - pause between requests
    if (commentNextPageToken) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  } while (commentNextPageToken);
  
  return allComments;
}

// Ensure videos exist in our database
async function ensureVideosExist(videoIds: string[], channelId: string, apiKey: string) {
  // First check which ones we already have
  const { data: existingVideos } = await supabase
    .from('videos')
    .select('video_id')
    .in('video_id', videoIds);
  
  const existingVideoIds = new Set(existingVideos?.map(v => v.video_id) || []);
  const missingVideoIds = videoIds.filter(id => !existingVideoIds.has(id));
  
  if (missingVideoIds.length === 0) {
    return;
  }
  
  console.log(`Fetching details for ${missingVideoIds.length} videos`);
  
  // Fetch details in batches of 50 (YouTube API limit)
  const batchSize = 50;
  
  for (let i = 0; i < missingVideoIds.length; i += batchSize) {
    const batch = missingVideoIds.slice(i, i + batchSize);
    const idsParam = batch.join(',');
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${idsParam}&key=${apiKey}`
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch video details: ${response.statusText}`);
      continue;
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log('No video details returned from YouTube API');
      continue;
    }
    
    // Convert to our format
    const videosToInsert = data.items.map((item: any) => ({
      video_id: item.id,
      title: item.snippet?.title || 'Unknown Title',
      description: item.snippet?.description || '',
      thumbnail_url: item.snippet?.thumbnails?.medium?.url || '',
      view_count: parseInt(item.statistics?.viewCount || '0'),
      like_count: parseInt(item.statistics?.likeCount || '0'),
      comment_count: parseInt(item.statistics?.commentCount || '0'),
      published_at: item.snippet?.publishedAt || new Date().toISOString(),
      channel_id: channelId
    }));
    
    // Insert the videos
    const { error } = await supabase
      .from('videos')
      .insert(videosToInsert);
    
    if (error) {
      console.error('Error inserting videos:', error);
    } else {
      console.log(`Inserted ${videosToInsert.length} videos into database`);
    }
    
    // Respect rate limits
    if (i + batchSize < missingVideoIds.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
} 