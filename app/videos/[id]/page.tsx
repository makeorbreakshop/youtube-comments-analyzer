"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

export default function VideoPage({ params }: { params: { id: string } }) {
  const [video, setVideo] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVideoAndComments() {
      try {
        // Fetch video details
        const { data: videoData, error: videoError } = await supabase
          .from('videos')
          .select('*, channels(title, thumbnail_url)')
          .eq('video_id', params.id)
          .single();
        
        if (videoError) throw videoError;
        setVideo(videoData);
        
        // Fetch comments for this video
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('*')
          .eq('video_id', params.id)
          .order('published_at', { ascending: false });
        
        if (commentsError) throw commentsError;
        setComments(commentsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchVideoAndComments();
  }, [params.id]);

  if (loading) {
    return <div className="container mx-auto py-8 px-4 text-center">Loading...</div>;
  }

  if (!video) {
    return <div className="container mx-auto py-8 px-4 text-center">Video not found</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">{video.title}</h1>
      
      <div className="mb-6">
        <div className="aspect-video relative bg-black rounded-lg overflow-hidden">
          <iframe 
            width="100%" 
            height="100%" 
            src={`https://www.youtube.com/embed/${video.video_id}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0"
          ></iframe>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">About this video</h2>
        <p className="text-gray-700 whitespace-pre-line">{video.description}</p>
        <p className="text-sm text-gray-500 mt-2">
          Published on {new Date(video.published_at).toLocaleDateString()}
        </p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Comments ({comments.length})</h2>
        
        {comments.length === 0 ? (
          <p className="text-gray-500">No comments yet</p>
        ) : (
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-3 mb-2">
                  {comment.author_profile_url && (
                    <Image
                      src={comment.author_profile_url}
                      alt={comment.author_name}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  )}
                  <div>
                    <h3 className="font-medium">
                      {comment.author_name}
                      {comment.is_owner_comment && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Channel Owner</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(comment.published_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="ml-[52px]">
                  <div dangerouslySetInnerHTML={{ __html: comment.text }} />
                  {comment.like_count > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      👍 {comment.like_count}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex justify-center">
        <Link href="/videos" className="text-indigo-600 hover:text-indigo-800">
          ← Back to videos
        </Link>
      </div>
    </div>
  );
} 