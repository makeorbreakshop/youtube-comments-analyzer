import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { commentIds } = await request.json();
    
    if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
      return NextResponse.json({ error: 'Valid comment IDs array is required' }, { status: 400 });
    }
    
    // Get reply counts from database
    const { data, error } = await supabase
      .from('comments')
      .select('parent_id, count')
      .in('parent_id', commentIds)
      .group('parent_id');
    
    if (error) {
      console.error('Error fetching reply counts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Convert to dictionary mapping comment ID to count
    const counts = data.reduce((acc, item) => {
      acc[item.parent_id] = parseInt(item.count);
      return acc;
    }, {});
    
    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 