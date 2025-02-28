import { sanitizeAndRenderHtml } from '@/lib/content-utils';

interface Comment {
  id: string;
  text: string;
  author_name: string;
  author_profile_url: string;
  video_title: string;
  published_at: string;
  like_count: number;
}

interface CommentsListProps {
  comments: Comment[];
  loading: boolean;
}

export default function CommentsList({ comments, loading }: CommentsListProps) {
  if (loading) {
    return (
      <div className="py-4 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p className="mt-2 text-gray-500">Loading comments...</p>
      </div>
    );
  }
  
  if (comments.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        No comments found. Try importing more comments or adjusting your search.
      </div>
    );
  }
  
  return (
    <div className="divide-y divide-gray-200">
      {comments.map((comment) => (
        <div key={comment.id} className="py-4">
          <div className="flex space-x-3">
            {comment.author_profile_url && (
              <div className="flex-shrink-0">
                <img
                  className="h-10 w-10 rounded-full"
                  src={comment.author_profile_url}
                  alt={comment.author_name}
                />
              </div>
            )}
            
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {comment.author_name}
              </p>
              
              <p className="text-sm text-gray-500">
                Commented on {new Date(comment.published_at).toLocaleDateString()}
                {comment.video_title && ` • ${comment.video_title}`}
              </p>
              
              <div 
                className="mt-2 text-sm text-gray-700"
                dangerouslySetInnerHTML={sanitizeAndRenderHtml(comment.text)}
              />
              
              <div className="mt-2 text-xs text-gray-500">
                {comment.like_count > 0 && (
                  <span className="mr-2">👍 {comment.like_count}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 