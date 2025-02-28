-- Run this in the Supabase SQL editor
CREATE OR REPLACE FUNCTION get_comments_with_reply_counts(channel_id_param UUID)
RETURNS TABLE (
  comment_id TEXT,
  reply_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.comment_id,
    COUNT(r.id)::BIGINT as reply_count
  FROM 
    comments c
  LEFT JOIN 
    comments r ON c.comment_id = r.parent_id
  WHERE 
    c.channel_id = channel_id_param
    AND c.parent_id IS NULL
  GROUP BY 
    c.comment_id
  ORDER BY 
    COUNT(r.id) DESC;
END;
$$ LANGUAGE plpgsql; 