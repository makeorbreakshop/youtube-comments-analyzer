import React from 'react';
import { tokens, componentStyles } from '@/lib/design-system';

interface CommentStatsProps {
  totalComments: number;
  totalVideos: number;
  currentFilter: string;
}

export default function CommentStats({ totalComments, totalVideos, currentFilter }: CommentStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className={`${componentStyles.card.default} ${tokens.spacing.card.default}`}>
        <h3 className="text-sm font-medium text-gray-500">Total Comments</h3>
        <p className="mt-1 text-3xl font-semibold text-gray-900">{totalComments.toLocaleString()}</p>
      </div>
      
      <div className={`${componentStyles.card.default} ${tokens.spacing.card.default}`}>
        <h3 className="text-sm font-medium text-gray-500">Available Videos</h3>
        <p className="mt-1 text-3xl font-semibold text-gray-900">{totalVideos}</p>
      </div>
      
      <div className={`${componentStyles.card.default} ${tokens.spacing.card.default}`}>
        <h3 className="text-sm font-medium text-gray-500">Current Filter</h3>
        <p className="mt-1 text-xl font-semibold text-gray-900 truncate">{currentFilter}</p>
      </div>
    </div>
  );
} 