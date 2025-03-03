"use client";
import React from 'react';
import CommentAnalytics from '@/components/CommentAnalytics';

export default function Home() {
  const channelId = "UCjWkNxpp3UHdEavpM_19--Q";
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CommentAnalytics channelId={channelId} />
    </div>
  );
} 