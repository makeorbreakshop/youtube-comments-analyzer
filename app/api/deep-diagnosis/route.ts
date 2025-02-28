import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Starting deep diagnosis of comment relationships...');
    
    // Get sample of replies
    const { data: sampleReplies } = await supabase
      .from('comments')
      .select('comment_id, parent_id, text')
      .not('parent_id', 'is', null)
      .limit(5);
    
    // Get sample of top-level comments
    const { data: sampleParents } = await supabase
      .from('comments')
      .select('comment_id, text')
      .is('parent_id', null)
      .limit(5);
    
    // Check ID format patterns
    let replyIdPattern = 'unknown';
    let parentIdPattern = 'unknown';
    let replyParentIdPattern = 'unknown';
    
    if (sampleReplies && sampleReplies.length > 0) {
      replyIdPattern = analyzeIdFormat(sampleReplies[0].comment_id);
      replyParentIdPattern = analyzeIdFormat(sampleReplies[0].parent_id);
    }
    
    if (sampleParents && sampleParents.length > 0) {
      parentIdPattern = analyzeIdFormat(sampleParents[0].comment_id);
    }
    
    // Check if any parent IDs from replies match any comment IDs
    const { data: matchesWithFullId } = await supabase.rpc('check_parent_comment_matches');
    
    // Try to find matches with just base ID (without period and additional text)
    const { data: matchesWithBaseIdOnly } = await supabase.rpc('check_parent_comment_base_matches');
    
    return NextResponse.json({
      diagnosis: {
        idPatterns: {
          replyCommentId: replyIdPattern,
          parentCommentId: parentIdPattern,
          replyParentId: replyParentIdPattern
        },
        samples: {
          replies: sampleReplies,
          parents: sampleParents
        },
        matches: {
          fullIdMatches: matchesWithFullId,
          baseIdMatches: matchesWithBaseIdOnly
        },
        solution: determineFixStrategy(replyIdPattern, parentIdPattern, replyParentIdPattern, 
          matchesWithFullId, matchesWithBaseIdOnly)
      }
    });
  } catch (error) {
    console.error('Diagnosis error:', error);
    return NextResponse.json({ error: 'Diagnosis failed' }, { status: 500 });
  }
}

// Analyzes ID format to understand structure
function analyzeIdFormat(id: string): string {
  if (!id) return 'empty';
  
  if (id.includes('.')) {
    const parts = id.split('.');
    return `baseId.extension (${parts.length} parts)`;
  }
  
  return 'simple ID';
}

// Determines the best fix strategy based on diagnosis
function determineFixStrategy(
  replyIdPattern: string,
  parentIdPattern: string,
  replyParentIdPattern: string,
  fullMatches: any,
  baseMatches: any
): string {
  // Full matches exist - use direct matching
  if (fullMatches && fullMatches > 0) {
    return "Use direct matching of parent_id to comment_id";
  }
  
  // Base matches exist - need to extract base IDs
  if (baseMatches && baseMatches > 0) {
    return "Extract base ID from parent_id before matching to comment_id";
  }
  
  // Patterns suggest format differences
  if (replyParentIdPattern !== parentIdPattern) {
    return "Reformat parent_id in replies to match comment_id format in parents";
  }
  
  return "Unable to determine fix strategy from basic diagnosis";
} 