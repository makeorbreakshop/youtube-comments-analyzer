import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  console.log("🔧 STARTING DATABASE REPAIR FOR REPLY RELATIONSHIPS");
  
  // 1. Check for YouTube API reply structure - these might need fixing
  // Look for comments with IDs matching "UgzDXF*"
  const { data: potentialReplies, error: searchError } = await supabase
    .from('comments')
    .select('*')
    .like('comment_id', 'Ugzr%')
    .is('parent_id', null)
    .limit(100);
  
  if (searchError) {
    console.error("Error searching for potential replies:", searchError);
    return NextResponse.json({ error: searchError.message }, { status: 500 });
  }
  
  console.log(`Found ${potentialReplies?.length || 0} potential replies with null parent_id`);
  
  // For demonstration, let's find a few top-level comments to match with replies
  const { data: topLevelComments } = await supabase
    .from('comments')
    .select('comment_id, video_id')
    .is('parent_id', null)
    .not('comment_id', 'like', 'Ugzr%')
    .limit(10);
  
  // For testing purposes, let's set a parent for the first potential reply
  let updatedCount = 0;
  
  if (potentialReplies && potentialReplies.length > 0 && topLevelComments && topLevelComments.length > 0) {
    // Match by video ID
    for (const reply of potentialReplies.slice(0, 10)) {
      const matchingParent = topLevelComments.find(c => c.video_id === reply.video_id);
      
      if (matchingParent) {
        // Update this reply to point to a parent
        const { error: updateError } = await supabase
          .from('comments')
          .update({ parent_id: matchingParent.comment_id })
          .eq('id', reply.id);
        
        if (!updateError) {
          updatedCount++;
          console.log(`Set parent for reply ${reply.comment_id} to ${matchingParent.comment_id}`);
        }
      }
    }
  }
  
  return NextResponse.json({
    status: "Database repair initiated",
    potentialRepliesFound: potentialReplies?.length || 0,
    updatedCount,
    message: "This is just a sample repair. For a complete fix, you may need to re-import comments."
  });
} 