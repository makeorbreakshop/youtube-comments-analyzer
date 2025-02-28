import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CommentData } from '@/lib/types';
import { decodeHtmlEntities } from '@/lib/utils';

// Add this function directly in the file if it's not exported from lib/youtube
function mapDbCommentToCommentData(dbComment: any): CommentData {
  return {
    id: dbComment.comment_id,
    authorDisplayName: dbComment.author_name,
    authorProfileImageUrl: dbComment.author_profile_url,
    textDisplay: decodeHtmlEntities(dbComment.text),
    likeCount: dbComment.like_count || 0,
    publishedAt: dbComment.published_at,
    updatedAt: dbComment.updated_at || dbComment.published_at,
    videoId: dbComment.video_id,
    videoTitle: dbComment.video_title || '',
    replyCount: 0,
    isHeartedByCreator: false,
    isPinned: false,
    replies: []
  };
}

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
  
  return NextResponse.json({
    comment,
    repliesFound: replies?.length || 0,
    sampleReplies: replies?.slice(0, 3) || [],
    sampleParentChildRelationships: allReplies?.slice(0, 5) || []
  });
} 