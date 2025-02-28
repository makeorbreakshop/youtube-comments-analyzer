import { NextRequest } from 'next/server';
import { 
  searchForChannel, 
  fetchLatestChannelComments, 
  mapYouTubeCommentToDbComment, 
  ensureVideosExist,
  fetchVideosByChannel,
  fetchAllVideosByChannel 
} from '@/lib/youtube';
import { supabase } from '@/lib/supabase';

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
        const sendProgress = (progress) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', progress })}\n\n`));
        };
        
        // First, find the channel
        sendProgress({ 
          status: 'Searching for channel...',
          currentVideo: '',
          videosProcessed: 0,
          totalVideos: 0,
          commentsFound: 0
        });
        
        const ytChannelId = await searchForChannel(channelName, apiKey);
        
        // Check if channel already exists in the database
        const { data: existingChannel, error: channelError } = await supabase
          .from('channels')
          .select('*')
          .eq('channel_id', ytChannelId)
          .single();
        
        let dbChannelId;
        let channelTitle;
        
        if (!existingChannel) {
          // Fetch channel details from YouTube API
          sendProgress({ 
            status: 'Fetching channel details...',
            currentVideo: '',
            videosProcessed: 0,
            totalVideos: 0,
            commentsFound: 0
          });
          
          const channelResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${ytChannelId}&key=${apiKey}`
          );
          const channelData = await channelResponse.json();
          
          if (!channelData.items || channelData.items.length === 0) {
            throw new Error('Channel not found on YouTube');
          }
          
          const snippet = channelData.items[0].snippet;
          channelTitle = snippet.title;
          
          // Insert the channel into the database
          const { data: newChannel, error: insertError } = await supabase
            .from('channels')
            .insert({
              channel_id: ytChannelId,
              title: snippet.title,
              description: snippet.description,
              thumbnail_url: snippet.thumbnails.default.url,
              user_id: '00000000-0000-0000-0000-000000000000' // Anonymous user ID
            })
            .select()
            .single();
          
          if (insertError) {
            throw new Error(`Failed to save channel: ${insertError.message}`);
          }
          
          dbChannelId = newChannel.id;
        } else {
          dbChannelId = existingChannel.id;
          channelTitle = existingChannel.title;
        }
        
        // Start fetching comments
        sendProgress({ 
          status: 'Preparing to fetch comments...',
          currentVideo: '',
          videosProcessed: 0,
          totalVideos: 0,
          commentsFound: 0
        });
        
        // Custom implementation to track progress for each video
        const allVideos = includeOldVideos 
          ? await fetchAllVideosByChannel(ytChannelId, apiKey)
          : await fetchVideosByChannel(ytChannelId, apiKey).then(resp => resp.items || []);
        
        // Sort and limit videos as needed
        let processedVideos = [...allVideos];
        if (!includeOldVideos) {
          processedVideos.sort((a, b) => {
            const dateA = new Date(a.snippet.publishedAt).getTime();
            const dateB = new Date(b.snippet.publishedAt).getTime();
            return dateB - dateA; // Newest first
          });
          
          if (maxVideos !== -1) {
            processedVideos = processedVideos.slice(0, maxVideos);
          }
        }
        
        // Update total videos count in progress
        sendProgress({ 
          status: 'Starting comment import...',
          currentVideo: '',
          videosProcessed: 0,
          totalVideos: processedVideos.length,
          commentsFound: 0
        });
        
        // Process videos and fetch comments
        let allComments = [];
        let totalCommentsFound = 0;
        
        for (let i = 0; i < processedVideos.length; i++) {
          const video = processedVideos[i];
          const videoId = video.id?.videoId || video.id;
          const videoTitle = video.snippet.title;
          
          sendProgress({ 
            status: 'Fetching comments...',
            currentVideo: videoTitle,
            videosProcessed: i,
            totalVideos: processedVideos.length,
            commentsFound: totalCommentsFound
          });
          
          try {
            // Fetch comments for this video
            const videoComments = await fetchCommentsWithProgress(videoId, videoTitle, apiKey, includeReplies, (count) => {
              totalCommentsFound += count;
              sendProgress({ 
                status: 'Fetching comments...',
                currentVideo: videoTitle,
                videosProcessed: i,
                totalVideos: processedVideos.length,
                commentsFound: totalCommentsFound
              });
            });
            
            allComments = [...allComments, ...videoComments];
          } catch (error) {
            console.error(`Error fetching comments for video ${videoId}:`, error);
          }
          
          // Final update for this video
          sendProgress({ 
            status: 'Fetching comments...',
            currentVideo: videoTitle,
            videosProcessed: i + 1,
            totalVideos: processedVideos.length,
            commentsFound: totalCommentsFound
          });
        }
        
        // Now process and save all the comments
        sendProgress({ 
          status: 'Processing comments...',
          currentVideo: '',
          videosProcessed: processedVideos.length,
          totalVideos: processedVideos.length,
          commentsFound: totalCommentsFound
        });
        
        // Sort comments to ensure parent comments come before replies (more robustly)
        const sortedComments = [...allComments].sort((a, b) => {
          // Extract parent IDs (if any)
          const aParentId = a.snippet.parentId;
          const bParentId = b.snippet.parentId;
          
          // If a is a reply to b, b should come first
          if (aParentId === b.id) return 1;
          
          // If b is a reply to a, a should come first
          if (bParentId === a.id) return -1;
          
          // If only a is a reply, it should come after non-replies
          if (aParentId && !bParentId) return 1;
          
          // If only b is a reply, it should come after non-replies
          if (!aParentId && bParentId) return -1;
          
          // Otherwise maintain original order
          return 0;
        });
        
        // Then map the sorted comments
        const mappedComments = sortedComments.map(comment => 
          mapYouTubeCommentToDbComment(comment, dbChannelId)
        );
        
        // Extract all video IDs from comments
        const videoIds = Array.from(new Set(allComments.map(comment => comment.snippet.videoId)));
        
        // Ensure all videos exist in the database
        await ensureVideosExist(videoIds, dbChannelId, apiKey);
        
        // Get existing comment IDs to avoid duplicates
        let existingCommentIds = [];
        
        if (skipDuplicates && mappedComments.length > 0) {
          const { data: existingComments } = await supabase
            .from('comments')
            .select('comment_id')
            .eq('channel_id', dbChannelId);
          
          existingCommentIds = existingComments?.map(c => c.comment_id) || [];
        }
        
        // Filter out duplicates
        const uniqueComments = skipDuplicates 
          ? mappedComments.filter(c => !existingCommentIds.includes(c.comment_id))
          : mappedComments;
        
        // Save to database in batches
        let insertedCount = 0;
        
        sendProgress({ 
          status: 'Saving comments to database...',
          currentVideo: '',
          videosProcessed: processedVideos.length,
          totalVideos: processedVideos.length,
          commentsFound: totalCommentsFound
        });
        
        // Batch the comments for insertion
        const BATCH_SIZE = 50;
        let errorCount = 0;
        const MAX_ERRORS = 5; // Stop after 5 critical errors
        for (let i = 0; i < uniqueComments.length && errorCount < MAX_ERRORS; i += BATCH_SIZE) {
          const batch = uniqueComments.slice(i, i + BATCH_SIZE);
          
          try {
            // First check if these comments already exist
            const commentIds = batch.map(comment => comment.comment_id);
            
            const { data: existingCommentsBatch, error: queryError } = await supabase
              .from('comments')
              .select('comment_id')
              .in('comment_id', commentIds);
            
            if (queryError) {
              console.error('Error querying existing comments:', queryError);
              errorCount++;
              continue; // Skip this batch if we can't query existing comments
            }
            
            const existingIds = new Set(existingCommentsBatch?.map(c => c.comment_id) || []);
            
            // Filter out any comments that already exist in the database
            const newComments = batch.filter(comment => !existingIds.has(comment.comment_id));
            
            // Check for parent-child relationships within this batch
            // Ensure we insert parents first
            const parentIds = new Set(newComments.map(c => c.parent_id).filter(Boolean));
            const parentComments = newComments.filter(c => parentIds.has(c.comment_id));
            const nonParentComments = newComments.filter(c => !parentIds.has(c.comment_id));
            
            // Insert parents first if any exist in this batch
            if (parentComments.length > 0) {
              const { error: parentError } = await supabase
                .from('comments')
                .insert(parentComments);
              
              if (parentError) {
                console.error('Error inserting parent comments:', parentError);
                errorCount++;
              } else {
                insertedCount += parentComments.length;
                console.log(`Inserted ${parentComments.length} parent comments`);
              }
            }
            
            // Then insert the rest
            if (nonParentComments.length > 0) {
              const { error: insertError } = await supabase
                .from('comments')
                .insert(nonParentComments);
              
              if (insertError) {
                console.error('Error inserting comments:', insertError);
                
                // Check if it's a foreign key error and increment error count
                if (insertError.code === '23503') {
                  errorCount++;
                  console.error('Foreign key constraint error - possible missing parent comment');
                }
              } else {
                insertedCount += nonParentComments.length;
                console.log(`Inserted ${nonParentComments.length} comments`);
              }
            }
            
          } catch (error) {
            console.error('Error processing batch:', error);
            errorCount++;
          }
          
          // Send progress update
          sendProgress({
            status: errorCount >= MAX_ERRORS 
              ? `Import stopped after ${errorCount} errors. Inserted ${insertedCount} comments.`
              : `Processed ${i + batch.length} of ${uniqueComments.length} comments (${insertedCount} inserted)`,
            currentVideo: errorCount >= MAX_ERRORS ? 'Import stopped' : 'Processing complete',
            videosProcessed: processedVideos.length,
            totalVideos: processedVideos.length,
            commentsFound: uniqueComments.length
          });
          
          // Stop the process if we've hit the error threshold
          if (errorCount >= MAX_ERRORS) {
            console.log(`Import stopped after ${errorCount} errors`);
            break;
          }
        }
        
        // Complete the import with appropriate message
        if (errorCount >= MAX_ERRORS) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: `Import stopped after ${errorCount} errors. Inserted ${insertedCount} comments.`
          })}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            commentCount: insertedCount,
            channelTitle: channelTitle,
            videosProcessed: processedVideos.length,
            totalVideosAvailable: allVideos.length
          })}\n\n`));
        }
        
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: error.message
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

