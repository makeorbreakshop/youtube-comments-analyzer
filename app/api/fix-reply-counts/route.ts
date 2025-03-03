import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// For YOLO mode, we'll make this work without auth
export async function GET(request: NextRequest) {
  const fixAll = request.nextUrl.searchParams.get('fixAll') === 'true';
  const commentId = request.nextUrl.searchParams.get('commentId');
  
  try {
    let fixedComments = 0;
    let errors = 0;
    
    if (commentId) {
      // Fix a specific comment
      const result = await fixReplyCountForComment(commentId);
      if (result.success) {
        fixedComments = 1;
      } else {
        errors = 1;
      }
    } else if (fixAll) {
      // Get all comments that might have replies (more efficient than checking every comment)
      const { data: commentsWithReplies, error } = await supabase
        .from('comments')
        .select('comment_id')
        .is('parent_id', null)  // Only get parent comments
        .limit(300);  // Limit to avoid timeout
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      // Process in batches to avoid timeout
      const batchSize = 50;
      for (let i = 0; i < commentsWithReplies.length; i += batchSize) {
        const batch = commentsWithReplies.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (comment) => {
          const result = await fixReplyCountForComment(comment.comment_id);
          if (result.success) {
            fixedComments++;
          } else {
            errors++;
          }
        }));
      }
    } else {
      return NextResponse.json({ 
        error: 'Please provide either a commentId or fixAll=true parameter' 
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedComments} comments, encountered ${errors} errors`,
      fixedComments,
      errors
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
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
      return { success: false, error: countError instanceof Error ? countError.message : 'An unknown error occurred' };
    }
    
    // Update the comment's reply_count value
    const { error: updateError } = await supabase
      .from('comments')
      .update({ reply_count: count || 0 })
      .eq('comment_id', commentId);
    
    if (updateError) {
      console.error(`Error updating reply count for ${commentId}:`, updateError);
      return { success: false, error: updateError instanceof Error ? updateError.message : 'An unknown error occurred' };
    }
    
    return { success: true, updatedCount: count };
  } catch (error) {
    console.error(`Exception fixing reply count for ${commentId}:`, error);
    return { success: false, error: String(error) };
  }
} 