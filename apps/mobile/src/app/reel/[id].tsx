import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Dimensions,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Video, ResizeMode } from "expo-av";
import type { Reel } from "@viralreels/shared";
import {
  formatCount,
  getViralTier,
  VIRAL_TIER_COLORS,
} from "@viralreels/shared";
import { supabase } from "@/lib/supabase";

const { width } = Dimensions.get("window");

export default function ReelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reel, setReel] = useState<Reel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    async function loadReel() {
      try {
        const { data, error } = await supabase
          .from("reels")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setReel(data as Reel);
      } catch (err) {
        console.error("Failed to load reel:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) loadReel();
  }, [id]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#8b5cf6" size="large" />
      </View>
    );
  }

  if (!reel) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-lg text-foreground">Reel not found</Text>
      </View>
    );
  }

  const tier = getViralTier(reel.viral_score);
  const postedDate = reel.posted_at
    ? new Date(reel.posted_at).toLocaleDateString()
    : "Unknown";

  const duration = reel.video_duration
    ? `${Math.floor(reel.video_duration / 60)}:${Math.floor(reel.video_duration % 60)
        .toString()
        .padStart(2, "0")}`
    : null;

  return (
    <ScrollView className="flex-1 bg-background">
      {/* Video player */}
      <View style={{ width, height: width * (16 / 9), maxHeight: 500 }} className="bg-black">
        {reel.video_url ? (
          <Video
            ref={videoRef}
            source={{ uri: reel.video_url }}
            posterSource={reel.thumbnail_url ? { uri: reel.thumbnail_url } : undefined}
            usePoster
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            shouldPlay
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white">Video not available</Text>
          </View>
        )}
      </View>

      <View className="p-4 space-y-4">
        {/* Author & score */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-foreground">
              @{reel.author_username}
            </Text>
            {reel.author_full_name && (
              <Text className="text-sm text-muted-foreground">
                {reel.author_full_name}
              </Text>
            )}
          </View>
          <View className="flex-row items-center space-x-2">
            <View className="flex-row items-center rounded-full bg-black/40 px-3 py-1.5 border border-border">
              <View
                className="mr-1.5 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: VIRAL_TIER_COLORS[tier] }}
              />
              <Text className="text-sm font-bold text-foreground">
                {(reel.viral_score * 100).toFixed(1)}%
              </Text>
            </View>
            {reel.is_rising_star && (
              <View className="rounded-full bg-amber-500/90 px-3 py-1.5">
                <Text className="text-xs font-bold text-white">⚡ Rising</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats grid */}
        <View className="flex-row justify-between">
          <StatBox label="Views" value={formatCount(reel.view_count)} emoji="👁" />
          <StatBox label="Likes" value={formatCount(reel.like_count)} emoji="❤️" />
          <StatBox label="Comments" value={formatCount(reel.comment_count)} emoji="💬" />
          <StatBox label="Shares" value={formatCount(reel.share_count)} emoji="↗️" />
        </View>

        {/* Caption */}
        {reel.description && (
          <View>
            <Text className="mb-1 text-sm font-medium text-foreground">
              Caption
            </Text>
            <Text className="text-sm text-muted-foreground">
              {reel.description}
            </Text>
          </View>
        )}

        {/* Audio */}
        {reel.audio_track && (
          <View className="rounded-lg border border-border bg-card p-3">
            <Text className="text-sm font-medium text-foreground">
              🎵 {reel.audio_track}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {reel.is_original_audio ? "Original Audio" : "Trending Audio"}
            </Text>
          </View>
        )}

        {/* Meta */}
        <View className="flex-row flex-wrap items-center space-x-4">
          <Text className="text-xs text-muted-foreground">
            📅 {postedDate}
          </Text>
          {duration && (
            <Text className="text-xs text-muted-foreground">
              ⏱ {duration}
            </Text>
          )}
        </View>

        {/* Open on Instagram */}
        <TouchableOpacity
          onPress={() => Linking.openURL(reel.url)}
          className="items-center rounded-lg bg-primary py-3"
          activeOpacity={0.8}
        >
          <Text className="font-semibold text-white">Open on Instagram</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function StatBox({
  label,
  value,
  emoji,
}: {
  label: string;
  value: string;
  emoji: string;
}) {
  return (
    <View className="flex-1 items-center rounded-lg border border-border bg-card mx-1 py-3">
      <Text className="text-base">{emoji}</Text>
      <Text className="mt-1 text-lg font-bold text-foreground">{value}</Text>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}
