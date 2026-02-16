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
} from "react-native";
import type { Account } from "@viralreels/shared";
import { formatCount } from "@viralreels/shared";
import {
  fetchAccounts,
  addAccount,
  toggleAccount,
  deleteAccount,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newUsername, setNewUsername] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      const data = await fetchAccounts();
      setAccounts(data);
    } catch (err) {
      console.error("Failed to load accounts:", err);
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <View className="flex-1 bg-background">
      {/* Add account */}
      <View className="border-b border-border p-4">
        <Text className="mb-2 text-lg font-bold text-foreground">
          Add Account
        </Text>
        <View className="flex-row items-center space-x-2">
          <View className="flex-1 flex-row items-center rounded-lg border border-border bg-card px-3">
            <Text className="mr-1 text-muted-foreground">@</Text>
            <TextInput
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="e.g. natgeo"
              placeholderTextColor="#a1a1a1"
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 py-3 text-foreground"
              editable={!isAdding}
              onSubmitEditing={handleAdd}
            />
          </View>
          <TouchableOpacity
            onPress={handleAdd}
            disabled={isAdding || !newUsername.trim()}
            className={`rounded-lg px-4 py-3 ${
              isAdding || !newUsername.trim() ? "bg-muted" : "bg-primary"
            }`}
          >
            {isAdding ? (
              <ActivityIndicator color="#fafafa" size="small" />
            ) : (
              <Text className="font-semibold text-white">Add</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Account list */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#8b5cf6" size="large" />
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-lg font-medium text-foreground">
                No accounts yet
              </Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                Add a username above to start tracking.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
              <View className="flex-1 flex-row items-center">
                <Switch
                  value={item.active}
                  onValueChange={(value) => handleToggle(item.id, value)}
                  trackColor={{ false: "#262626", true: "#8b5cf6" }}
                  thumbColor="#fafafa"
                />
                <View className="ml-3 flex-row items-center">
                  {item.profile_pic_url ? (
                    <Image
                      source={{ uri: item.profile_pic_url }}
                      style={{ width: 36, height: 36, borderRadius: 18 }}
                    />
                  ) : (
                    <View
                      style={{ width: 36, height: 36, borderRadius: 18 }}
                      className="items-center justify-center bg-muted"
                    >
                      <Text className="text-sm text-muted-foreground">@</Text>
                    </View>
                  )}
                  <View className="ml-2">
                    <Text className="text-sm font-medium text-foreground">
                      @{item.username}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {item.active ? "Active" : "Paused"}
                      {item.follower_count != null &&
                        ` · ${formatCount(item.follower_count)} followers`}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item.id, item.username)}
                className="rounded-lg p-2"
              >
                <Text className="text-destructive text-sm">Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Logout button */}
      <View className="border-t border-border p-4">
        <TouchableOpacity
          onPress={handleLogout}
          className="items-center rounded-lg border border-border py-3"
        >
          <Text className="font-medium text-muted-foreground">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
