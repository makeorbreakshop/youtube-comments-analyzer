import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchForChannel, fetchVideosByChannel, fetchAllVideosByChannel } from '@/lib/youtube';

export async function POST(request: Request) {
  try {
    const { channelName } = await request.json();
    
    if (!channelName) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    }
    
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }
    
    // Search for the channel by name
    console.log(`Searching for channel: ${channelName}`);
    const ytChannelId = await searchForChannel(channelName, apiKey);
    
    // Check if channel already exists in the database
    const { data: existingChannel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_id', ytChannelId)
      .single();
    
    let dbChannelId;
    
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
      
      // Insert the channel into the database
      const { data: newChannel, error: insertError } = await supabase
        .from('channels')
        .insert({
          channel_id: ytChannelId,
          title: snippet.title,
          description: snippet.description,
          thumbnail_url: snippet.thumbnails.default.url
        })
        .select()
        .single();
      
      if (insertError) {
        return NextResponse.json({ error: `Failed to save channel: ${insertError.message}` }, { status: 500 });
      }
      
      dbChannelId = newChannel.id;
    } else {
      dbChannelId = existingChannel.id;
    }
    
    // Fetch ALL videos for the channel (with pagination)
    console.log(`Fetching all videos for channel ID: ${ytChannelId}`);
    const videos = await fetchAllVideosByChannel(ytChannelId, apiKey);
    console.log(`Found ${videos.length} total videos for channel`);
    
    // Map videos to the database format
    const videosToInsert = videos.map(video => {
      // Extract video ID based on different possible structures
      let videoId: string;
      if (typeof video.id === 'string') {
        videoId = video.id;
      } else if (video.id && typeof video.id === 'object' && 'videoId' in video.id) {
        videoId = video.id.videoId;
      } else if (video.snippet?.resourceId?.videoId) {
        videoId = video.snippet.resourceId.videoId;
      } else {
        videoId = '';
        console.warn('Could not extract video ID from video:', video);
      }
      
      return {
        video_id: videoId,
        title: video.snippet.title,
        description: video.snippet.description || "",
        thumbnail_url: video.snippet.thumbnails?.default?.url || "",
        published_at: new Date(video.snippet.publishedAt),
        channel_id: dbChannelId
      };
    });
    
    console.log(`Prepared ${videosToInsert.length} videos for insertion`);
    
    // Insert videos into the database
    const { error: videosError } = await supabase
      .from('videos')
      .upsert(videosToInsert, { onConflict: 'video_id' });
    
    if (videosError) {
      return NextResponse.json({ error: `Failed to save videos: ${videosError.message}` }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      videoCount: videosToInsert.length
    });
  } catch (error) {
    console.error('Error importing videos:', error);
    return NextResponse.json(
      { error: `Failed to import videos: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 