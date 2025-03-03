import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const channelId = request.nextUrl.searchParams.get('channelId');
  
  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
  }
  
  try {
    // Get the channel information
    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_id', channelId)
      .single();
      
    console.log('Channel lookup result:', channel);
    
    // If we found the channel, check its comments using the UUID
    let channelComments = [];
    let commentCount = 0;
    
    if (channel) {
      // Check comments using the channel's UUID
      const { data: comments, count } = await supabase
        .from('comments')
        .select('*', { count: 'exact' })
        .eq('channel_id', channel.id)
        .limit(5);
        
      channelComments = comments ?? [];
      commentCount = count ?? 0;
      
      console.log(`Found ${count ?? 0} comments for channel UUID ${channel.id}`);
    }
    
    // Also try direct YouTube channel ID lookup for comparison
    const { data: directComments, count: directCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact' })
      .eq('channel_id', channelId)
      .limit(5);
      
    console.log(`Found ${directCount} comments for direct channel ID ${channelId}`);
    
    return NextResponse.json({
      channel,
      uuidComments: channelComments,
      uuidCommentCount: commentCount,
      directComments,
      directCommentCount: directCount,
      channelId,
      message: "Check server logs for detailed output"
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Debug error' }, { status: 500 });
  }
} 