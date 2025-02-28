import React from 'react';
import { tokens, componentStyles } from '@/lib/design-system';

interface CommentPaginationProps {
  page: number;
  totalPages: number;
  onLoadMore: () => void;
  isLoading: boolean;
  totalShown: number;
  totalAvailable: number;
}

export default function CommentPagination({
  page,
  totalPages,
  onLoadMore,
  isLoading,
  totalShown,
  totalAvailable
}: CommentPaginationProps) {
  return (
    <div className="mt-8 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
      {page < totalPages && (
        <button 
          onClick={onLoadMore}
          disabled={isLoading}
          className={componentStyles.button.primary}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </>
          ) : 'Load More Comments'}
        </button>
      )}
      
      <div className={tokens.typography.body.default}>
        Showing <span className="font-medium">{totalShown}</span> of <span className="font-medium">{totalAvailable}</span> comments
      </div>
    </div>
  );
} 