// Helper function to fetch comments with progress tracking
async function fetchCommentsWithProgress(
  videoId: string, 
  videoTitle: string,
  apiKey: string,
  includeReplies: boolean,
  progressCallback: (count: number) => void
) {
  let comments = [];
  let commentNextPageToken;
  let page = 1;
  
  do {
    console.log(`Fetching comments for video: ${videoTitle} (page ${page})`);
    
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${videoId}&key=${apiKey}&maxResults=100${commentNextPageToken ? `&pageToken=${commentNextPageToken}` : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    
    const videoComments = data.items || [];
    let newCommentsCount = 0;
    
    // Add each comment and its replies
    for (const comment of videoComments) {
      comments.push({
        ...comment,
        snippet: {
          ...comment.snippet,
          videoTitle
        }
      });
      newCommentsCount++;
      
      // Add replies if requested and available
      if (includeReplies && comment.replies && comment.replies.comments) {
        for (const reply of comment.replies.comments) {
          comments.push({
            id: reply.id,
            snippet: {
              videoId,
              topLevelComment: {
                snippet: reply.snippet
              },
              videoTitle,
              parentId: comment.id
            }
          });
          newCommentsCount++;
        }
      }
    }
    
    // Report progress
    progressCallback(newCommentsCount);
    
    // Get next page token
    commentNextPageToken = data.nextPageToken;
    page++;
    
    // Add a small delay to avoid API rate limits
    if (commentNextPageToken) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
  } while (commentNextPageToken);
  
  return comments;
} 