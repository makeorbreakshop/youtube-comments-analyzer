import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
  }
  
  try {
    // Check if the comment exists as a comment_id
    const { data: commentByCommentId, error: error1 } = await supabase
      .from('comments')
      .select('id, comment_id, parent_id, video_id, author_name, text')
      .eq('comment_id', id)
      .single();
      
    // Also check if any comments have this as parent_id
    const { data: replies, error: error2 } = await supabase
      .from('comments')
      .select('id, comment_id, parent_id')
      .eq('parent_id', id)
      .limit(5);
      
    return NextResponse.json({
      data: {
        commentFound: !!commentByCommentId,
        commentDetails: commentByCommentId ? {
          id: commentByCommentId.id,
          commentId: commentByCommentId.comment_id,
          parentId: commentByCommentId.parent_id,
          videoId: commentByCommentId.video_id,
          authorName: commentByCommentId.author_name,
          textPreview: commentByCommentId.text ? commentByCommentId.text.substring(0, 50) + '...' : ''
        } : null,
        repliesFound: replies ? replies.length > 0 : false,
        replyCount: replies ? replies.length : 0,
        sampleReplies: replies ? replies.map(r => ({
          id: r.id,
          commentId: r.comment_id,
          parentId: r.parent_id
        })) : []
      }
    });
  } catch (error) {
    console.error('Error checking comment:', error);
    return NextResponse.json({ error: 'Failed to check comment' }, { status: 500 });
  }
} 