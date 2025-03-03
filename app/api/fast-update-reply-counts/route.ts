import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  console.log('⚡ Fast updating reply counts for all comments...');
  
  try {
    // Execute a single SQL statement to update all reply counts at once
    const { data, error } = await supabase.rpc('update_all_reply_counts');
    
    if (error) {
      console.error('Error in bulk reply count update:', error);
      return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "Reply counts updated successfully with bulk operation",
      data
    });
  } catch (error) {
    console.error('Error updating reply counts:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 