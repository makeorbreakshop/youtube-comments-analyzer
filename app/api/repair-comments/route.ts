import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get all replies with their parent IDs
    const { data: replies, error } = await supabase
      .from('comments')
      .select('id, comment_id, parent_id')
      .not('parent_id', 'is', null);
    
    if (error) {
      throw error;
    }
    
    // Get all top-level comments to use as a lookup table
    const { data: parents } = await supabase
      .from('comments')
      .select('id, comment_id')
      .is('parent_id', null);
    
    const parentMap = new Map();
    parents?.forEach(p => parentMap.set(p.comment_id, p.id));
    
    // Count how many replies have parents in our database
    let repliesWithParents = 0;
    let repliesWithoutParents = 0;
    
    // Build the reply count map
    const replyCountMap = new Map();
    
    for (const reply of replies || []) {
      const parentId = reply.parent_id;
      
      if (parentMap.has(parentId)) {
        repliesWithParents++;
        
        // Increment the reply count for this parent
        const currentCount = replyCountMap.get(parentId) || 0;
        replyCountMap.set(parentId, currentCount + 1);
      } else {
        repliesWithoutParents++;
      }
    }
    
    // Update the reply counts for each parent
    let updatedParents = 0;
    for (const [parentId, replyCount] of replyCountMap.entries()) {
      const { error } = await supabase
        .from('comments')
        .update({ reply_count: replyCount })
        .eq('comment_id', parentId);
      
      if (!error) {
        updatedParents++;
      }
    }
    
    return NextResponse.json({
      success: true,
      repliesProcessed: (replies || []).length,
      repliesWithParents,
      repliesWithoutParents,
      parentsUpdated: updatedParents
    });
  } catch (error) {
    console.error('Error repairing comments:', error);
    return NextResponse.json({ error: 'Repair failed' }, { status: 500 });
  }
} 