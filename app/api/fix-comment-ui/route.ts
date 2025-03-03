import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// This endpoint will return the correct reply count for a comment
// without relying on the database's reply_count field
export async function GET(request: NextRequest) {
  const commentId = request.nextUrl.searchParams.get('commentId') || 'UgxoCmqup6-7hKidtul4AaABAg';
  
  try {
    // Get the comment
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('*')
      .eq('comment_id', commentId)
      .single();
    
    if (commentError) {
      return NextResponse.json({ error: commentError.message }, { status: 500 });
    }
    
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    // Count the actual replies
    const { count, error: countError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', commentId);
    
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    
    // Get the replies
    const { data: replies, error: repliesError } = await supabase
      .from('comments')
      .select('*')
      .eq('parent_id', commentId)
      .order('published_at', { ascending: true });
    
    if (repliesError) {
      return NextResponse.json({ error: repliesError.message }, { status: 500 });
    }
    
    // Create a fixed version of the comment with the correct reply count
    const fixedComment = {
      ...comment,
      reply_count: count || 0
    };
    
    return NextResponse.json({
      success: true,
      comment: fixedComment,
      replies: replies || [],
      replyCount: count || 0,
      dbReplyCount: comment.reply_count
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 