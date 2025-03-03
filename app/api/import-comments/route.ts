import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchForChannel, fetchLatestChannelComments, mapYouTubeCommentToDbComment, getCommentThreads, getCommentReplies, getChannelVideos } from '@/lib/youtube';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const channelId = searchParams.get('channelId');
  const videoId = searchParams.get('videoId') || undefined;
  
  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
  }
  
  try {
    const comments = await getCommentThreads(channelId, videoId);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // First determine what type of request this is
  const body = await request.json();
  
  // If it's a comment replies request
  if (body.commentId) {
    try {
      const replies = await getCommentReplies(body.commentId);
      return NextResponse.json({ replies });
    } catch (error) {
      console.error('Error fetching replies:', error);
      return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
    }
  } 
  // If it's a channel import request
  else if (body.channelName) {
    try {
      const { channelName, maxVideos = 10, includeOldVideos = false, skipDuplicates = true, maxComments = 1000, includeReplies = true } = body;
      
      if (!channelName) {
        return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
      }
      
      const apiKey = process.env.YOUTUBE_API_KEY;
      
      if (!apiKey) {
        return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
      }
      
      // Check authentication (optional for now as we've set up public access in RLS)
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      
      // Search for the channel by name
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
        const channelResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${ytChannelId}&key=${apiKey}`
        );
        const channelData = await channelResponse.json();
        
        if (!channelData.items || channelData.items.length === 0) {
          return NextResponse.json({ error: 'Channel not found on YouTube' }, { status: 404 });
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
            user_id: userId || '00000000-0000-0000-0000-000000000000' // Anonymous user ID
          })
          .select()
          .single();
        
        if (insertError) {
          return NextResponse.json({ error: `Failed to save channel: ${insertError.message}` }, { status: 500 });
        }
        
        dbChannelId = newChannel.id;
      } else {
        dbChannelId = existingChannel.id;
        channelTitle = existingChannel.title;
      }
      
      // Fetch comments for the channel with options for more comprehensive importing
      const comments = await fetchLatestChannelComments(
        ytChannelId,
        apiKey,
        maxVideos,
        includeOldVideos,
        maxComments,
        includeReplies
      );
      
      // Extract all video IDs from comments
      const videoIds = Array.from(new Set(comments.map(comment => comment.snippet.videoId)));
      // Ensure all videos exist in the database before importing comments
      await Promise.all(videoIds.map(async (videoId) => {
        // Check if video exists in database
        const { data: existingVideo } = await supabase
          .from('videos')
          .select('id')
          .eq('video_id', videoId)
          .single();

        if (!existingVideo) {
          // Fetch video details from YouTube API
          const videoResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
          );
          const videoData = await videoResponse.json();
          
          if (videoData.items?.length > 0) {
            const snippet = videoData.items[0].snippet;
            // Insert video into database
            await supabase
              .from('videos')
              .insert({
                video_id: videoId,
                channel_id: dbChannelId,
                title: snippet.title,
                description: snippet.description,
                thumbnail_url: snippet.thumbnails?.default?.url || null,
                published_at: snippet.publishedAt
              });
          }
        }
      }));
      
      // Map comments to the database format
      const commentsToInsert = comments.map(comment => 
        mapYouTubeCommentToDbComment(comment, dbChannelId)
      );
      
      // Get existing comment IDs to avoid duplicates if skipDuplicates is true
      let existingCommentIds: string[] = [];
      
      if (skipDuplicates && commentsToInsert.length > 0) {
        const { data: existingComments } = await supabase
          .from('comments')
          .select('comment_id')
          .eq('channel_id', dbChannelId);
        
        existingCommentIds = existingComments?.map(c => c.comment_id) || [];
      }
      
      // Filter out duplicates
      const uniqueComments = skipDuplicates 
        ? commentsToInsert.filter(c => !existingCommentIds.includes(c.comment_id))
        : commentsToInsert;
      
      let insertedCount = 0;
      
      // Process in batches to avoid request size limitations
      if (uniqueComments.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < uniqueComments.length; i += batchSize) {
          const batch = uniqueComments.slice(i, i + batchSize);
          
          const { error: commentsError } = await supabase
            .from('comments')
            .insert(batch);
          
          if (commentsError) {
            return NextResponse.json({ 
              error: `Failed to save comments batch: ${commentsError.message}`,
              partialSuccess: true,
              commentCount: insertedCount
            }, { status: 500 });
          }
          
          insertedCount += batch.length;
        }
      }
      
      return NextResponse.json({
        success: true,
        channelId: dbChannelId,
        channelTitle,
        commentCount: insertedCount,
        totalCommentsFetched: comments.length,
        duplicatesSkipped: comments.length - insertedCount
      });
    } catch (error) {
      console.error('Error importing comments:', error);
      return NextResponse.json({ error: 'Failed to import comments' }, { status: 500 });
    }
  }
  // Invalid request
  else {
    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
  }
} 