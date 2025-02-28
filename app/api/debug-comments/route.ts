import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const channelId = request.nextUrl.searchParams.get('channelId');
    
    // First get the channel
    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_id', channelId)
      .single();
      
    console.log('Channel data:', channel);
    
    // Get 10 comments directly without filters
    const { data: comments } = await supabase
      .from('comments')
      .select('*')
      .limit(10);
      
    // Get 10 comments for this specific channel
    const { data: channelComments } = await supabase
      .from('comments')
      .select('*')
      .eq('channel_id', channel?.id)
      .limit(10);
    
    return NextResponse.json({ 
      debug: true,
      channel,
      sampleComments: comments,
      channelComments,
      commentCount: comments?.length,
      channelCommentCount: channelComments?.length
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Debug error' }, { status: 500 });
  }
} 