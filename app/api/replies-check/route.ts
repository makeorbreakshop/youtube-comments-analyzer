import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get a sample of replies
    const { data: sampleReplies } = await supabase
      .from('comments')
      .select('id, comment_id, parent_id')
      .not('parent_id', 'is', null)
      .limit(10);
    
    // Check if each parent exists
    const results = await Promise.all((sampleReplies || []).map(async (reply) => {
      const { data: parent, error } = await supabase
        .from('comments')
        .select('id, comment_id')
        .eq('comment_id', reply.parent_id)
        .single();
      
      return {
        replyId: reply.comment_id,
        parentId: reply.parent_id,
        parentFound: !!parent,
        parent
      };
    }));
    
    // Count how many parents are missing
    const { count: totalReplies } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .not('parent_id', 'is', null);
    
    // Check for randomly missing relationships
    let missingCount = 0;
    if (sampleReplies && sampleReplies.length > 0) {
      const randomReplies = await supabase
        .from('comments')
        .select('parent_id')
        .not('parent_id', 'is', null)
        .order('id')
        .limit(100);
      
      if (randomReplies.data) {
        const parentIds = randomReplies.data.map(r => r.parent_id);
        const { data: foundParents } = await supabase
          .from('comments')
          .select('comment_id')
          .in('comment_id', parentIds);
        
        missingCount = parentIds.length - (foundParents?.length || 0);
      }
    }
    
    return NextResponse.json({
      totalReplies,
      sampleChecks: results,
      estimatedMissingParents: missingCount,
      solution: "Run the repair-comments endpoint to fix the parent-child relationships"
    });
  } catch (error) {
    console.error('Error in diagnostic:', error);
    return NextResponse.json({ error: 'Diagnostic failed' }, { status: 500 });
  }
} 