import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { commentIds } = await request.json();
    
    if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
      return NextResponse.json({ error: 'Valid comment IDs array is required' }, { status: 400 });
    }
    
    // Get all replies for these parent IDs
    const { data, error } = await supabase
      .from('comments')
      .select('parent_id')
      .in('parent_id', commentIds);
    
    if (error) {
      console.error('Error fetching reply counts:', error);
      return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
    
    // Count replies for each parent ID
    const counts: Record<string, number> = {};
    
    // Initialize all requested IDs with 0
    commentIds.forEach((id: string) => {
      counts[id] = 0;
    });
    
    // Count occurrences
    if (data) {
      data.forEach((item: { parent_id: string }) => {
        counts[item.parent_id] = (counts[item.parent_id] || 0) + 1;
      });
    }
    
    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 