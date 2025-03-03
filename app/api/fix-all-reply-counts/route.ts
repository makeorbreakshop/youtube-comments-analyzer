import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting comprehensive reply count fix...');
    
    // 1. Reset all reply counts to ensure we're starting fresh
    const { error: resetError } = await supabase
      .from('comments')
      .update({ reply_count: 0 })
      .is('parent_id', null); // Only reset top-level comments
    
    if (resetError) {
      console.error('Error resetting counts:', resetError);
      return NextResponse.json({ error: resetError instanceof Error ? resetError.message : 'An unknown error occurred' }, { status: 500 });
    }
    
    // 2. Get ALL replies (comments with a parent_id)
    const { data: allReplies, error: repliesError } = await supabase
      .from('comments')
      .select('parent_id')
      .not('parent_id', 'is', null);
    
    if (repliesError) {
      console.error('Error fetching replies:', repliesError);
      return NextResponse.json({ error: repliesError instanceof Error ? repliesError.message : 'An unknown error occurred' }, { status: 500 });
    }
    
    if (!allReplies || allReplies.length === 0) {
      return NextResponse.json({ 
        message: 'No replies found in the database',
        success: true,
        fixedComments: 0
      });
    }
    
    console.log(`Found ${allReplies.length} total replies`);
    
    // 3. Count replies for each parent comment
    const parentCounts = new Map();
    
    for (const reply of allReplies) {
      const parentId = reply.parent_id;
      if (!parentId) continue;
      
      const currentCount = parentCounts.get(parentId) || 0;
      parentCounts.set(parentId, currentCount + 1);
    }
    
    console.log(`Found ${parentCounts.size} unique parent comments with replies`);
    
    // 4. Update each parent comment with its reply count
    let successCount = 0;
    let errorCount = 0;
    
    // Process in batches to avoid timeouts
    const batchSize = 50;
    const parentIds = Array.from(parentCounts.keys());
    
    for (let i = 0; i < parentIds.length; i += batchSize) {
      const batch = parentIds.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(parentIds.length/batchSize)}`);
      
      // Update each parent in this batch
      await Promise.all(batch.map(async (parentId) => {
        const replyCount = parentCounts.get(parentId);
        
        const { error: updateError } = await supabase
          .from('comments')
          .update({ reply_count: replyCount })
          .eq('comment_id', parentId);
        
        if (updateError) {
          console.error(`Error updating parent ${parentId}:`, updateError);
          errorCount++;
        } else {
          successCount++;
        }
      }));
    }
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${successCount} comments, encountered ${errorCount} errors`,
      stats: {
        totalReplies: allReplies.length,
        uniqueParents: parentCounts.size,
        successfulUpdates: successCount,
        failedUpdates: errorCount
      }
    });
  } catch (error) {
    console.error('Error fixing all reply counts:', error);
    return NextResponse.json({ 
      error: 'Server error while fixing reply counts',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 