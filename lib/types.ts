// YouTube API response types
export interface YouTubeChannelResponse {
  items: YouTubeChannel[];
  nextPageToken?: string;
}

export interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
    publishedAt: string;
  };
}

export interface YouTubeVideoResponse {
  items: YouTubeVideo[];
  nextPageToken?: string;
}

export interface YouTubeVideo {
  id: string | { videoId: string } | { kind: string; videoId: string };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
    resourceId?: {
      videoId?: string;
    };
  };
}

export interface YouTubeCommentResponse {
  items: YouTubeComment[];
  nextPageToken?: string;
}

export interface YouTubeComment {
  id: string;
  snippet: {
    videoId: string;
    topLevelComment: {
      snippet: {
        authorDisplayName: string;
        authorProfileImageUrl: string;
        authorChannelId?: { value: string };
        authorChannelUrl?: string;
        textDisplay: string;
        likeCount: number;
        publishedAt: string;
        updatedAt?: string;
      };
    };
    videoTitle?: string;
    parentId?: string;
    totalReplyCount?: number;
  };
  replies?: {
    comments: Array<{
      id: string;
      snippet: {
        authorDisplayName: string;
        authorProfileImageUrl: string;
        authorChannelId?: { value: string };
        authorChannelUrl?: string;
        textDisplay: string;
        likeCount: number;
        publishedAt: string;
        updatedAt?: string;
      };
    }>;
  };
}

// Our internal format for YouTube comments used in the application
export interface CustomYouTubeComment {
  id: string;
  videoId: string;
  videoTitle: string;
  authorName: string;
  authorProfileUrl: string;
  text: string;
  likeCount: number;
  publishedAt: string;
  updatedAt: string;
  totalReplyCount: number;
  parentId?: string;
  replies: CustomYouTubeComment[] | any[];
}

// Database models
export interface DbChannel {
  id: string;
  channel_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
}

export interface DbVideo {
  id: string;
  video_id: string;
  channel_id: string;
  title: string;
  description: string;
  published_at: string;
  thumbnail_url: string;
}

export interface DbComment {
  id?: number;             // Database primary key
  comment_id: string;      // YouTube comment ID
  video_id: string;
  author_name: string;
  author_profile_url: string;
  text: string;
  like_count: number;
  published_at: string;
  updated_at?: string;
  channel_id: string;
  is_owner_comment: boolean;
  parent_id: string | null;
  video_title: string;
}

// Existing types may need enhancement to include:
export interface CommentData {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  textDisplay: string;
  likeCount: number;
  publishedAt: string;
  updatedAt: string;
  videoId: string;
  videoTitle?: string;
  replyCount: number;
  isHeartedByCreator?: boolean;
  isPinned?: boolean;
  parentId?: string;
  replies?: CommentData[];
}

export interface VideoData {
  id: string;
  title: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  channelId: string;
  description?: string;
}

// Add sorting and filtering types
export type SortOption = 'date' | 'likes' | 'replies';
export type SortDirection = 'asc' | 'desc'; 