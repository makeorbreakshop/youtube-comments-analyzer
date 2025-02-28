import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  console.log("=== CHECKING DATABASE FOR REPLIES ===");
  
  // Check for any comments with parent_id that is not null
  const { data: replyCount, error: countError } = await supabase
    .from('comments')
    .select('count(*)', { count: 'exact' })
    .not('parent_id', 'is', null);
  
  // Get sample replies
  const { data: sampleReplies, error: replyError } = await supabase
    .from('comments')
    .select('*')
    .not('parent_id', 'is', null)
    .limit(5);
  
  if (countError || replyError) {
    console.error("Error checking replies:", countError || replyError);
  }
  
  // Check if we have parent/child relationships correctly set up
  const parentChildInfo = {
    hasReplies: (replyCount && replyCount.count > 0) || false,
    replyCount: replyCount ? replyCount.count : 0,
    sampleReplies: sampleReplies || [],
  };
  
  console.log("Database reply check:", parentChildInfo);
  
  return NextResponse.json(parentChildInfo);
} 