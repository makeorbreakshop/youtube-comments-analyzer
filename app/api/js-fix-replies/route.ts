import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Starting JavaScript-based reply count fix...');
    
    // 1. Reset all reply counts
    await supabase
      .from('comments')
      .update({ reply_count: 0 })
      .is('parent_id', null);
    
    // 2. Get all replies
    const { data: replies, error: repliesError } = await supabase
      .from('comments')
      .select('comment_id, parent_id')
      .not('parent_id', 'is', null);
    
    if (repliesError) throw repliesError;
    if (!replies) throw new Error('No replies found');
    
    console.log(`Processing ${replies.length} replies...`);
    
    // 3. Process parent IDs and build a map of parent ID to count
    const parentIdMap = new Map();
    const nonDotParentIds = new Set();
    const dotParentIds = new Set();
    
    // Analyze the format and build counts
    for (const reply of replies) {
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
    
    // 4. Update reply counts for all parent comments
    let updatedCount = 0;
    let notFoundCount = 0;
    let sampleNotFound = [];
    
    for (const [parentId, count] of parentIdMap.entries()) {
      // Check if this parent exists
      const { data: parentExists, error: checkError } = await supabase
        .from('comments')
        .select('id')
        .eq('comment_id', parentId)
        .maybeSingle();
      
      if (checkError) {
        console.error(`Error checking parent ${parentId}:`, checkError);
        continue;
      }
      
      if (parentExists) {
        // Update the parent's reply count
        const { error: updateError } = await supabase
          .from('comments')
          .update({ reply_count: count })
          .eq('comment_id', parentId);
        
        if (!updateError) {
          updatedCount++;
        }
      } else {
        notFoundCount++;
        if (sampleNotFound.length < 5) {
          sampleNotFound.push(parentId);
        }
      }
    }
    
    // 5. Get top 10 comments with the most replies for verification
    const { data: topRepliedComments } = await supabase
      .from('comments')
      .select('comment_id, text, reply_count')
      .gt('reply_count', 0)
      .order('reply_count', { ascending: false })
      .limit(10);
    
    return NextResponse.json({
      success: true,
      stats: {
        totalReplies: replies.length,
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
      },
      topComments: topRepliedComments
    });
  } catch (error) {
    console.error('Error in JavaScript fix:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 