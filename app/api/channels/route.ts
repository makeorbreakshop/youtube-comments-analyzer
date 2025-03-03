import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { fetchChannelInfo } from "@/lib/youtube";
import { prisma } from "@/lib/prisma";
import { YouTubeChannel } from "@/lib/types";

export async function GET() {
  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get channels from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { channels: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ channels: user.channels });
  } catch (error) {
    console.error("Error fetching channels:", error);
    return NextResponse.json(
      { error: "Failed to fetch channels" },
      { status: 500 }
    );
  }
}

export async function POST() {
  const session = await getServerSession();

  if (!session || !session.user || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const channels = await fetchChannelInfo(session.accessToken as string);
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Upsert channels to database
    const channelPromises = channels.map((channel: YouTubeChannel) =>
      prisma.channel.upsert({
        where: { channelId: channel.id },
        update: {
          title: channel.snippet.title,
          description: channel.snippet.description,
          thumbnailUrl: channel.snippet.thumbnails.default.url,
        },
        create: {
          channelId: channel.id,
          title: channel.snippet.title,
          description: channel.snippet.description,
          thumbnailUrl: channel.snippet.thumbnails.default.url,
          userId: user.id,
        },
      })
    );

    const savedChannels = await Promise.all(channelPromises);
    return NextResponse.json({ channels: savedChannels });
  } catch (error) {
    console.error("Error fetching and saving channels:", error);
    return NextResponse.json(
      { error: "Failed to fetch and save channels" },
      { status: 500 }
    );
  }
} 