import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import type { Reel, Account, Category, FilterOption, ReelSortOption } from "@viralreels/shared";
import {
  formatCount,
  formatTimeAgo,
  getViralTier,
  VIRAL_TIER_COLORS,
  FILTER_OPTIONS,
  REEL_SORT_OPTIONS,
} from "@viralreels/shared";
import {
  fetchReels,
  fetchCategories,
  fetchAccounts,
  fetchFavorites,
  favoriteReel,
  unfavoriteReel,
  triggerScrape,
} from "@/lib/api";
import tw from "@/lib/tw";

const GAP = 8;

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columnCount = width >= 1100 ? 5 : width >= 900 ? 4 : width >= 700 ? 3 : 2;
  const horizontalPadding = 8;
  const cardWidth = (width - horizontalPadding * 2 - GAP * (columnCount - 1)) / columnCount;
  const [reels, setReels] = useState<Reel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sortBy, setSortBy] = useState<ReelSortOption>("virality");
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [favoriteStatusMap, setFavoriteStatusMap] = useState<Record<string, { completed: boolean }>>({});
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

  useEffect(() => {
    async function loadAccounts() {
      try {
        const data = await fetchAccounts();
        setAccounts(data);
      } catch (err) {
        console.error("Failed to load accounts:", err);
      }
    }
    void loadAccounts();
  }, []);

  const loadFavoriteStatuses = useCallback(async () => {
    try {
      const data = await fetchFavorites(1, 1000);
      const nextMap: Record<string, { completed: boolean }> = {};
      for (const favorite of data.reels) {
        nextMap[favorite.id] = { completed: favorite.completed };
      }
      setFavoriteStatusMap(nextMap);
    } catch (err) {
      console.error("Failed to load favorites:", err);
    }
  }, []);

  useEffect(() => {
    void loadFavoriteStatuses();
  }, [loadFavoriteStatuses]);

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
    void loadFavoriteStatuses();
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
      let cursor = 0;
      let safetyCounter = 0;
      let totalProcessed = 0;
      let totalFailed = 0;
      let totalReels = 0;
      let accountsTotal = 0;

      while (safetyCounter < 100) {
        const result = await triggerScrape({ cursor, batchSize: 8 });
        totalProcessed += result.accounts_processed ?? 0;
        totalFailed += result.failed_accounts ?? 0;
        totalReels += result.total_reels ?? 0;
        accountsTotal = Math.max(accountsTotal, result.accounts_total ?? 0);

        if (result.done || result.nextCursor == null) {
          break;
        }
        if (result.nextCursor <= cursor) {
          break;
        }
        cursor = result.nextCursor;
        safetyCounter += 1;
      }

      Alert.alert(
        "Scrape Complete",
        `Scraped ${totalProcessed}/${accountsTotal} account(s) — ${totalReels} reels found (${totalFailed} failed)`
      );
      await loadFavoriteStatuses();
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
    const postedAgo = formatTimeAgo(item.posted_at);
    const isFavorited = !!favoriteStatusMap[item.id];
    const isCompleted = favoriteStatusMap[item.id]?.completed ?? false;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/reel/${item.id}`)}
        activeOpacity={0.8}
        style={[tw`overflow-hidden rounded-xl border border-border bg-card`, { width: cardWidth, marginBottom: GAP }]}
      >
        <View style={{ width: cardWidth, height: cardWidth * (16 / 9) }}>
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

          <View style={tw`absolute right-2 top-2 flex-row items-center`}>
            {isCompleted && (
              <View style={tw`mr-1 rounded-full bg-emerald-600 px-2 py-1`}>
                <Text style={tw`text-xs font-bold text-white`}>✓ Done</Text>
              </View>
            )}
            {item.is_rising_star && (
              <View style={tw`mr-1 rounded-full bg-amber-500 px-2 py-1`}>
                <Text style={tw`text-xs font-bold text-white`}>⚡ Rising</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={async () => {
                try {
                  if (isFavorited) {
                    await unfavoriteReel(item.id);
                    setFavoriteStatusMap((prev) => {
                      const next = { ...prev };
                      delete next[item.id];
                      return next;
                    });
                  } else {
                    await favoriteReel(item.id);
                    setFavoriteStatusMap((prev) => ({ ...prev, [item.id]: { completed: false } }));
                  }
                } catch (err) {
                  Alert.alert(
                    "Favorites",
                    err instanceof Error ? err.message : "Failed to update favorite"
                  );
                }
              }}
              style={tw`rounded-full px-2 py-1 ${isFavorited ? "bg-pink-500" : "bg-black/60"}`}
            >
              <Text style={tw`text-xs font-bold text-white`}>{isFavorited ? "♥" : "♡"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={tw`p-2`}>
          <Text style={tw`text-sm font-medium text-foreground`} numberOfLines={1}>
            @{item.author_username}
          </Text>
          {postedAgo ? (
            <Text style={tw`mt-0.5 text-xs text-muted-foreground`}>
              {postedAgo}
            </Text>
          ) : null}
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
        <View>
          <Text style={tw`text-lg font-bold text-foreground`}>Viral Reels</Text>
          <Text style={tw`text-xs text-muted-foreground`}>
            {formatCount(accounts.length)} account(s) tracked
          </Text>
        </View>
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
        <TouchableOpacity
          onPress={() => setShowAdvancedControls((prev) => !prev)}
          style={tw`mt-2 self-start rounded-full px-3 py-1.5 ${showAdvancedControls ? "bg-primary" : "bg-muted"}`}
        >
          <Text style={tw`text-xs font-medium ${showAdvancedControls ? "text-white" : "text-muted-foreground"}`}>
            {showAdvancedControls ? "Hide category & sort" : "Show category & sort"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category filter */}
      {showAdvancedControls && categories.length > 0 && (
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
      {showAdvancedControls && (
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
      )}

      {/* Grid */}
      {isLoading && reels.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator color="#8b5cf6" size="large" />
        </View>
      ) : (
        <FlatList
          key={`reel-grid-${columnCount}`}
          data={reels}
          renderItem={renderReelCard}
          keyExtractor={(item) => item.id}
          numColumns={columnCount}
          contentContainerStyle={{ padding: GAP }}
          columnWrapperStyle={columnCount > 1 ? { justifyContent: "space-between" } : undefined}
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
                Add accounts in Accounts to start tracking.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
