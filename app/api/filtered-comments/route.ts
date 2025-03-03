import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { decodeHtmlEntities } from '@/lib/utils';
import { CommentData } from '@/lib/types';

interface DatabaseReply {
  comment_id: string;
  author_name: string;
  author_profile_url: string;
  text: string;
  like_count: number;
  published_at: string;
  video_id: string;
  video_title?: string;
  parent_id: string;
  updated_at?: string;
}

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const runtime = 'nodejs';
export const preferredRegion = 'auto';
export const maxDuration = 60;

// Enhanced GET function to include correct reply counts and optionally include replies
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get('channelId');
    const videoId = searchParams.get('videoId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortDirection = searchParams.get('sortDirection') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '50');
    const includeReplies = searchParams.get('includeReplies') === 'true';
    
    // Ensure we have a channelId
    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    // Fetch the channel to make sure it exists and get its internal UUID
    const { data: channels, error: channelError } = await supabase
      .from('channels')
      .select('id, channel_id, title')
      .eq('channel_id', channelId);

    if (channelError || !channels || channels.length === 0) {
      console.error('Channel lookup error:', channelError || 'Channel not found');
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    const channel = channels[0];
    const internalChannelId = channel.id; // This is the UUID we need

    // Map frontend sort options to actual columns
    const sortColumnMap: Record<string, string> = {
      date: 'published_at',
      likes: 'like_count',
      replies: 'reply_count',
      // Add any other sort options here
    };

    // Default sort is by published_at
    const sortColumn = sortColumnMap[sortBy] || 'published_at';
    
    console.log(`Fetching comments for channel ${channelId} with sort: ${sortColumn} ${sortDirection}`);

    // Start building the query - use the internal UUID, not the YouTube channel ID
    let query = supabase
      .from('comments')
      .select('*, videos(title)')
      .eq('channel_id', internalChannelId) // Use internal UUID
      .is('parent_id', null); // Only select top-level comments, not replies

    // Add video filter if specified
    if (videoId) {
      query = query.eq('video_id', videoId);
    }

    // Add text search if specified
    if (search) {
      query = query.ilike('text', `%${search}%`);
    }

    // Build a count query with the same filters
    // Get the total count
    let totalCount = 0;
    try {
      let countQuery = supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', internalChannelId) // Use internal UUID
        .is('parent_id', null);
      
      // Apply the same filters as the main query
      if (videoId) {
        countQuery = countQuery.eq('video_id', videoId);
      }
      
      if (search) {
        countQuery = countQuery.ilike('text', `%${search}%`);
      }
      
      const { count } = await countQuery;
      totalCount = count || 0;
    } catch (countError) {
      console.error('Error counting comments:', countError);
    }

    // Apply sorting and pagination
    if (sortBy === 'replies') {
      // For replies sorting, use the stored procedure which is more accurate
      console.log(`Using stored procedure for sorting by reply count (${sortDirection})`);
      try {
        // Get comments sorted by reply count using the stored procedure
        const { data: commentsByReplyCount, error: rpcError } = await supabase.rpc(
          'get_comments_with_reply_counts',
          { channel_id_param: internalChannelId }
        );
        
        if (rpcError) {
          console.error('Error using stored procedure:', rpcError);
          // Fall back to regular sorting if the stored procedure fails
          query = query
            .order('reply_count', { ascending: sortDirection === 'asc' })
            .order('published_at', { ascending: false });
        } else {
          console.log(`Found ${commentsByReplyCount.length} comments with reply counts from stored procedure`);
          
          // Sort by reply count in JavaScript for proper direction control
          const sortedCommentIds = commentsByReplyCount
            .sort((a: any, b: any) => {
              return sortDirection === 'asc' 
                ? a.reply_count - b.reply_count 
                : b.reply_count - a.reply_count;
            })
            .slice((page - 1) * perPage, page * perPage)
            .map((c: any) => c.comment_id);
          
          console.log(`After sorting, using ${sortedCommentIds.length} comment IDs for page ${page}`);
          
          // If we have any results from the stored procedure, use them
          if (sortedCommentIds.length > 0) {
            console.log(`Top comment IDs by reply count:`, sortedCommentIds.slice(0, 5));
            
            // Get the actual comments in the right order
            const { data: sortedComments, error: sortedError } = await supabase
              .from('comments')
              .select('*, videos(title)')
              .in('comment_id', sortedCommentIds);
            
            if (sortedError) {
              console.error('Error fetching sorted comments:', sortedError);
              // Just continue with regular query if this fails
            } else {
              // Manually sort the comments to match the order from the stored procedure
              const orderedComments = sortedCommentIds
                .map((id: string) => sortedComments?.find(comment => comment.comment_id === id))
                .filter(Boolean);
              
              console.log(`Returning ${orderedComments.length} comments sorted by reply count`);
              
              // Map all comments to the expected format
              const comments = orderedComments.map((comment: any) => {
                // Find the actual reply count from the stored procedure
                const replyCountData = commentsByReplyCount.find(
                  (c: any) => c.comment_id === comment.comment_id
                );
                
                // Map the database comment to the expected format
                const mappedComment: any = {
                  id: comment.comment_id,
                  authorDisplayName: comment.author_name,
                  authorProfileImageUrl: comment.author_profile_url || '/default-profile.png',
                  textDisplay: decodeHtmlEntities(comment.text || ''),
                  likeCount: comment.like_count || 0,
                  publishedAt: comment.published_at,
                  updatedAt: comment.updated_at || comment.published_at,
                  videoId: comment.video_id,
                  videoTitle: comment.videos?.title || comment.video_title || 'Unknown Video',
                  // Use the accurate reply count from the stored procedure
                  replyCount: replyCountData?.reply_count || 0,
                  dbReplyCount: comment.reply_count || 0,
                  replies: []
                };
                
                return mappedComment;
              });
              
              return NextResponse.json({
                comments,
                totalCount,
                page,
                perPage,
                totalPages: Math.ceil(totalCount / perPage),
                sortBy,
                sortDirection,
                usingStoredProcedure: true
              });
            }
          }
        }
      } catch (error) {
        console.error('Error in reply count sorting:', error);
        // Continue with regular query as fallback
      }
      
      // If we get here, use the regular sorting as fallback
      query = query
        .order('reply_count', { ascending: sortDirection === 'asc' })
        .order('published_at', { ascending: false });
    } else {
      // For other sort options, use the mapped column
      query = query
        .order(sortColumn, { ascending: sortDirection === 'asc' })
        .order('published_at', { ascending: false });
    }

    // Apply pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    
    query = query.range(from, to);

    // Execute the query
    const { data: comments, error: commentsError } = await query;
    
    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return NextResponse.json(
        { error: 'Error fetching comments' },
        { status: 500 }
      );
    }

    // Extract unique videoIds to fetch video titles
    const videoIds = new Set<string>();
    comments?.forEach((comment: any) => {
      if (comment.video_id) {
        videoIds.add(comment.video_id);
      }
    });

    // Format for frontend
    const formattedComments = await Promise.all((comments || []).map(async (comment: any) => {
      // Use the fix-comment-ui logic to get correct reply count
      let actualReplyCount = comment.reply_count || 0;
      let replies: CommentData[] = [];
      
      // Fetch the accurate reply count and potentially replies
      try {
        // Count the actual replies
        const { count: replyCount, error: countError } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', comment.comment_id);
        
        if (countError) {
          console.error(`Error counting replies for comment ${comment.comment_id}:`, countError);
        } else {
          actualReplyCount = replyCount || 0;
          
          // If includeReplies flag is true and there are replies, fetch them
          if (includeReplies && actualReplyCount > 0) {
            const { data: replyData, error: repliesError } = await supabase
              .from('comments')
              .select('*')
              .eq('parent_id', comment.comment_id)
              .order('published_at', { ascending: true });
            
            if (repliesError) {
              console.error(`Error fetching replies for comment ${comment.comment_id}:`, repliesError);
            } else if (replyData && replyData.length > 0) {
              replies = replyData.map((reply: DatabaseReply) => ({
                id: reply.comment_id,
                authorDisplayName: reply.author_name,
                authorProfileImageUrl: reply.author_profile_url || '/default-profile.png',
                textDisplay: decodeHtmlEntities(reply.text),
                likeCount: reply.like_count,
                publishedAt: reply.published_at,
                updatedAt: reply.updated_at || reply.published_at,
                videoId: reply.video_id,
                videoTitle: reply.video_title || 'Unknown Video',
                replyCount: 0, // Replies can't have replies on YouTube
                parentId: comment.comment_id,
                replies: [],
                isHeartedByCreator: false,
                isPinned: false
              }));
            }
          }
        }
      } catch (error) {
        console.error(`Error processing replies for comment ${comment.comment_id}:`, error);
        // Continue with the stored reply_count
      }
      
      return {
        id: comment.comment_id,
        authorDisplayName: comment.author_name,
        authorProfileImageUrl: comment.author_profile_url || '/default-profile.png',
        textDisplay: decodeHtmlEntities(comment.text),
        likeCount: comment.like_count,
        publishedAt: comment.published_at,
        updatedAt: comment.updated_at || comment.published_at,
        videoId: comment.video_id,
        videoTitle: comment.videos?.title || 'Unknown Video',
        replyCount: actualReplyCount,
        replies: replies,
        parentId: null, // Top-level comments don't have parents
        isHeartedByCreator: comment.is_hearted_by_creator || false,
        isPinned: comment.is_pinned || false
      };
    }));

    // Calculate total pages
    const totalPages = Math.ceil((totalCount || 0) / perPage);

    return NextResponse.json({
      success: true,
      comments: formattedComments,
      totalCount,
      page,
      totalPages,
      uniqueVideos: Array.from(videoIds).length
    });
  } catch (error) {
    console.error('Error in filtered-comments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 