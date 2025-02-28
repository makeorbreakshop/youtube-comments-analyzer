import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  // Check if we have any replies at all
  const { data: replies, count } = await supabase
    .from('comments')
    .select('*', { count: 'exact' })
    .not('parent_id', 'is', null)
    .limit(5);
  
  // Get a sample parent with its replies
  const { data: parentWithReplies } = await supabase
    .from('comments')
    .select('comment_id')
    .eq('parent_id', replies?.[0]?.parent_id)
    .limit(1);
  
  return NextResponse.json({
    repliesExist: count > 0,
    totalRepliesInDb: count,
    sampleReplies: replies,
    sampleParent: parentWithReplies?.[0] || null
  });
} 