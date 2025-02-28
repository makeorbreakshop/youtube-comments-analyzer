import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchComments, fetchVideosByChannel } from '@/lib/youtube';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const channelId = searchParams.get('channelId');
  
  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
  }
  
  try {
    // Lookup channel in database
    const { data: channels, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_id', channelId);
    
    if (channelError) {
      return NextResponse.json({ error: 'Database error: ' + channelError.message }, { status: 500 });
    }
    
    const channel = channels && channels.length > 0 ? channels[0] : null;
    
    // Get a sample of comments for this channel
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('channel_id', channel?.id)
      .limit(50);
    
    if (commentsError) {
      return NextResponse.json({ error: 'Database error: ' + commentsError.message }, { status: 500 });
    }
    
    return NextResponse.json({
      channel,
      commentCount: comments?.length || 0,
      sample: comments?.slice(0, 3) || []
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 