import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CommentData } from '@/lib/types';
import { decodeHtmlEntities } from '@/lib/utils';
import { mapDbCommentToCommentData } from '@/lib/youtube';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const commentId = searchParams.get('commentId');
  
  // Just for debugging - get all comments with parent IDs
  const { data: allReplies } = await supabase
    .from('comments')
    .select('*')
    .not('parent_id', 'is', null)
    .limit(10);
  
  // Get detailed info about this specific comment
  const { data: comment } = await supabase
    .from('comments')
    .select('*')
    .eq('comment_id', commentId)
    .single();
  
  // Get replies for this comment
  const { data: replies } = await supabase
    .from('comments')
    .select('*')
    .eq('parent_id', commentId);
  
  // Convert database comments to CommentData format
  const formattedComment = comment ? mapDbCommentToCommentData(comment) : null;
  const formattedReplies = replies ? replies.map(mapDbCommentToCommentData) : [];
  
  return NextResponse.json({
    comment: formattedComment,
    repliesFound: replies?.length || 0,
    sampleReplies: formattedReplies.slice(0, 3),
    sampleParentChildRelationships: allReplies?.slice(0, 5) || []
  });
} 