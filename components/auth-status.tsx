"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return (
      <div>
        <Button onClick={() => signIn("google")}>Sign in with Google</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {session?.user?.image && (
        <img
          src={session.user.image}
          alt={session.user.name || "User"}
          className="w-8 h-8 rounded-full"
        />
      )}
      <div>
        <p className="font-medium">{session?.user?.name}</p>
        <p className="text-sm text-gray-500">{session?.user?.email}</p>
      </div>
      <Button variant="outline" onClick={() => signOut()}>
        Sign out
      </Button>
    </div>
  );
} 