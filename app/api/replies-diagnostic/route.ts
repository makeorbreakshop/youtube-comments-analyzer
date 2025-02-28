import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Check how many comments have parent_id set (should be replies)
    const { count: replyCount, error: replyError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .not('parent_id', 'is', null);
    
    // Check if we have any parent comments with replies
    const { data: sampleReplies, error: sampleError } = await supabase
      .from('comments')
      .select('parent_id, text')
      .not('parent_id', 'is', null)
      .limit(5);
    
    // Get a sample parent with its replies
    let parentWithReplies = null;
    let replies = [];
    
    if (sampleReplies && sampleReplies.length > 0) {
      const sampleParentId = sampleReplies[0].parent_id;
      
      const { data: parent } = await supabase
        .from('comments')
        .select('*')
        .eq('comment_id', sampleParentId)
        .single();
      
      const { data: relatedReplies } = await supabase
        .from('comments')
        .select('*')
        .eq('parent_id', sampleParentId)
        .limit(10);
      
      parentWithReplies = parent;
      replies = relatedReplies;
    }
    
    return NextResponse.json({
      totalComments: await supabase.from('comments').select('*', { count: 'exact', head: true }).then(r => r.count),
      replyCount,
      sampleReplies,
      diagnosticResult: {
        hasReplies: replyCount > 0,
        sampleParent: parentWithReplies,
        sampleReplies: replies
      }
    });
  } catch (error) {
    console.error('Error in diagnostic:', error);
    return NextResponse.json({ error: 'Diagnostic failed' }, { status: 500 });
  }
} 