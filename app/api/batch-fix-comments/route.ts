import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// This endpoint will return the correct reply count and replies for multiple comments at once
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentIds } = body;
    
    if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing commentIds' },
        { status: 400 }
      );
    }
    
    // Fetch all comments
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*, videos(title)')
      .in('comment_id', commentIds);
    
    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return NextResponse.json(
        { success: false, error: commentsError.message },
        { status: 500 }
      );
    }
    
    // Fetch all replies for these comments in a single query
    const { data: allReplies, error: repliesError } = await supabase
      .from('comments')
      .select('*, videos(title)')
      .in('parent_id', commentIds);
    
    if (repliesError) {
      console.error('Error fetching replies:', repliesError);
      return NextResponse.json(
        { success: false, error: repliesError.message },
        { status: 500 }
      );
    }
    
    // Group replies by parent ID
    const repliesByParent: Record<string, any[]> = {};
    allReplies?.forEach(reply => {
      if (!repliesByParent[reply.parent_id]) {
        repliesByParent[reply.parent_id] = [];
      }
      repliesByParent[reply.parent_id].push(reply);
    });
    
    // For each comment that has replies, update the reply_count in the database
    let updatedCount = 0;
    const commentsToUpdate: { id: string, count: number }[] = [];
    
    // Build response object
    const result: Record<string, any> = {};
    
    // Process each comment - collect updates rather than doing them one by one
    for (const comment of comments || []) {
      const commentId = comment.comment_id;
      const replies = repliesByParent[commentId] || [];
      const replyCount = replies.length;
      
      // Track comments that need updating
      if (replyCount !== comment.reply_count) {
        commentsToUpdate.push({ id: commentId, count: replyCount });
      }
      
      // Format replies in a consistent way for the frontend
      const formattedReplies = replies.map(r => ({
        id: r.comment_id,
        authorDisplayName: r.author_name,
        authorProfileImageUrl: r.author_profile_image_url,
        textDisplay: r.text_display,
        publishedAt: r.published_at,
        likeCount: r.like_count || 0,
        parentId: r.parent_id,
        textOriginal: r.text_original,
        authorChannelId: r.author_channel_id,
        videoId: r.video_id
      }));
      
      result[commentId] = {
        replyCount,
        dbReplyCount: comment.reply_count || 0,
        replies: formattedReplies
      };
    }
    
    // Update all comments in a single batch if needed
    if (commentsToUpdate.length > 0) {
      // Only log total count of updates, not each individual one
      console.log(`Updating reply counts for ${commentsToUpdate.length} comments`);
      
      // Process updates in parallel - this is much more efficient
      await Promise.all(commentsToUpdate.map(async ({ id, count }) => {
        return supabase
          .from('comments')
          .update({ reply_count: count })
          .eq('comment_id', id);
      }));
      
      updatedCount = commentsToUpdate.length;
    }
    
    return NextResponse.json({
      success: true,
      updated: updatedCount > 0,
      updatedCount,
      comments: result
    });
  } catch (error) {
    console.error('Batch fix error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
} 