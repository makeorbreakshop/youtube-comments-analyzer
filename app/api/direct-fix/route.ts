import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Starting direct reply count fix...');
    
    // 1. Reset all reply counts
    const { error: resetError } = await supabase
      .from('comments')
      .update({ reply_count: 0 })
      .is('parent_id', null);
    
    if (resetError) {
      console.error('Error resetting counts:', resetError);
      throw resetError;
    }
    
    // 2. Get ALL replies (no limit)
    const { data: allReplies, error: repliesError } = await supabase
      .from('comments')
      .select('parent_id')
      .not('parent_id', 'is', null);
    
    if (repliesError) throw repliesError;
    if (!allReplies) throw new Error('No replies found');
    
    console.log(`Processing all ${allReplies.length} replies...`);
    
    // 3. Count the replies for each parent
    const parentIdCountMap = new Map();
    
    for (const reply of allReplies) {
      const parentId = reply.parent_id;
      const currentCount = parentIdCountMap.get(parentId) || 0;
      parentIdCountMap.set(parentId, currentCount + 1);
    }
    
    console.log(`Found ${parentIdCountMap.size} unique parent comments`);
    
    // 4. Update each parent comment individually (avoid upsert issues)
    let successCount = 0;
    let errorCount = 0;
    let batchNumber = 0;
    const batchSize = 100; // Process in smaller batches
    const parentIds = Array.from(parentIdCountMap.keys());
    
    for (let i = 0; i < parentIds.length; i += batchSize) {
      batchNumber++;
      const batch = parentIds.slice(i, i + batchSize);
      console.log(`Processing batch ${batchNumber}: ${batch.length} parents`);
      
      // Update each parent in this batch
      for (const parentId of batch) {
        const replyCount = parentIdCountMap.get(parentId);
        
        // Use direct update instead of upsert
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
      }
    }
    
    // 5. Get top comments with replies
    const { data: topComments } = await supabase
      .from('comments')
      .select('comment_id, text, reply_count, author_name')
      .gt('reply_count', 0)
      .order('reply_count', { ascending: false })
      .limit(10);
    
    return NextResponse.json({
      success: true,
      stats: {
        totalReplies: allReplies.length,
        uniqueParentIds: parentIdCountMap.size,
        successfulUpdates: successCount,
        failedUpdates: errorCount
      },
      topComments
    });
  } catch (error) {
    console.error('Error in direct fix:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 