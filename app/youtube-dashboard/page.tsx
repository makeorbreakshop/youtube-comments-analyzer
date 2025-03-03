import { Suspense } from 'react';
import CommentsDashboard from '@/components/comments-dashboard';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function YouTubeDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin?callbackUrl=/youtube-dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">YouTube Comment Analytics</h1>
          
          <Suspense fallback={<LoadingSpinner />}>
            <CommentsDashboard />
          </Suspense>
        </div>
      </main>
    </div>
  );
} 