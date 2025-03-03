import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Starting complete reply count fix...');
    
    // 1. Reset all reply counts
    await supabase
      .from('comments')
      .update({ reply_count: 0 })
      .is('parent_id', null);
    
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
    
    // 4. Update all parent comments in a single batch
    const updates = [];
    for (const [parentId, count] of parentIdCountMap.entries()) {
      updates.push({ comment_id: parentId, reply_count: count });
    }
    
    // Split into batches of 1000 to avoid limits
    const batchSize = 1000;
    let updatedCount = 0;
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      // For each batch, update using upsert
      const { error, count } = await supabase
        .from('comments')
        .upsert(
          batch.map(update => ({ 
            comment_id: update.comment_id, 
            reply_count: update.reply_count 
          })),
          { 
            onConflict: 'comment_id',
            ignoreDuplicates: false
          }
        );
      
      if (!error) {
        updatedCount += batch.length;
        console.log(`Updated batch ${i/batchSize + 1}: ${batch.length} comments`);
      } else {
        console.error(`Error updating batch ${i/batchSize + 1}:`, error);
      }
    }
    
    // 5. Get top 10 comments with the most replies
    const { data: topComments } = await supabase
      .from('comments')
      .select('comment_id, text, reply_count')
      .gt('reply_count', 0)
      .order('reply_count', { ascending: false })
      .limit(10);
    
    return NextResponse.json({
      success: true,
      stats: {
        totalReplies: allReplies.length,
        uniqueParentIds: parentIdCountMap.size,
        parentsUpdated: updatedCount
      },
      topComments
    });
  } catch (error) {
    console.error('Error in fix:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }, { status: 500 });
  }
} 