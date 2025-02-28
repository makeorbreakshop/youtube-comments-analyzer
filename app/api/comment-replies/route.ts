import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mapDbCommentToCommentData } from '@/lib/youtube';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const commentId = searchParams.get('commentId');
  
  console.log(`🔄 API: Fetching replies for comment ID: ${commentId}`);
  
  if (!commentId) {
    return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
  }
  
  try {
    // 1. Get this specific parent comment
    const { data: parentComment, error: parentError } = await supabase
      .from('comments')
      .select('*')
      .eq('comment_id', commentId)
      .single();
    
    if (parentError || !parentComment) {
      console.error('❌ Parent comment not found:', commentId);
      return NextResponse.json({ 
        error: 'Parent comment not found', 
        replies: [],
        count: 0
      }, { status: 404 });
    }
    
    console.log(`✅ Found parent comment: ${parentComment.comment_id}`);
    
    // 2. Fetch all replies for this comment
    const { data: replies, error: repliesError } = await supabase
      .from('comments')
      .select('*')
      .eq('parent_id', commentId)
      .order('published_at', { ascending: true });
    
    if (repliesError) {
      console.error('❌ Error fetching replies:', repliesError);
      return NextResponse.json({ error: repliesError.message }, { status: 500 });
    }
    
    console.log(`📊 Found ${replies?.length || 0} replies for comment ${commentId}`);
    
    // Log the first few replies to help debug
    if (replies && replies.length > 0) {
      replies.slice(0, 3).forEach((reply, i) => {
        console.log(`Reply ${i+1}: ID=${reply.comment_id}, Parent=${reply.parent_id}, Text=${reply.text.substring(0, 50)}...`);
      });
    }
    
    // Transform the comments to frontend format
    const formattedReplies = replies?.map(mapDbCommentToCommentData) || [];
    
    return NextResponse.json({ 
      replies: formattedReplies,
      count: formattedReplies.length
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 