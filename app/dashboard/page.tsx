"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthStatus } from "@/components/auth-status";
import { ChannelSelector } from "@/components/channel-selector";

export default function Dashboard() {
  const router = useRouter();
  const session = useSession();
  
  // Handle the case where useSession is undefined during static generation
  if (!session || typeof session !== 'object') {
    // This will only happen during static build and not at runtime
    // We can safely return a loading state
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }
  
  const { data, status } = session;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">YouTube Comments Analyzer</h1>
          <AuthStatus />
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md text-gray-700"
          >
            Sign Out
          </button>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Dashboard</h2>
          
          <div className="space-y-8">
            <ChannelSelector />
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