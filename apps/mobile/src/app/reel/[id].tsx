import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Dimensions,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Video, ResizeMode } from "expo-av";
import type { Reel } from "@viralreels/shared";
import {
  formatCount,
  formatTimeAgo,
  getViralTier,
  VIRAL_TIER_COLORS,
} from "@viralreels/shared";
import { supabase } from "@/lib/supabase";
import {
  favoriteReel,
  getFavoriteStatus,
  unfavoriteReel,
  updateFavoriteCompleted,
} from "@/lib/api";
import tw from "@/lib/tw";

const { width } = Dimensions.get("window");

export default function ReelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reel, setReel] = useState<Reel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    async function loadReel(reelId: string) {
      try {
        const { data, error } = await supabase
          .from("reels")
          .select("*")
          .eq("id", reelId)
          .single();

        if (error) throw error;
        setReel(data as Reel);
        const status = await getFavoriteStatus(reelId);
        setIsFavorited(status.isFavorited);
        setIsCompleted(status.completed);
      } catch (err) {
        console.error("Failed to load reel:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) loadReel(id);
  }, [id]);

  if (isLoading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-background`}>
        <ActivityIndicator color="#8b5cf6" size="large" />
      </View>
    );
  }

  if (!reel) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-background`}>
        <Text style={tw`text-lg text-foreground`}>Reel not found</Text>
      </View>
    );
  }

  const tier = getViralTier(reel.viral_score);
  const postedDate = reel.posted_at
    ? new Date(reel.posted_at).toLocaleDateString()
    : "Unknown";
  const postedAgo = formatTimeAgo(reel.posted_at);

  const duration = reel.video_duration
    ? `${Math.floor(reel.video_duration / 60)}:${Math.floor(reel.video_duration % 60)
        .toString()
        .padStart(2, "0")}`
    : null;

  async function handleDownload() {
    if (!reel?.video_url) {
      Alert.alert("Unavailable", "This reel does not have a downloadable video URL.");
      return;
    }

    try {
      await Linking.openURL(reel.video_url);
    } catch {
      Alert.alert("Download failed", "Could not open the video download link.");
    }
  }

  async function handleToggleFavorite() {
    if (!reel) return;
    try {
      if (isFavorited) {
        await unfavoriteReel(reel.id);
        setIsFavorited(false);
        setIsCompleted(false);
      } else {
        await favoriteReel(reel.id);
        setIsFavorited(true);
        setIsCompleted(false);
      }
    } catch (err) {
      Alert.alert("Favorites", err instanceof Error ? err.message : "Failed to update favorite");
    }
  }

  async function handleToggleCompleted() {
    if (!reel) return;
    try {
      const next = !isCompleted;
      await updateFavoriteCompleted(reel.id, next);
      setIsCompleted(next);
    } catch (err) {
      Alert.alert("Favorites", err instanceof Error ? err.message : "Failed to update completion");
    }
  }

  return (
    <ScrollView style={tw`flex-1 bg-background`}>
      {/* Video player */}
      <View style={[tw`bg-black`, { width, height: width * (16 / 9), maxHeight: 500 }]}>
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
          <View style={tw`flex-1 items-center justify-center`}>
            <Text style={tw`text-white`}>Video not available</Text>
          </View>
        )}
      </View>

      <View style={tw`p-4`}>
        {/* Author & score */}
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <View>
            <Text style={tw`text-lg font-bold text-foreground`}>
              @{reel.author_username}
            </Text>
            {reel.author_full_name && (
              <Text style={tw`text-sm text-muted-foreground`}>
                {reel.author_full_name}
              </Text>
            )}
          </View>
          <View style={tw`flex-row items-center`}>
            <View style={tw`flex-row items-center rounded-full bg-black/40 px-3 py-1.5 border border-border mr-2`}>
              <View
                style={[tw`mr-1.5 h-2.5 w-2.5 rounded-full`, { backgroundColor: VIRAL_TIER_COLORS[tier] }]}
              />
              <Text style={tw`text-sm font-bold text-foreground`}>
                {reel.viral_score.toFixed(1)}%
              </Text>
            </View>
            {reel.is_rising_star && (
              <View style={tw`rounded-full bg-amber-500 px-3 py-1.5`}>
                <Text style={tw`text-xs font-bold text-white`}>⚡ Rising</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats grid */}
        <View style={tw`flex-row justify-between mb-4`}>
          <StatBox label="Views" value={formatCount(reel.view_count)} emoji="👁" />
          <StatBox label="Likes" value={formatCount(reel.like_count)} emoji="❤️" />
          <StatBox label="Comments" value={formatCount(reel.comment_count)} emoji="💬" />
          <StatBox label="Shares" value={formatCount(reel.share_count)} emoji="↗️" />
        </View>

        {/* Caption */}
        {reel.description && (
          <View style={tw`mb-4`}>
            <Text style={tw`mb-1 text-sm font-medium text-foreground`}>
              Caption
            </Text>
            <Text style={tw`text-sm text-muted-foreground`}>
              {reel.description}
            </Text>
          </View>
        )}

        {/* Audio */}
        {reel.audio_track && (
          <View style={tw`mb-4 rounded-lg border border-border bg-card p-3`}>
            <Text style={tw`text-sm font-medium text-foreground`}>
              🎵 {reel.audio_track}
            </Text>
            <Text style={tw`text-xs text-muted-foreground`}>
              {reel.is_original_audio ? "Original Audio" : "Trending Audio"}
            </Text>
          </View>
        )}

        {/* Meta */}
        <View style={tw`flex-row flex-wrap items-center mb-4`}>
          <Text style={tw`text-xs text-muted-foreground mr-4`}>
            📅 {postedDate}
          </Text>
          {postedAgo ? (
            <Text style={tw`text-xs text-muted-foreground mr-4`}>{postedAgo}</Text>
          ) : null}
          {duration && (
            <Text style={tw`text-xs text-muted-foreground`}>
              ⏱ {duration}
            </Text>
          )}
        </View>

        {/* Actions */}
        <TouchableOpacity
          onPress={handleToggleFavorite}
          style={tw`items-center rounded-lg py-3 mb-3 ${isFavorited ? "bg-pink-500" : "bg-muted"}`}
          activeOpacity={0.8}
        >
          <Text style={tw`font-semibold ${isFavorited ? "text-white" : "text-foreground"}`}>
            {isFavorited ? "♥ Favorited" : "♡ Add to favorites"}
          </Text>
        </TouchableOpacity>

        {isFavorited && (
          <TouchableOpacity
            onPress={handleToggleCompleted}
            style={tw`items-center rounded-lg py-3 mb-3 ${isCompleted ? "bg-emerald-600" : "bg-card border border-border"}`}
            activeOpacity={0.8}
          >
            <Text style={tw`font-semibold ${isCompleted ? "text-white" : "text-foreground"}`}>
              {isCompleted ? "✓ Completed" : "Mark as completed"}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleDownload}
          style={tw`items-center rounded-lg border border-border bg-card py-3 mb-3`}
          activeOpacity={0.8}
        >
          <Text style={tw`font-semibold text-foreground`}>Download Video</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Linking.openURL(reel.url)}
          style={tw`items-center rounded-lg bg-primary py-3 mb-6`}
          activeOpacity={0.8}
        >
          <Text style={tw`font-semibold text-white`}>Open on Instagram</Text>
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
    <View style={tw`flex-1 items-center rounded-lg border border-border bg-card mx-1 py-3`}>
      <Text style={tw`text-base`}>{emoji}</Text>
      <Text style={tw`mt-1 text-lg font-bold text-foreground`}>{value}</Text>
      <Text style={tw`text-xs text-muted-foreground`}>{label}</Text>
    </View>
  );
}
