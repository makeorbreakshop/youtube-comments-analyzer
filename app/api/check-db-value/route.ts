import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const commentId = request.nextUrl.searchParams.get('commentId') || 'UgxoCmqup6-7hKidtul4AaABAg';
  
  try {
    // Get the raw database value
    const { data, error } = await supabase
      .from('comments')
      .select('comment_id, reply_count')
      .eq('comment_id', commentId)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    // Count the actual replies
    const { count, error: countError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', commentId);
    
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    
    return NextResponse.json({
      comment: data,
      actualReplyCount: count,
      mismatch: data.reply_count !== count
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 