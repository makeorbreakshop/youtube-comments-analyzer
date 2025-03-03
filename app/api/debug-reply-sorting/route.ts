import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const runtime = 'nodejs';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get('channelId') || 'UCjWkNxpp3UHdEavpM_19--Q'; // Default to provided channel
    
    console.log(`DEBUG: Checking all comments with replies for channel ${channelId}`);
    
    // 1. First get the internal UUID for this channel
    const { data: channels, error: channelError } = await supabase
      .from('channels')
      .select('id, channel_id, title')
      .eq('channel_id', channelId);

    if (channelError || !channels || channels.length === 0) {
      console.error('Channel lookup error:', channelError || 'Channel not found');
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const internalChannelId = channels[0].id;
    console.log(`DEBUG: Internal channel ID: ${internalChannelId}`);
    
    // 2. Direct query to find ALL comments that have replies
    console.log(`DEBUG: Finding all comments with replies...`);
    const { data: commentsWithReplies, error: repliesError } = await supabase.rpc(
      'get_comments_with_reply_counts',
      { channel_id_param: internalChannelId }
    );
    
    if (repliesError) {
      console.error('Error using stored procedure:', repliesError);
      
      // Fall back to manual query
      console.log('DEBUG: Falling back to manual query for replies');
      const { data: replies } = await supabase
        .from('comments')
        .select('parent_id, id')
        .eq('channel_id', internalChannelId)
        .not('parent_id', 'is', null);
        
      // Count replies by parent
      const replyCounts: Record<string, number> = {};
      replies?.forEach(reply => {
        if (!replyCounts[reply.parent_id]) {
          replyCounts[reply.parent_id] = 0;
        }
        replyCounts[reply.parent_id]++;
      });
      
      // Convert to array for consistent format
      const manualCounts = Object.entries(replyCounts).map(([commentId, count]) => ({
        comment_id: commentId,
        reply_count: count
      }));
      
      console.log(`DEBUG: Found ${manualCounts.length} comments with replies`);
      
      // Sort by reply count descending
      manualCounts.sort((a, b) => b.reply_count - a.reply_count);
      
      // Fetch the actual comments for the top 20
      const topCommentIds = manualCounts.slice(0, 20).map(c => c.comment_id);
      
      console.log(`DEBUG: Top 20 comment IDs with most replies:`, topCommentIds);
      
      const { data: topComments } = await supabase
        .from('comments')
        .select('*, videos(title)')
        .in('comment_id', topCommentIds);
        
      // Combine the comment data with the reply counts
      const result = topComments?.map(comment => {
        const count = manualCounts.find(c => c.comment_id === comment.comment_id);
        return {
          ...comment,
          manual_reply_count: count?.reply_count || 0,
          stored_reply_count: comment.reply_count || 0
        };
      }) || [];
      
      // Sort by manual reply count descending
      result.sort((a, b) => b.manual_reply_count - a.manual_reply_count);
      
      return NextResponse.json({
        success: true,
        message: 'Manual fallback query used',
        comments: result,
        commentCount: result.length,
        totalCommentsWithReplies: manualCounts.length
      });
    }
    
    // We have results from the stored procedure
    console.log(`DEBUG: Found ${commentsWithReplies.length} comments with replies via stored procedure`);
    
    // Get the top 20 comments by reply count
    const topCommentsByReplies = commentsWithReplies
      .sort((a: any, b: any) => b.reply_count - a.reply_count)
      .slice(0, 20);
      
    console.log(`DEBUG: Top 20 comment IDs by reply count:`, 
      topCommentsByReplies.map((c: any) => ({ id: c.comment_id, count: c.reply_count })));
    
    // Fetch the actual comments for these IDs
    const { data: topComments } = await supabase
      .from('comments')
      .select('*, videos(title)')
      .in('comment_id', topCommentsByReplies.map((c: any) => c.comment_id));
      
    // Combine the comment data with the reply counts
    const result = topComments?.map(comment => {
      const countData = topCommentsByReplies.find((c: any) => c.comment_id === comment.comment_id);
      return {
        ...comment,
        stored_procedure_reply_count: countData?.reply_count || 0,
        stored_reply_count: comment.reply_count || 0
      };
    }) || [];
    
    // Sort by the stored procedure reply count
    result.sort((a, b) => b.stored_procedure_reply_count - a.stored_procedure_reply_count);
    
    // 3. Now compare with the database's stored reply_count to check for discrepancies
    const mismatchCount = result.filter(comment => 
      comment.stored_procedure_reply_count !== comment.stored_reply_count
    ).length;
    
    return NextResponse.json({
      success: true,
      message: 'Found comments with replies via stored procedure',
      comments: result,
      commentCount: result.length,
      totalCommentsWithReplies: commentsWithReplies.length,
      mismatchCount
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 