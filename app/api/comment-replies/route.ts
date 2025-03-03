import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mapDbCommentToCommentData } from '@/lib/youtube';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const commentId = searchParams.get('commentId');

  console.log(`🔄 API: Fetching replies for comment ID: ${commentId}`);
  
  if (!commentId) {
    return NextResponse.json({ error: 'Missing comment ID' }, { status: 400 });
  }

  try {
    // Get the parent comment first to verify it exists
    const { data: parentComment, error: parentError } = await supabase
      .from('comments')
      .select('*')
      .eq('comment_id', commentId)
      .single();
    
    if (parentError) {
      return NextResponse.json({ error: parentError.message }, { status: 500 });
    }
    
    if (!parentComment) {
      return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
    }
    
    // Get all replies for this comment
    const { data: replies, error: repliesError } = await supabase
      .from('comments')
      .select('*')
      .eq('parent_id', commentId)
      .order('published_at', { ascending: false });
    
    if (repliesError) {
      return NextResponse.json({ error: repliesError.message }, { status: 500 });
    }
    
    console.log(`Found ${replies?.length || 0} replies for comment ${commentId}`);

    // Get the actual count directly from the database
    const { count, error: countError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', commentId);
    
    if (countError) {
      console.error('Error counting replies:', countError);
    }

    // Map all replies to the expected format
    const mappedReplies = (replies || []).map(reply => mapDbCommentToCommentData(reply));
    
    // Respond with the replies and the count
    return NextResponse.json({
      replies: mappedReplies,
      replyCount: count || mappedReplies.length,
    });
  } catch (error) {
    console.error('Error fetching comment replies:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 