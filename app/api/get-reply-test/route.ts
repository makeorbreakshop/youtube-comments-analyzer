import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Find one comment that has at least one reply
    const { data: commentsWithReplies } = await supabase
      .from('comments')
      .select('comment_id, text, parent_id')
      .eq('parent_id', 'UgyG7-PK1vjkiwYwsOB4AaABAg')
      .limit(5);
      
    // Get the parent comment as well
    const { data: parentComment } = await supabase
      .from('comments')
      .select('comment_id, text')
      .eq('comment_id', 'UgyG7-PK1vjkiwYwsOB4AaABAg')
      .single();
    
    return NextResponse.json({
      parent: parentComment,
      replies: commentsWithReplies
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
} 