import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Batch size to avoid timeouts
const BATCH_SIZE = 1000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const page = parseInt(params.get('page') || '1');
  const resetProgress = params.get('reset') === 'true';
  
  try {
    console.log(`Starting repair process (batch ${page})...`);
    
    // Reset all counts if requested
    if (resetProgress && page === 1) {
      await supabase
        .from('comments')
        .update({ reply_count: 0 })
        .is('parent_id', null);
      
      console.log('Reset all reply counts to 0');
    }
    
    // Get total reply count
    const { count: totalReplies } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .not('parent_id', 'is', null);
    
    // Get current batch of replies
    const from = (page - 1) * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;
    
    console.log(`Processing replies ${from+1} to ${to+1} of ${totalReplies}`);
    
    const { data: replies, error } = await supabase
      .from('comments')
      .select('id, comment_id, parent_id')
      .not('parent_id', 'is', null)
      .range(from, to);
    
    if (error) {
      throw error;
    }
    
    // If no replies to process in this range, we're done
    if (!replies || replies.length === 0) {
      return NextResponse.json({
        success: true,
        complete: true,
        message: 'All replies processed',
        totalReplies,
        processedBatches: page - 1
      });
    }
    
    // Get all unique parent IDs from this batch
    const parentIds = [...new Set(replies.map(r => r.parent_id))];
    
    // Get all matching parents in one query
    const { data: parents } = await supabase
      .from('comments')
      .select('comment_id')
      .in('comment_id', parentIds);
    
    // Create a lookup set for faster parent existence checking
    const parentIdSet = new Set(parents?.map(p => p.comment_id) || []);
    
    // Count replies per parent
    const replyCountMap = new Map();
    let repliesWithParents = 0;
    let repliesWithoutParents = 0;
    
    // Process each reply
    for (const reply of replies) {
      const parentId = reply.parent_id;
      
      if (parentIdSet.has(parentId)) {
        repliesWithParents++;
        const currentCount = replyCountMap.get(parentId) || 0;
        replyCountMap.set(parentId, currentCount + 1);
      } else {
        repliesWithoutParents++;
      }
    }
    
    // Apply updates in bulk where possible
    const updatePromises = [];
    for (const [parentId, count] of replyCountMap.entries()) {
      updatePromises.push(
        supabase
          .from('comments')
          .update({ reply_count: count })
          .eq('comment_id', parentId)
      );
    }
    
    // Execute all updates
    const updateResults = await Promise.allSettled(updatePromises);
    const successfulUpdates = updateResults.filter(r => r.status === 'fulfilled').length;
    
    // Calculate progress
    const processedSoFar = page * BATCH_SIZE;
    const percentComplete = Math.min(100, Math.round((processedSoFar / (totalReplies ?? 1)) * 100));
    const hasMoreBatches = processedSoFar < (totalReplies ?? 0);
    
    // Return detailed status
    return NextResponse.json({
      success: true,
      complete: !hasMoreBatches,
      batchResults: {
        batchNumber: page,
        repliesProcessed: replies.length,
        repliesWithParents,
        repliesWithoutParents,
        parentsUpdated: successfulUpdates
      },
      progress: {
        processedSoFar,
        totalReplies,
        percentComplete,
        remainingReplies: (totalReplies ?? 0) - processedSoFar
      },
      nextBatch: hasMoreBatches ? `/api/repair-all-comments?page=${page + 1}` : null
    });
  } catch (error) {
    console.error('Error in repair process:', error);
    return NextResponse.json({
      success: false,
      error: 'Repair process failed',
      details: error instanceof Error ? error.message : String(error),
      page
    }, { status: 500 });
  }
} 