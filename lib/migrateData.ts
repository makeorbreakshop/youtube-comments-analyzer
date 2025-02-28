import { supabase } from '@/lib/supabase';

interface LocalComment {
  id: string;
  commentId: string;
  videoId: string;
  videoTitle?: string;
  authorName: string;
  authorProfileImageUrl?: string;
  text: string;
  likeCount: number;
  publishedAt: string;
  channelId: string;
  createdAt: string;
}

interface LocalChannel {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  userId: string;
  createdAt: string;
}

export async function migrateChannels(localChannels: LocalChannel[]) {
  const formattedChannels = localChannels.map(channel => ({
    id: channel.id,
    channel_id: channel.channelId,
    title: channel.title,
    description: channel.description || '',
    thumbnail_url: channel.thumbnailUrl || '',
    user_id: channel.userId,
    created_at: channel.createdAt,
    updated_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('channels')
    .upsert(formattedChannels, { onConflict: 'channel_id' });

  if (error) {
    console.error('Error migrating channels:', error);
    throw error;
  }

  return data;
}

export async function migrateComments(localComments: LocalComment[]) {
  const formattedComments = localComments.map(comment => ({
    id: comment.id,
    comment_id: comment.commentId,
    video_id: comment.videoId,
    video_title: comment.videoTitle || null,
    author_name: comment.authorName,
    author_profile_url: comment.authorProfileImageUrl || null,
    text: comment.text,
    like_count: comment.likeCount,
    published_at: comment.publishedAt,
    channel_id: comment.channelId,
    created_at: comment.createdAt,
    updated_at: new Date().toISOString()
  }));

  // Process in batches to avoid request size limitations
  const batchSize = 100;
  const batches = [];

  for (let i = 0; i < formattedComments.length; i += batchSize) {
    batches.push(formattedComments.slice(i, i + batchSize));
  }

  const results = [];

  for (const batch of batches) {
    const { data, error } = await supabase
      .from('comments')
      .upsert(batch, { onConflict: 'comment_id' });

    if (error) {
      console.error('Error migrating comments batch:', error);
      throw error;
    }
    if (data) {
      results.push(...data as any[]);
    }
  }

  return results;
} 