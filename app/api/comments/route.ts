import { getServerSession } from "next-auth";
import { NextResponse, NextRequest } from "next/server";
import { fetchComments, fetchVideosByChannel, mapYouTubeCommentToDbComment } from "@/lib/youtube";
import { prisma } from "@/lib/prisma";
import { supabase } from '@/lib/supabase';
import { mapDbCommentToCommentData } from '@/lib/youtube';

// Main function to handle all comment retrieval
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const channelId = searchParams.get('channelId');
  const videoId = searchParams.get('videoId');
  const commentId = searchParams.get('commentId');
  const searchQuery = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'date';
  const sortDirection = searchParams.get('sortDirection') || 'desc';
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('perPage') || '50');
  
  // Handle comment by ID
  if (commentId) {
    return await getCommentById(commentId);
  }
  
  // Handle filtering/pagination requests
  if (channelId) {
    return await getFilteredComments(
      channelId, 
      videoId, 
      searchQuery, 
      sortBy, 
      sortDirection, 
      page, 
      perPage
    );
  }
  
  return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
}

// Helper function to get a single comment by ID
async function getCommentById(commentId: string) {
  try {
    // Get comment by ID
    const { data: comment, error } = await supabase
      .from('comments')
      .select('*')
      .eq('comment_id', commentId)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    return NextResponse.json({ comment: mapDbCommentToCommentData(comment) });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Helper function to get filtered comments with pagination
async function getFilteredComments(
  channelId: string, 
  videoId: string | null, 
  searchQuery: string,
  sortBy: string,
  sortDirection: string,
  page: number,
  perPage: number
) {
  try {
    // First, get the internal UUID for this YouTube channel ID
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_id', channelId)
      .single();
    
    if (channelError) {
      console.error('Error finding channel:', channelError);
      return NextResponse.json({ error: channelError.message }, { status: 500 });
    }
    
    // Build the query with filters
    let query = supabase
      .from('comments')
      .select('*', { count: 'exact' })
      .eq('channel_id', channel.id)
      .is('parent_id', null); // Only get top-level comments
    
    // Apply video filter if specified
    if (videoId) {
      query = query.eq('video_id', videoId);
    }
    
    // Apply text search if provided
    if (searchQuery) {
      query = query.ilike('text', `%${searchQuery}%`);
    }
    
    // Apply sorting
    if (sortBy === 'date') {
      query = query.order('published_at', { ascending: sortDirection === 'asc' });
    } else if (sortBy === 'likes') {
      query = query.order('like_count', { ascending: sortDirection === 'asc' });
    } else if (sortBy === 'replies') {
      console.log('Sorting by reply count...');
      
      try {
        // Call the stored procedure to get comments sorted by reply count
        const { data: commentsByReplyCount, error: rpcError } = await supabase
          .rpc('get_comments_with_reply_counts', {
            channel_id_param: channel.id
          });
        
        if (rpcError) {
          console.error('Error getting replies count:', rpcError);
          // Fallback to regular sorting
          query = query.order('reply_count', { ascending: sortDirection === 'asc' });
        } else if (commentsByReplyCount && commentsByReplyCount.length > 0) {
          console.log(`Found ${commentsByReplyCount.length} comments with reply counts`);
          console.log('Sample sorted comments:', commentsByReplyCount.slice(0, 3));
          
          // Sort by reply count in JavaScript to ensure correct direction
          const sortedCommentIds = commentsByReplyCount
            .sort((a, b) => {
              return sortDirection === 'asc' 
                ? a.reply_count - b.reply_count 
                : b.reply_count - a.reply_count;
            })
            .slice((page - 1) * perPage, page * perPage)
            .map(c => c.comment_id);
          
          console.log(`Using ${sortedCommentIds.length} comment IDs for this page`);
          
          // Get the actual comments in the right order
          const { data: sortedComments, error: sortedError } = await supabase
            .from('comments')
            .select('*')
            .in('comment_id', sortedCommentIds);
          
          if (sortedError) {
            console.error('Error fetching sorted comments:', sortedError);
            // Fallback to regular query
          } else {
            // Manually sort the comments to match the order of the IDs
            const orderedComments = sortedCommentIds.map(id => 
              sortedComments.find(comment => comment.comment_id === id)
            ).filter(Boolean);
            
            // Get total count for pagination
            const { count } = await supabase
              .from('comments')
              .select('*', { count: 'exact', head: true })
              .eq('channel_id', channel.id)
              .is('parent_id', null);
            
            console.log(`Returning ${orderedComments.length} sorted comments`);
            
            return NextResponse.json({
              comments: orderedComments.map(mapDbCommentToCommentData),
              page,
              perPage,
              totalCount: count || 0
            });
          }
        }
      } catch (error) {
        console.error('Error in reply count sorting:', error);
        // Continue with regular query as fallback
      }
      
      // Fallback if the above doesn't work
      query = query.order('like_count', { ascending: sortDirection === 'asc' });
    }
    
    // Apply pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);
    
    // Execute the query
    const { data: comments, error, count } = await query;
    
    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Get video options for filter dropdown
    const { data: videos } = await supabase
      .from('comments')
      .select('video_id, video_title')
      .eq('channel_id', channel.id)
      .is('parent_id', null)
      .order('video_title');
    
    // Handle distinct videos in JavaScript since Supabase doesn't support it directly
    const videoMap = new Map();
    videos?.forEach((v: { video_id: string; video_title: string }) => {
      if (!videoMap.has(v.video_id)) {
        videoMap.set(v.video_id, v.video_title);
      }
    });
    
    const uniqueVideos = Array.from(videoMap.entries()).map(([id, title]) => ({ id, title }));
    
    // Transform the comments
    const formattedComments = comments?.map(mapDbCommentToCommentData) || [];
    
    return NextResponse.json({
      comments: formattedComments,
      page,
      perPage,
      totalCount: count || 0,
      videos: uniqueVideos
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Create a separate POST endpoint for creating comments
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { comment, channelId } = body;
    
    if (!comment || !channelId) {
      return NextResponse.json({ error: "Comment and channelId are required" }, { status: 400 });
    }

    // Process and store the comment
    const dbComment = mapYouTubeCommentToDbComment(comment, channelId);
    
    const { data, error } = await supabase
      .from('comments')
      .upsert({
        comment_id: dbComment.comment_id,
        video_id: dbComment.video_id,
        author_name: dbComment.author_name,
        author_profile_url: dbComment.author_profile_url,
        text: dbComment.text, 
        like_count: dbComment.like_count,
        published_at: dbComment.published_at,
        channel_id: dbComment.channel_id,
        is_owner_comment: dbComment.is_owner_comment,
        parent_id: dbComment.parent_id,
      })
      .select();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, comment: data });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
} 