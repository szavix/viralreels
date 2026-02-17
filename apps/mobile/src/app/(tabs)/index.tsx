import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import type { Reel, Category, FilterOption, ReelSortOption } from "@viralreels/shared";
import {
  formatCount,
  getViralTier,
  VIRAL_TIER_COLORS,
  FILTER_OPTIONS,
  REEL_SORT_OPTIONS,
} from "@viralreels/shared";
import { fetchReels, fetchCategories, triggerScrape } from "@/lib/api";
import tw from "@/lib/tw";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 2;
const GAP = 8;
const CARD_WIDTH = (width - GAP * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

export default function DashboardScreen() {
  const router = useRouter();
  const [reels, setReels] = useState<Reel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sortBy, setSortBy] = useState<ReelSortOption>("virality");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    void loadCategories();
  }, []);

  const loadReels = useCallback(
    async (pageNum: number, refresh = false) => {
      try {
        const data = await fetchReels({
          filter,
          sortBy,
          page: pageNum,
          categoryIds: selectedCategoryIds,
        });
        if (refresh || pageNum === 1) {
          setReels(data.reels);
        } else {
          setReels((prev) => [...prev, ...data.reels]);
        }
        setHasMore(pageNum < data.totalPages);
      } catch (err) {
        console.error("Failed to load reels:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [filter, sortBy, selectedCategoryIds]
  );

  useEffect(() => {
    setIsLoading(true);
    setPage(1);
    loadReels(1, true);
  }, [filter, sortBy, selectedCategoryIds, loadReels]);

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }

  function handleRefresh() {
    setIsRefreshing(true);
    setPage(1);
    loadReels(1, true);
  }

  function handleLoadMore() {
    if (!hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadReels(nextPage);
  }

  async function handleScrapeNow() {
    setIsScraping(true);
    try {
      const result = await triggerScrape();
      Alert.alert(
        "Scrape Complete",
        `Scraped ${result.accounts_processed} account(s) — ${result.total_reels} reels found`
      );
      handleRefresh();
    } catch (err) {
      Alert.alert(
        "Scrape Failed",
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setIsScraping(false);
    }
  }

  function renderReelCard({ item }: { item: Reel }) {
    const tier = getViralTier(item.viral_score);

    return (
      <TouchableOpacity
        onPress={() => router.push(`/reel/${item.id}`)}
        activeOpacity={0.8}
        style={[tw`overflow-hidden rounded-xl border border-border bg-card`, { width: CARD_WIDTH, marginBottom: GAP }]}
      >
        <View style={{ width: CARD_WIDTH, height: CARD_WIDTH * (16 / 9) }}>
          {item.thumbnail_url ? (
            <Image
              source={{ uri: item.thumbnail_url }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View style={tw`flex-1 items-center justify-center bg-muted`}>
              <Text style={tw`text-2xl`}>🎬</Text>
            </View>
          )}

          <View style={tw`absolute left-2 top-2 flex-row items-center rounded-full bg-black/60 px-2 py-1`}>
            <View style={[tw`mr-1 h-2 w-2 rounded-full`, { backgroundColor: VIRAL_TIER_COLORS[tier] }]} />
            <Text style={tw`text-xs font-bold text-white`}>
              {item.viral_score.toFixed(1)}%
            </Text>
          </View>

          {item.is_rising_star && (
            <View style={tw`absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-1`}>
              <Text style={tw`text-xs font-bold text-white`}>⚡ Rising</Text>
            </View>
          )}
        </View>

        <View style={tw`p-2`}>
          <Text style={tw`text-sm font-medium text-foreground`} numberOfLines={1}>
            @{item.author_username}
          </Text>
          <View style={tw`mt-1 flex-row items-center gap-3`}>
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
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={tw`flex-1 bg-background`}>
      {/* Header */}
      <View style={tw`flex-row items-center justify-between border-b border-border px-4 py-2`}>
        <Text style={tw`text-lg font-bold text-foreground`}>Viral Reels</Text>
        <TouchableOpacity
          onPress={handleScrapeNow}
          disabled={isScraping}
          style={tw`rounded-lg px-3 py-2 ${isScraping ? "bg-muted" : "bg-primary"}`}
        >
          {isScraping ? (
            <ActivityIndicator color="#fafafa" size="small" />
          ) : (
            <Text style={tw`text-sm font-semibold text-white`}>Scrape Now</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={tw`border-b border-border px-2 py-2`}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={Object.entries(FILTER_OPTIONS) as [FilterOption, string][]}
          keyExtractor={([key]) => key}
          renderItem={({ item: [key, label] }) => (
            <TouchableOpacity
              onPress={() => setFilter(key)}
              style={tw`mr-2 rounded-full px-4 py-2 ${filter === key ? "bg-primary" : "bg-muted"}`}
            >
              <Text style={tw`text-sm font-medium ${filter === key ? "text-white" : "text-muted-foreground"}`}>
                {label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Category filter */}
      {categories.length > 0 && (
        <View style={tw`border-b border-border px-2 py-2`}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const selected = selectedCategoryIds.includes(item.id);
              return (
                <TouchableOpacity
                  onPress={() => toggleCategory(item.id)}
                  style={tw`mr-2 rounded-full px-4 py-2 ${selected ? "bg-primary" : "bg-muted"}`}
                >
                  <Text style={tw`text-sm font-medium ${selected ? "text-white" : "text-muted-foreground"}`}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              selectedCategoryIds.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setSelectedCategoryIds([])}
                  style={tw`rounded-full bg-muted px-3 py-2`}
                >
                  <Text style={tw`text-xs text-muted-foreground`}>Clear</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </View>
      )}

      {/* Sort buttons */}
      <View style={tw`border-b border-border px-2 py-2`}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={Object.entries(REEL_SORT_OPTIONS) as [ReelSortOption, string][]}
          keyExtractor={([key]) => key}
          renderItem={({ item: [key, label] }) => (
            <TouchableOpacity
              onPress={() => setSortBy(key)}
              style={tw`mr-2 rounded-full px-4 py-2 ${sortBy === key ? "bg-primary" : "bg-muted"}`}
            >
              <Text style={tw`text-sm font-medium ${sortBy === key ? "text-white" : "text-muted-foreground"}`}>
                {label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Grid */}
      {isLoading && reels.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator color="#8b5cf6" size="large" />
        </View>
      ) : (
        <FlatList
          data={reels}
          renderItem={renderReelCard}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={{ padding: GAP }}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#8b5cf6" />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore && reels.length > 0 ? (
              <View style={tw`items-center py-4`}>
                <ActivityIndicator color="#8b5cf6" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={tw`flex-1 items-center justify-center py-20`}>
              <Text style={tw`text-lg font-medium text-foreground`}>No reels found</Text>
              <Text style={tw`mt-1 text-sm text-muted-foreground`}>
                Add accounts in Settings to start tracking.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
