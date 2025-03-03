import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const commentId = 'UgxoCmqup6-7hKidtul4AaABAg'; // Hardcode the specific comment ID
  
  try {
    // Get the current value first
    const { data: oldData } = await supabase
      .from('comments')
      .select('*')
      .eq('comment_id', commentId)
      .single();
    
    if (!oldData) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    // Count how many replies this comment has
    const { count, error: countError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', commentId);
    
    if (countError) {
      return NextResponse.json({ 
        error: `Error counting replies: ${countError.message}` 
      }, { status: 500 });
    }
    
    // Use a direct SQL query
    const { data: sqlResult, error: sqlError } = await supabase
      .from('comments')
      .update({ reply_count: count })
      .eq('id', oldData.id)
      .select();
    
    if (sqlError) {
      return NextResponse.json({ 
        error: `SQL error: ${sqlError.message}` 
      }, { status: 500 });
    }
    
    // Verify the update worked
    const { data: newData } = await supabase
      .from('comments')
      .select('*')
      .eq('id', oldData.id)
      .single();
    
    return NextResponse.json({
      success: true,
      message: `Fixed reply count for ${commentId}`,
      oldData: {
        id: oldData.id,
        comment_id: oldData.comment_id,
        reply_count: oldData.reply_count
      },
      newData: newData ? {
        id: newData.id,
        comment_id: newData.comment_id,
        reply_count: newData.reply_count
      } : null,
      sqlResult,
      replyCount: count
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 