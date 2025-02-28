import React from 'react';
import { CommentData } from '../lib/types';

interface CommentRepliesProps {
  replies: CommentData[];
}

const CommentReplies = ({ replies }: CommentRepliesProps) => {
  return (
    <div className="mt-3 pl-6 space-y-3">
      {replies.map((reply) => (
        <div key={reply.id} className="border-l-2 border-gray-200 pl-3">
          <div className="flex items-start gap-3">
            <img 
              src={reply.authorProfileImageUrl} 
              alt={reply.authorDisplayName}
              className="w-8 h-8 rounded-full"
            />
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm">{reply.authorDisplayName}</h4>
                <span className="text-gray-500 text-xs">
                  {new Date(reply.publishedAt).toLocaleDateString()}
                </span>
              </div>
              
              <p className="mt-1 text-sm">{reply.textDisplay}</p>
              
              <div className="flex items-center mt-1 gap-3">
                <div className="flex items-center gap-1">
                  <button className="text-gray-600 hover:text-gray-900">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill={reply.isHeartedByCreator ? "red" : "none"} stroke="currentColor" strokeWidth={1.5}>
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex items-center gap-1">
                  <button className="text-gray-600 hover:text-gray-900">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                  </button>
                  <span className="text-xs">{reply.likeCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommentReplies; 