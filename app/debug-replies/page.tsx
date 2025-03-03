'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Add type definitions for the debug data structure
interface CommentDebugData {
  statistics: {
    totalComments: number;
    totalReplies: number;
    percentageReplies: number;
  };
  topComments: {
    id: string;
    replyCount: number;
    text: string;
  }[];
  specificComment: {
    comment: {
      comment_id: string;
      author_name: string;
      text: string;
      reply_count: number;
      published_at: string;
      mappedData: {
        id: string;
        authorDisplayName: string;
        textDisplay: string;
        replyCount: number;
      };
    };
    directReplies: {
      count: number;
      replies: {
        comment_id: string;
        author_name: string;
        text: string;
        reply_count: number;
        published_at: string;
        mappedData: {
          id: string;
          authorDisplayName: string;
          textDisplay: string;
        };
      }[];
    };
    nestedReplies: {
      count: number;
      examples: {
        parentReplyId: string;
        nestedReplies: {
          comment_id: string;
          text: string;
          author_name: string;
          published_at: string;
          mappedData: {
            id: string;
            authorDisplayName: string;
            textDisplay: string;
          };
        }[];
      }[];
    };
  };
  recommendations: string[];
  nestedReplyExample: any;
}

function CommentDebugItem({ comment, onSelect }: { comment: any, onSelect: (id: string) => void }) {
  const [fixedReplyCount, setFixedReplyCount] = useState<number | null>(null);
  
  useEffect(() => {
    // Get the correct reply count
    const fetchCorrectReplyCount = async () => {
      try {
        const response = await fetch(`/api/fix-comment-ui?commentId=${comment.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setFixedReplyCount(data.replyCount);
          }
        }
      } catch (error) {
        console.error('Error fetching correct reply count:', error);
      }
    };
    
    fetchCorrectReplyCount();
  }, [comment.id]);
  
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 underline cursor-pointer" onClick={() => onSelect(comment.id)}>
        {comment.id}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
        {fixedReplyCount !== null ? (
          <span className={fixedReplyCount !== comment.replyCount ? 'text-red-600 font-bold' : ''}>
            {fixedReplyCount} {fixedReplyCount !== comment.replyCount && `(DB: ${comment.replyCount})`}
          </span>
        ) : (
          comment.replyCount
        )}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {comment.text}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={async () => {
            // First update the reply count
            await fetch(`/api/fix-comment-ui?commentId=${comment.id}`);
            // Then select it for analysis
            onSelect(comment.id);
          }}
          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded"
        >
          Analyze
        </button>
      </td>
    </tr>
  );
}

// Client component that uses useSearchParams
function DebugRepliesContent() {
  const searchParams = useSearchParams();
  const [commentId, setCommentId] = useState(searchParams.get('commentId') || '');
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<CommentDebugData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugData = async (commentId?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/mcp-debug-replies';
      if (commentId) {
        url += `?commentId=${commentId}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      // For each top comment, get the correct reply count
      if (data.topComments) {
        await Promise.all(data.topComments.map(async (comment: any) => {
          try {
            const fixResponse = await fetch(`/api/fix-comment-ui?commentId=${comment.id}`);
            if (fixResponse.ok) {
              const fixData = await fixResponse.json();
              if (fixData.success) {
                comment.actualReplyCount = fixData.replyCount;
              }
            }
          } catch (error) {
            console.error('Error fixing reply count:', error);
          }
        }));
      }
      
      setDebugData(data);
    } catch (error) {
      console.error('Error fetching debug data:', error);
      setError('Failed to load debug data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('commentId')) {
      fetchDebugData(searchParams.get('commentId') || '');
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-8">Comment Debug Tool</h1>
      
      {/* Form for looking up a specific comment */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="commentId" className="block text-sm font-medium text-gray-700 mb-1">
              Comment ID
            </label>
            <input
              type="text"
              id="commentId"
              value={commentId}
              onChange={(e) => setCommentId(e.target.value)}
              placeholder="Enter comment ID to analyze"
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <button
            onClick={() => fetchDebugData(commentId)}
            disabled={loading}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {loading ? 'Loading...' : 'Analyze'}
          </button>
        </div>
      </div>
      
      {/* Statistics section - Update to use the formatted data */}
      {debugData?.statistics && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">Total Comments</div>
              <div className="text-2xl font-bold">{debugData.statistics.totalComments.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">Total Replies</div>
              <div className="text-2xl font-bold">{debugData.statistics.totalReplies.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">% Replies</div>
              <div className="text-2xl font-bold">{debugData.statistics.percentageReplies}%</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Top comments section */}
      {debugData?.topComments && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Top Comments</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reply Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Text</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {debugData.topComments.map((comment) => (
                  <CommentDebugItem key={comment.id} comment={comment} onSelect={setCommentId} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Specific comment analysis section */}
      {debugData?.specificComment && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Comment Analysis</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Comment Details</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">ID:</dt>
                <dd className="mt-1 text-sm text-gray-900">{debugData.specificComment.comment?.mappedData.id}</dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Author:</dt>
                <dd className="mt-1 text-sm text-gray-900">{debugData.specificComment.comment?.mappedData.authorDisplayName}</dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Reply Count:</dt>
                <dd className="mt-1 text-sm text-gray-900 font-bold">
                  {debugData.specificComment.comment?.reply_count || 0}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Text:</dt>
                <dd className="mt-1 text-sm text-gray-900 p-3 bg-gray-50 rounded">
                  {debugData.specificComment.comment?.mappedData.textDisplay}
                </dd>
              </div>
            </dl>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Direct Replies ({debugData.specificComment.directReplies.count})</h3>
            {debugData.specificComment.directReplies.count > 0 ? (
              <div className="space-y-4">
                {debugData.specificComment.directReplies.replies.map((reply) => (
                  <div key={reply.comment_id} className="border-l-4 border-gray-200 pl-4 py-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{reply.author_name}</span>
                      <span className="text-sm text-gray-500">{new Date(reply.published_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm mt-1">{reply.mappedData.textDisplay}</p>
                    {reply.reply_count > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            setCommentId(reply.comment_id);
                            fetchDebugData(reply.comment_id);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-900"
                        >
                          This reply has {reply.reply_count} {reply.reply_count === 1 ? 'response' : 'responses'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No direct replies found</p>
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Nested Replies ({debugData.specificComment.nestedReplies.count})</h3>
            {debugData.specificComment.nestedReplies.count > 0 ? (
              <div className="space-y-4">
                {debugData.specificComment.nestedReplies.examples.map((nested, index) => (
                  <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                    <p className="text-sm font-medium">Reply {nested.parentReplyId} has {nested.nestedReplies.length} nested replies</p>
                    <button
                      onClick={() => {
                        setCommentId(nested.parentReplyId);
                        fetchDebugData(nested.parentReplyId);
                      }}
                      className="mt-1 text-sm text-blue-600 hover:text-blue-900"
                    >
                      Analyze this reply thread
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No nested replies found</p>
            )}
          </div>
        </div>
      )}
      
      {/* Recommendations section */}
      {debugData?.recommendations && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
          <ul className="list-disc pl-5 space-y-2">
            {debugData.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-gray-700">{rec}</li>
            ))}
          </ul>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main component with suspense boundary
export default function DebugRepliesPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-8">Comment Debug Tool</h1>
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-center">
          Loading...
        </div>
      </div>
    }>
      <DebugRepliesContent />
    </Suspense>
  );
} 