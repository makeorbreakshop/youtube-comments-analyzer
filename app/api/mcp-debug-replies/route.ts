import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mapDbCommentToCommentData } from '@/lib/youtube';

/**
 * Comprehensive debugging endpoint for threaded replies
 * This endpoint will:
 * 1. Find comments with replies
 * 2. Check the structure of replies
 * 3. Verify reply counts
 * 4. Test nested replies (replies to replies)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const commentId = searchParams.get('commentId');
  
  try {
    // Run a fix operation first
    if (commentId) {
      // Fix this specific comment's reply count
      await fixReplyCountForComment(commentId);
      
      // Fix the reply counts for any direct replies this comment has
      const { data: directReplies } = await supabase
        .from('comments')
        .select('comment_id')
        .eq('parent_id', commentId);
        
      if (directReplies && directReplies.length > 0) {
        await Promise.all(directReplies.map(reply => fixReplyCountForComment(reply.comment_id)));
      }
    }
    
    // 1. Get overall statistics
    const { count: totalComments } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true });
      
    const { count: totalReplies } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .not('parent_id', 'is', null);
    
    // 2. Find comments with the most replies
    const { data: topComments } = await supabase
      .from('comments')
      .select('*, reply_count')
      .is('parent_id', null)
      .order('reply_count', { ascending: false })
      .limit(5);
    
    // 3. If a specific comment ID was provided, analyze it
    let commentAnalysis = null;
    let repliesAnalysis = [];
    let nestedRepliesAnalysis = [];
    
    if (commentId) {
      // Get the specific comment AFTER fixing it
      const { data: comment } = await supabase
        .from('comments')
        .select('*')
        .eq('comment_id', commentId)
        .single();
      
      if (comment) {
        // Create a mapped version with the correct reply count
        const mappedData = {
          id: comment.comment_id,
          authorDisplayName: comment.author_name || 'Unknown User',
          authorProfileImageUrl: comment.author_profile_url || 'https://www.gravatar.com/avatar/?d=mp',
          textDisplay: comment.text || '',
          likeCount: comment.like_count || 0,
          publishedAt: comment.published_at,
          updatedAt: comment.updated_at || comment.published_at,
          videoId: comment.video_id,
          videoTitle: comment.video_title || '',
          replyCount: comment.reply_count || 0,
          isHeartedByCreator: false,
          isPinned: false,
          parentId: comment.parent_id,
          replies: []
        };
        
        commentAnalysis = {
          ...comment,
          mappedData
        };
        
        // Get its direct replies
        const { data: replies } = await supabase
          .from('comments')
          .select('*')
          .eq('parent_id', commentId);
        
        if (replies && replies.length > 0) {
          // Map the replies
          repliesAnalysis = replies.map(reply => ({
            ...reply,
            mappedData: mapDbCommentToCommentData(reply)
          }));
          
          // Check for nested replies (replies to replies)
          for (const reply of replies) {
            const { data: nestedReplies } = await supabase
              .from('comments')
              .select('*')
              .eq('parent_id', reply.comment_id);
            
            if (nestedReplies && nestedReplies.length > 0) {
              nestedRepliesAnalysis.push({
                parentReplyId: reply.comment_id,
                nestedReplies: nestedReplies.map(nestedReply => ({
                  ...nestedReply,
                  mappedData: mapDbCommentToCommentData(nestedReply)
                }))
              });
            }
          }
        }
      }
    }
    
    // 4. Find a sample of nested replies (replies to replies)
    const { data: sampleNestedReplies } = await supabase
      .from('comments')
      .select('parent_id')
      .not('parent_id', 'is', null)
      .limit(100);
    
    let nestedReplyExample = null;
    
    if (sampleNestedReplies && sampleNestedReplies.length > 0) {
      // Get unique parent IDs
      const parentIds = [...new Set(sampleNestedReplies.map(r => r.parent_id))];
      
      // Check if any of these parents are themselves replies
      const { data: potentialNestedParents } = await supabase
        .from('comments')
        .select('*, parent_id')
        .in('comment_id', parentIds)
        .not('parent_id', 'is', null)
        .limit(1);
      
      if (potentialNestedParents && potentialNestedParents.length > 0) {
        const nestedParent = potentialNestedParents[0];
        
        // Get the original parent
        const { data: originalParent } = await supabase
          .from('comments')
          .select('*')
          .eq('comment_id', nestedParent.parent_id)
          .single();
        
        // Get replies to the nested parent
        const { data: repliesOfNested } = await supabase
          .from('comments')
          .select('*')
          .eq('parent_id', nestedParent.comment_id);
        
        nestedReplyExample = {
          originalParent: originalParent ? {
            ...originalParent,
            mappedData: mapDbCommentToCommentData(originalParent)
          } : null,
          nestedParent: {
            ...nestedParent,
            mappedData: mapDbCommentToCommentData(nestedParent)
          },
          repliesOfNested: repliesOfNested ? repliesOfNested.map(r => ({
            ...r,
            mappedData: mapDbCommentToCommentData(r)
          })) : []
        };
      }
    }
    
    // 5. Return comprehensive debug information
    return NextResponse.json({
      statistics: {
        totalComments: totalComments || 0,
        totalReplies: totalReplies || 0,
        percentageReplies: (totalComments && totalReplies) ? Math.round((totalReplies / totalComments) * 100) : 0
      },
      topComments: topComments?.map(c => ({
        id: c.comment_id,
        replyCount: c.reply_count || 0,
        text: c.text.substring(0, 50) + (c.text.length > 50 ? '...' : '')
      })),
      specificComment: commentId ? {
        comment: commentAnalysis,
        directReplies: {
          count: repliesAnalysis.length,
          replies: repliesAnalysis
        },
        nestedReplies: {
          count: nestedRepliesAnalysis.length,
          examples: nestedRepliesAnalysis
        }
      } : null,
      nestedReplyExample,
      recommendations: [
        "Check if reply_count values match actual reply counts",
        "Verify that the parent_id field is correctly set for all replies",
        "Ensure the CommentItem component correctly displays nested replies",
        "Check if the mapDbCommentToCommentData function preserves reply information"
      ]
    });
  } catch (error) {
    console.error('Error in MCP debug endpoint:', error);
    return NextResponse.json({ error: 'Debug analysis failed' }, { status: 500 });
  }
}

async function fixReplyCountForComment(commentId: string) {
  try {
    // Count how many replies this comment has
    const { count, error: countError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', commentId);
    
    if (countError) {
      console.error(`Error counting replies for ${commentId}:`, countError);
      return;
    }
    
    // Update the comment's reply_count value
    const { error: updateError } = await supabase
      .from('comments')
      .update({ reply_count: count || 0 })
      .eq('comment_id', commentId);
    
    if (updateError) {
      console.error(`Error updating reply count for ${commentId}:`, updateError);
    }
  } catch (error) {
    console.error(`Exception fixing reply count for ${commentId}:`, error);
  }
} 