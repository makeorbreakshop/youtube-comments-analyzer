"use client";
import React from 'react';
import CommentAnalytics from '@/components/CommentAnalytics';
import { tokens } from '@/lib/design-system';

export default function Home() {
  const channelId = "UCjWkNxpp3UHdEavpM_19--Q"; // Example channel ID
  
  return (
    <div className="container">
      <main>
        <div className="mb-6">
          <h2 className={tokens.typography.title.section}>Comment Analysis</h2>
          <p className="mt-2 text-lg text-gray-600">
            Analyze and understand your YouTube viewer feedback
          </p>
        </div>
        
        <CommentAnalytics channelId={channelId} />
      </main>
    </div>
  );
} 