import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleSubmit() {
    if (!email || !password) return;
    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <View className="flex-1 items-center justify-center px-6">
        {/* Logo */}
        <View className="mb-8 items-center">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <Text className="text-3xl">🔥</Text>
          </View>
          <Text className="text-2xl font-bold text-foreground">
            ViralReelsAI
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            {isSignUp ? "Create your account" : "Sign in to continue"}
          </Text>
        </View>

        {/* Form */}
        <View className="w-full max-w-sm space-y-4">
          <View>
            <Text className="mb-1 text-sm font-medium text-foreground">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#a1a1a1"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              className="rounded-lg border border-border bg-card px-4 py-3 text-foreground"
            />
          </View>

          <View>
            <Text className="mb-1 text-sm font-medium text-foreground">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor="#a1a1a1"
              secureTextEntry
              editable={!isLoading}
              className="rounded-lg border border-border bg-card px-4 py-3 text-foreground"
            />
          </View>

          {error && (
            <View className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <Text className="text-sm text-red-400">{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            className="items-center rounded-lg bg-primary px-4 py-3"
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fafafa" />
            ) : (
              <Text className="font-semibold text-white">
                {isSignUp ? "Create Account" : "Sign In"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="items-center py-2"
          >
            <Text className="text-sm text-muted-foreground">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <Text className="text-primary">
                {isSignUp ? "Sign in" : "Sign up"}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
