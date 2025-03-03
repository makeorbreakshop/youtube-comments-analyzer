import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const runtime = 'nodejs';
export const preferredRegion = 'auto';
export const maxDuration = 60; // Updated to 60 seconds (maximum allowed in Hobby plan)

export async function GET() {
  try {
    console.log('Starting JavaScript-based reply count fix...');
    
    // 1. Reset all reply counts for top-level comments only
    const { error: resetError } = await supabase
      .from('comments')
      .update({ reply_count: 0 })
      .is('parent_id', null);
      
    if (resetError) {
      console.error('Error resetting reply counts:', resetError);
      return NextResponse.json({
        success: false,
        error: 'Failed to reset reply counts: ' + resetError.message
      }, { status: 500 });
    }
    
    // 2. Get all replies - use pagination to handle large datasets
    const pageSize = 200;
    let allReplies: any[] = [];
    let page = 0;
    let hasMoreData = true;
    
    while (hasMoreData) {
      const { data: replies, error: repliesError } = await supabase
        .from('comments')
        .select('comment_id, parent_id, video_id')
        .not('parent_id', 'is', null)
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (repliesError) {
        console.error('Error fetching replies batch:', repliesError);
        return NextResponse.json({
          success: false, 
          error: 'Failed to fetch replies: ' + repliesError.message
        }, { status: 500 });
      }
      
      if (replies && replies.length > 0) {
        allReplies = [...allReplies, ...replies];
        page++;
      } else {
        hasMoreData = false;
      }
      
      // Safety check - don't process more than 1000 replies to avoid timeouts
      if (allReplies.length >= 1000) {
        console.log('Reached maximum replies limit (1000), stopping pagination');
        hasMoreData = false;
      }
    }
    
    if (allReplies.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No replies found, nothing to update'
      });
    }
    
    console.log(`Processing ${allReplies.length} replies...`);
    
    // 3. Process parent IDs and build a map of parent ID to count
    const parentIdMap = new Map<string, number>();
    const nonDotParentIds = new Set<string>();
    const dotParentIds = new Set<string>();
    
    // Analyze the format and build counts
    for (const reply of allReplies) {
      // Skip any replies with missing data
      if (!reply.parent_id || !reply.video_id) {
        console.log('Skipping reply with missing data:', reply.comment_id);
        continue;
      }
      
      let parentId = reply.parent_id;
      
      // Track different formats for debugging
      if (parentId.includes('.')) {
        dotParentIds.add(parentId);
        parentId = parentId.split('.')[0]; // Use the part before the dot
      } else {
        nonDotParentIds.add(parentId);
      }
      
      // Count replies for each parent
      const currentCount = parentIdMap.get(parentId) || 0;
      parentIdMap.set(parentId, currentCount + 1);
    }
    
    console.log(`Found ${dotParentIds.size} parent IDs with dots`);
    console.log(`Found ${nonDotParentIds.size} parent IDs without dots`);
    
    // 4. Update reply counts for all parent comments - in batches
    let updatedCount = 0;
    let notFoundCount = 0;
    const sampleNotFound: string[] = [];
    
    // Convert parent entries to array and process in batches of 50
    const parentEntries = Array.from(parentIdMap.entries());
    const batchSize = 50;
    
    for (let i = 0; i < parentEntries.length; i += batchSize) {
      const batch = parentEntries.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async ([parentId, count]) => {
          // Check if this parent exists
          const { data: parentExists, error: checkError } = await supabase
            .from('comments')
            .select('id')
            .eq('comment_id', parentId)
            .maybeSingle();
          
          if (checkError) {
            console.error(`Error checking parent ${parentId}:`, checkError);
            return { success: false, parentId };
          }
          
          if (parentExists) {
            // Update the parent's reply count
            const { error: updateError } = await supabase
              .from('comments')
              .update({ reply_count: count })
              .eq('comment_id', parentId);
            
            return { 
              success: !updateError, 
              parentId,
              error: updateError ? updateError.message : null
            };
          } else {
            if (sampleNotFound.length < 5) {
              sampleNotFound.push(parentId);
            }
            return { success: false, parentId, notFound: true };
          }
        })
      );
      
      // Count results
      batchResults.forEach(result => {
        if (result.success) {
          updatedCount++;
        } else if (result.notFound) {
          notFoundCount++;
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      stats: {
        totalReplies: allReplies.length,
        uniqueParentIds: parentIdMap.size,
        parentsUpdated: updatedCount,
        parentsNotFound: notFoundCount,
        sampleMissingParents: sampleNotFound
      },
      formats: {
        withDots: dotParentIds.size,
        withoutDots: nonDotParentIds.size,
        dotExamples: Array.from(dotParentIds).slice(0, 3),
        noDotExamples: Array.from(nonDotParentIds).slice(0, 3)
      }
    });
  } catch (error) {
    console.error('Error in JavaScript fix:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }, { status: 500 });
  }
} 