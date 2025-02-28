import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mapDbCommentToCommentData } from '@/lib/youtube';
import { decodeHtmlEntities, decodeAllHtmlEntities } from '@/lib/utils';
import he from 'he';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const channelId = searchParams.get('channelId');
  const videoId = searchParams.get('videoId');
  const searchQuery = searchParams.get('search') || '';
  const sortOption = searchParams.get('sortBy') || 'published_at';
  const sortDirection = searchParams.get('sortDirection') || 'desc';
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('perPage') || '50');
  
  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
  }
  
  try {
    // First get the channel from database
    const { data: channels, error: channelError } = await supabase
      .from('channels')
      .select('id, channel_id, title')
      .eq('channel_id', channelId);
    
    if (channelError || !channels || channels.length === 0) {
      console.error('Channel lookup error:', channelError || 'Channel not found');
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }
    
    const channel = channels[0];
    
    // Map frontend sort options to actual database columns
    let sortBy = 'published_at'; // Default sort
    
    // Map the sortOption from the frontend to actual database column names
    if (sortOption === 'date') {
      sortBy = 'published_at';
    } else if (sortOption === 'likes') {
      sortBy = 'like_count';
    } else if (sortOption === 'replies') {
      sortBy = 'reply_count';
    }

    // Build the query with all filters
    let query = supabase
      .from('comments')
      .select('*, video:videos(title)', { count: 'exact' })
      .eq('channel_id', channel.id) // Use the internal UUID
      .order(sortBy, { ascending: sortDirection === 'asc' });
    
    // Add video filter if present
    if (videoId) {
      query = query.eq('video_id', videoId);
    }
    
    // Add text search if present
    if (searchQuery) {
      query = query.textSearch('text', searchQuery, { 
        type: 'websearch',
        config: 'english' 
      });
    }
    
    // Apply pagination
    const from = (page - 1) * perPage;
    query = query.range(from, from + perPage - 1);
    
    // Execute the query
    const { data: comments, count, error } = await query;
    
    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }
    
    // Extract and deduplicate videos
    const videoIds = new Set<string>();
    comments?.forEach(comment => {
      if (comment.video_id) {
        videoIds.add(comment.video_id);
      }
    });
    
    // Format into a simple array for the frontend
    const uniqueVideos = Array.from(videoIds).map(vid => {
      const videoData = comments?.find(c => c.video_id === vid)?.video;
      return { 
        id: vid, 
        title: videoData?.title || 'Unknown Video'
      };
    });
    
    // Transform data for frontend using your existing mapping function
    const formattedComments = comments?.map(comment => {
      // Decode the text server-side before sending to the client
      const decodedText = he.decode(comment.text || '');
      
      return {
        id: comment.comment_id,
        authorDisplayName: comment.author_name,
        authorProfileImageUrl: comment.author_profile_url,
        textDisplay: decodedText, // Send the pre-decoded text
        likeCount: comment.like_count,
        publishedAt: comment.published_at,
        videoId: comment.video_id,
        videoTitle: comment.video?.title || 'Unknown Video',
        replyCount: comment.reply_count,
        replies: []
      };
    }) || [];
    
    return NextResponse.json({
      comments: formattedComments,
      count,
      page,
      totalPages: Math.ceil((count || 0) / perPage),
      videos: uniqueVideos
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 