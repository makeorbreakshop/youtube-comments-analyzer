import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Fixing reply counts with base ID matching...');
    
    // First, reset all reply counts
    await supabase
      .from('comments')
      .update({ reply_count: 0 })
      .is('parent_id', null);
    
    // Then update the counts using base ID matching
    const { data, error } = await supabase.rpc('update_reply_counts_with_base_id');
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      message: "Reply counts updated using base ID matching",
      updatedCount: data
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Fix failed' }, { status: 500 });
  }
} 