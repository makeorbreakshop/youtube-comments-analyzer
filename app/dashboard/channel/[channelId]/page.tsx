'use client';

import { useState, useEffect } from 'react';
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { AuthStatus } from "@/components/auth-status";
import CommentsList from "@/components/CommentsList";
import { Button } from "@/components/ui/button";

interface ChannelPageProps {
  params: {
    channelId: string;
  };
}

// Client-side component to handle fetching comments
function ClientSideCommentsList({ channelId }: { channelId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchComments() {
      try {
        const response = await fetch(`/api/comments?channelId=${channelId}`);
        const data = await response.json();
        setComments(data.comments || []);
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchComments();
  }, [channelId]);
  
  return <CommentsList comments={comments} loading={loading} />;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { channelId } = params;
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect("/auth/signin");
  }

  const channel = await prisma.channel.findFirst({
    where: {
      id: channelId,
      user: {
        email: session.user.email!,
      },
    },
  });

  if (!channel) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">YouTube Comments Analyzer</h1>
          <AuthStatus />
        </div>
      </header>
      
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {channel.thumbnailUrl && (
                <img 
                  src={channel.thumbnailUrl} 
                  alt={channel.title} 
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <h2 className="text-2xl font-bold">{channel.title}</h2>
                {channel.description && (
                  <p className="text-gray-600 text-sm">{channel.description}</p>
                )}
              </div>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">Back to Channels</Button>
            </Link>
          </div>
          
          <div className="space-y-8">
            <ClientSideCommentsList channelId={channelId} />
          </div>
        </div>
      </main>
      
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-gray-500">
          <p>© {new Date().getFullYear()} YouTube Comments Analyzer</p>
        </div>
      </footer>
    </div>
  );
} 