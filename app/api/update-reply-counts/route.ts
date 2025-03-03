import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  console.log('Updating reply counts for all comments...');
  
  try {
    // 1. First, reset all reply_count values to 0
    const { error: resetError } = await supabase
      .from('comments')
      .update({ reply_count: 0 })
      .is('parent_id', null);
    
    if (resetError) {
      console.error('Error resetting reply counts:', resetError);
      return NextResponse.json({ error: resetError instanceof Error ? resetError.message : 'An unknown error occurred' }, { status: 500 });
    }
    
    // 2. Get top-level comments (up to 1000 for processing)
    const { data: topLevelComments, error: commentError } = await supabase
      .from('comments')
      .select('id, comment_id')
      .is('parent_id', null)
      .limit(1000);
    
    if (commentError) {
      console.error('Error fetching top-level comments:', commentError);
      return NextResponse.json({ error: commentError instanceof Error ? commentError.message : 'An unknown error occurred' }, { status: 500 });
    }
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // 3. For each comment, count its replies and update the count
    for (const comment of topLevelComments || []) {
      // Count replies
      const { count, error: countError } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', comment.comment_id);
      
      if (countError) {
        console.error(`Error counting replies for ${comment.comment_id}:`, countError);
        errorCount++;
        continue;
      }
      
      // Update the comment with the reply count
      const { error: updateError } = await supabase
        .from('comments')
        .update({ reply_count: count || 0 })
        .eq('id', comment.id);
      
      if (updateError) {
        console.error(`Error updating reply count for ${comment.comment_id}:`, updateError);
        errorCount++;
      } else {
        updatedCount++;
        if (count && count > 0) {
          console.log(`Updated comment ${comment.comment_id} with ${count} replies`);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      processedCount: topLevelComments?.length || 0,
      updatedCount,
      errorCount,
      message: `Updated ${updatedCount} comments with reply counts`
    });
  } catch (error) {
    console.error('Error updating reply counts:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 