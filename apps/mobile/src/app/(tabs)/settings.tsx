import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Switch,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from "react-native";
import type { Account, Category } from "@viralreels/shared";
import { formatCount } from "@viralreels/shared";
import {
  fetchAccounts,
  addAccount,
  toggleAccount,
  deleteAccount,
  fetchCategories,
  addCategory,
  deleteCategory,
  fetchAccountCategories,
  updateAccountCategories,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import tw from "@/lib/tw";

export default function SettingsScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountCategoryIdsMap, setAccountCategoryIdsMap] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [newUsername, setNewUsername] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  useEffect(() => {
    void loadSettingsData();
  }, []);

  async function loadSettingsData() {
    try {
      const [loadedAccounts, loadedCategories] = await Promise.all([
        fetchAccounts(),
        fetchCategories(),
      ]);
      setAccounts(loadedAccounts);
      setCategories(loadedCategories);

      const entries = await Promise.all(
        loadedAccounts.map(async (account) => {
          const categoryIds = await fetchAccountCategories(account.id);
          return [account.id, categoryIds] as const;
        })
      );
      setAccountCategoryIdsMap(Object.fromEntries(entries));
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdd() {
    if (!newUsername.trim()) return;
    setIsAdding(true);

    try {
      const account = await addAccount(newUsername.trim());
      setAccounts((prev) =>
        [...prev, account].sort((a, b) => a.username.localeCompare(b.username))
      );
      setNewUsername("");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to add account"
      );
    } finally {
      setIsAdding(false);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      const updated = await toggleAccount(id, active);
      setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
      Alert.alert("Error", "Failed to update account");
    }
  }

  async function handleDelete(id: string, username: string) {
    Alert.alert("Delete Account", `Remove @${username}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAccount(id);
            setAccounts((prev) => prev.filter((a) => a.id !== id));
          } catch {
            Alert.alert("Error", "Failed to delete account");
          }
        },
      },
    ]);
  }

  async function handleAddCategory() {
    const normalized = newCategoryName.trim().toLowerCase();
    if (!normalized) return;
    setIsAddingCategory(true);

    try {
      const category = await addCategory(normalized);
      setCategories((prev) =>
        [...prev, category].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewCategoryName("");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to add category"
      );
    } finally {
      setIsAddingCategory(false);
    }
  }

  async function handleDeleteCategory(id: string, name: string) {
    Alert.alert("Delete Category", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCategory(id);
            setCategories((prev) => prev.filter((category) => category.id !== id));
            setAccountCategoryIdsMap((prev) =>
              Object.fromEntries(
                Object.entries(prev).map(([accountId, categoryIds]) => [
                  accountId,
                  categoryIds.filter((categoryId) => categoryId !== id),
                ])
              )
            );
          } catch {
            Alert.alert("Error", "Failed to delete category");
          }
        },
      },
    ]);
  }

  async function handleToggleAccountCategory(accountId: string, categoryId: string) {
    const currentIds = accountCategoryIdsMap[accountId] ?? [];
    const nextIds = currentIds.includes(categoryId)
      ? currentIds.filter((id) => id !== categoryId)
      : [...currentIds, categoryId];

    setAccountCategoryIdsMap((prev) => ({ ...prev, [accountId]: nextIds }));
    try {
      const persistedIds = await updateAccountCategories(accountId, nextIds);
      setAccountCategoryIdsMap((prev) => ({ ...prev, [accountId]: persistedIds }));
    } catch {
      setAccountCategoryIdsMap((prev) => ({ ...prev, [accountId]: currentIds }));
      Alert.alert("Error", "Failed to update account categories");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function handleOpenInstagram(username: string) {
    const url = `https://www.instagram.com/${username}/`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Unavailable", "Cannot open Instagram profile link.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Failed to open Instagram profile.");
    }
  }

  return (
    <View style={tw`flex-1 bg-background`}>
      {/* Add account */}
      <View style={tw`border-b border-border p-4`}>
        <Text style={tw`mb-2 text-lg font-bold text-foreground`}>Add Account</Text>
        <View style={tw`flex-row items-center`}>
          <View style={tw`flex-1 flex-row items-center rounded-lg border border-border bg-card px-3`}>
            <Text style={tw`mr-1 text-muted-foreground`}>@</Text>
            <TextInput
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="e.g. natgeo"
              placeholderTextColor="#a1a1a1"
              autoCapitalize="none"
              autoCorrect={false}
              style={tw`flex-1 py-3 text-foreground`}
              editable={!isAdding}
              onSubmitEditing={handleAdd}
            />
          </View>
          <TouchableOpacity
            onPress={handleAdd}
            disabled={isAdding || !newUsername.trim()}
            style={tw`ml-2 rounded-lg px-4 py-3 ${isAdding || !newUsername.trim() ? "bg-muted" : "bg-primary"}`}
          >
            {isAdding ? (
              <ActivityIndicator color="#fafafa" size="small" />
            ) : (
              <Text style={tw`font-semibold text-white`}>Add</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Add category */}
      <View style={tw`border-b border-border p-4`}>
        <Text style={tw`mb-2 text-lg font-bold text-foreground`}>Add Category</Text>
        <View style={tw`flex-row items-center`}>
          <View style={tw`flex-1 rounded-lg border border-border bg-card px-3`}>
            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="e.g. goth, talking, irl"
              placeholderTextColor="#a1a1a1"
              autoCapitalize="none"
              autoCorrect={false}
              style={tw`py-3 text-foreground`}
              editable={!isAddingCategory}
              onSubmitEditing={handleAddCategory}
            />
          </View>
          <TouchableOpacity
            onPress={handleAddCategory}
            disabled={isAddingCategory || !newCategoryName.trim()}
            style={tw`ml-2 rounded-lg px-4 py-3 ${isAddingCategory || !newCategoryName.trim() ? "bg-muted" : "bg-primary"}`}
          >
            {isAddingCategory ? (
              <ActivityIndicator color="#fafafa" size="small" />
            ) : (
              <Text style={tw`font-semibold text-white`}>Add</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Account list */}
      {isLoading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator color="#8b5cf6" size="large" />
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={tw`items-center py-20`}>
              <Text style={tw`text-lg font-medium text-foreground`}>No accounts yet</Text>
              <Text style={tw`mt-1 text-sm text-muted-foreground`}>
                Add a username above to start tracking.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={tw`flex-row items-center justify-between border-b border-border px-4 py-4`}>
              <View style={tw`flex-1 flex-row items-center`}>
                <Switch
                  value={item.active}
                  onValueChange={(value) => handleToggle(item.id, value)}
                  trackColor={{ false: "#262626", true: "#8b5cf6" }}
                  thumbColor="#fafafa"
                />
                <View style={tw`ml-3 flex-row items-center`}>
                  {item.profile_pic_url ? (
                    <Image
                      source={{ uri: item.profile_pic_url }}
                      style={{ width: 36, height: 36, borderRadius: 18 }}
                    />
                  ) : (
                    <View
                      style={[
                        tw`items-center justify-center bg-muted`,
                        { width: 36, height: 36, borderRadius: 18 },
                      ]}
                    >
                      <Text style={tw`text-sm text-muted-foreground`}>@</Text>
                    </View>
                  )}
                  <View style={tw`ml-2`}>
                    <TouchableOpacity onPress={() => handleOpenInstagram(item.username)}>
                      <Text style={tw`text-sm font-medium text-foreground underline`}>
                        @{item.username}
                      </Text>
                    </TouchableOpacity>
                    <Text style={tw`text-xs text-muted-foreground`}>
                      {item.active ? "Active" : "Paused"}
                      {item.follower_count != null &&
                        ` · ${formatCount(item.follower_count)} followers`}
                    </Text>
                    <View style={tw`mt-2 flex-row flex-wrap`}>
                      {categories.map((category) => {
                        const selected = (accountCategoryIdsMap[item.id] ?? []).includes(category.id);
                        return (
                          <TouchableOpacity
                            key={category.id}
                            onPress={() => handleToggleAccountCategory(item.id, category.id)}
                            style={tw`mb-1 mr-1 rounded-full px-3 py-1 ${selected ? "bg-primary" : "bg-muted"}`}
                          >
                            <Text style={tw`text-xs ${selected ? "text-white" : "text-muted-foreground"}`}>
                              {category.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item.id, item.username)}
                style={tw`rounded-lg p-2`}
              >
                <Text style={tw`text-sm text-red-500`}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Category list */}
      <View style={tw`border-t border-border px-4 py-3`}>
        <Text style={tw`mb-2 text-base font-semibold text-foreground`}>Categories</Text>
        {categories.length === 0 ? (
          <Text style={tw`text-sm text-muted-foreground`}>No categories yet.</Text>
        ) : (
          <View style={tw`flex-row flex-wrap`}>
            {categories.map((category) => (
              <View
                key={category.id}
                style={tw`mb-2 mr-2 flex-row items-center rounded-full border border-border bg-card px-3 py-1`}
              >
                <Text style={tw`text-xs text-foreground`}>{category.name}</Text>
                <TouchableOpacity
                  onPress={() => handleDeleteCategory(category.id, category.name)}
                  style={tw`ml-2 rounded-full bg-muted px-2 py-1`}
                >
                  <Text style={tw`text-xs text-red-500`}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Logout */}
      <View style={tw`border-t border-border p-4`}>
        <TouchableOpacity
          onPress={handleLogout}
          style={tw`items-center rounded-lg border border-border py-3`}
        >
          <Text style={tw`font-medium text-muted-foreground`}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
