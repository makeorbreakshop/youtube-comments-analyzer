"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { sanitizeAndRenderHtml } from '@/lib/content-utils';

interface YouTubeComment {
  id: string;
  videoId: string;
  authorName: string;
  authorProfileUrl: string;
  text: string;
  likeCount: number;
  publishedAt: string;
  videoTitle: string;
}

export default function YouTubeComments() {
  const [comments, setComments] = useState<YouTubeComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchComments() {
      try {
        const response = await fetch("/api/youtube-comments");
        if (!response.ok) {
          throw new Error("Failed to fetch comments");
        }
        const data = await response.json();
        setComments(data.comments);
      } catch (err) {
        setError("Error loading comments. Please try again later.");
        console.error("Error fetching comments:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 py-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Latest YouTube Comments</h2>
      
      {comments.length === 0 ? (
        <p>No comments found.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start space-x-3">
                <img 
                  src={comment.authorProfileUrl}
                  alt={comment.authorName}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{comment.authorName}</h3>
                    <span className="text-gray-500 text-sm">
                      {formatDistanceToNow(new Date(comment.publishedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1" dangerouslySetInnerHTML={sanitizeAndRenderHtml(comment.text)}></p>
                  <div className="mt-2 text-gray-500 text-sm">
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                      {comment.likeCount}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    on video: {comment.videoTitle}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 