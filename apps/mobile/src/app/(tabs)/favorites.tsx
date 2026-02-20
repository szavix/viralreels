import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { formatCount, formatTimeAgo } from "@viralreels/shared";
import {
  fetchFavorites,
  type FavoriteReel,
  updateFavoriteCompleted,
  unfavoriteReel,
} from "@/lib/api";
import tw from "@/lib/tw";

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteReel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFavorites = useCallback(async () => {
    try {
      const data = await fetchFavorites(1, 1000);
      setFavorites(data.reels);
    } catch (err) {
      console.error("Failed to load favorites:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  async function handleToggleCompleted(reelId: string, completed: boolean) {
    await updateFavoriteCompleted(reelId, completed);
    setFavorites((prev) =>
      prev.map((favorite) =>
        favorite.id === reelId ? { ...favorite, completed } : favorite
      )
    );
  }

  async function handleUnfavorite(reelId: string) {
    await unfavoriteReel(reelId);
    setFavorites((prev) => prev.filter((favorite) => favorite.id !== reelId));
  }

  if (isLoading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-background`}>
        <ActivityIndicator color="#8b5cf6" size="large" />
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-background`}>
      <View style={tw`border-b border-border px-4 py-3`}>
        <Text style={tw`text-lg font-bold text-foreground`}>Favorites</Text>
        <Text style={tw`text-xs text-muted-foreground`}>
          {favorites.length} saved reels (completed stays visible)
        </Text>
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              void loadFavorites();
            }}
            tintColor="#8b5cf6"
          />
        }
        ListEmptyComponent={
          <View style={tw`items-center py-20`}>
            <Text style={tw`text-lg font-medium text-foreground`}>No favorites yet</Text>
            <Text style={tw`mt-1 text-sm text-muted-foreground`}>
              Favorite reels from the Dashboard to see them here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/reel/${item.id}`)}
            activeOpacity={0.85}
            style={tw`mb-3 overflow-hidden rounded-xl border border-border bg-card`}
          >
            <View style={tw`flex-row`}>
              <View style={tw`h-28 w-20 bg-muted`}>
                {item.thumbnail_url ? (
                  <Image
                    source={{ uri: item.thumbnail_url }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : null}
              </View>

              <View style={tw`flex-1 p-3`}>
                <View style={tw`mb-1 flex-row items-center justify-between`}>
                  <Text style={tw`text-sm font-semibold text-foreground`}>
                    @{item.author_username}
                  </Text>
                  <Text style={tw`text-xs text-muted-foreground`}>
                    {formatTimeAgo(item.posted_at)}
                  </Text>
                </View>

                <View style={tw`mb-2 flex-row items-center gap-3`}>
                  <Text style={tw`text-xs text-muted-foreground`}>
                    👁 {formatCount(item.view_count)}
                  </Text>
                  <Text style={tw`text-xs text-muted-foreground`}>
                    ❤️ {formatCount(item.like_count)}
                  </Text>
                  <Text style={tw`text-xs text-muted-foreground`}>
                    💬 {formatCount(item.comment_count)}
                  </Text>
                </View>

                <View style={tw`flex-row items-center gap-2`}>
                  <TouchableOpacity
                    onPress={() => void handleToggleCompleted(item.id, !item.completed)}
                    style={tw`rounded-full px-3 py-1 ${item.completed ? "bg-emerald-600" : "bg-muted"}`}
                  >
                    <Text style={tw`text-xs font-medium ${item.completed ? "text-white" : "text-muted-foreground"}`}>
                      {item.completed ? "Completed" : "Mark completed"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void handleUnfavorite(item.id)}
                    style={tw`rounded-full bg-muted px-3 py-1`}
                  >
                    <Text style={tw`text-xs font-medium text-red-500`}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
