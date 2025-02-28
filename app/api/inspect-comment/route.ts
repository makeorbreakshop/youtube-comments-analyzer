import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const commentId = searchParams.get('commentId');
  
  if (!commentId) {
    return NextResponse.json({ error: 'Comment ID required' }, { status: 400 });
  }
  
  console.log(`Inspecting comment: ${commentId}`);
  
  try {
    // Get the comment
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('*')
      .eq('comment_id', commentId)
      .single();
    
    if (commentError) {
      console.error("Error fetching comment:", commentError);
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    // Look for replies to this comment
    const { data: replies, error: repliesError } = await supabase
      .from('comments')
      .select('*')
      .eq('parent_id', commentId);
    
    // Check for any replies in the database at all
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact' })
      .not('parent_id', 'is', null)
      .limit(1)
      .single();
    
    return NextResponse.json({
      comment,
      repliesFound: replies?.length || 0,
      replies: replies || [],
      anyRepliesInDb: count > 0
    });
  } catch (error) {
    console.error("Error inspecting comment:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 