import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  console.log("=== CHECKING DATABASE FOR REPLIES ===");
  
  // Check for any comments with parent_id that is not null
  const { data: replyCountData, error: countError } = await supabase
    .from('comments')
    .select('count(*)', { count: 'exact' });
    
  // Get the count as a number
  const replyCount = replyCountData && typeof replyCountData === 'object' && 'count' in replyCountData 
    ? (replyCountData.count as number) 
    : 0;
  
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
    hasReplies: replyCount > 0,
    replyCount: replyCount,
    sampleReplies: sampleReplies || [],
  };
  
  console.log("Database reply check:", parentChildInfo);
  
  return NextResponse.json(parentChildInfo);
} 