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
import tw from "@/lib/tw";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleSubmit() {
    if (!email || !password) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
        if (!data.session) {
          setSuccess(
            "Account created. Check your email inbox for a confirmation link, then sign in."
          );
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      if (message.toLowerCase().includes("email not confirmed")) {
        setError(
          "Your email is not confirmed yet. Open your inbox and click the Supabase confirmation link."
        );
      } else if (message.toLowerCase().includes("invalid login credentials")) {
        setError("Invalid email or password. If you are new, tap Sign up first.");
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={tw`flex-1 bg-[#f3f4f6]`}
    >
      <View style={tw`flex-1 items-center justify-center px-6`}>
        {/* Logo */}
        <View style={tw`mb-8 items-center`}>
          <View style={tw`mb-4 h-16 w-16 items-center justify-center rounded-full bg-[#ede9fe]`}>
            <Text style={tw`text-3xl`}>🔥</Text>
          </View>
          <Text style={tw`text-2xl font-bold text-[#111827]`}>ViralReelsAI</Text>
          <Text style={tw`mt-1 text-sm text-[#4b5563]`}>
            {isSignUp ? "Create your account" : "Sign in to continue"}
          </Text>
        </View>

        {/* Form */}
        <View style={tw`w-full rounded-2xl border border-[#e5e7eb] bg-white p-4`}>
          <View style={tw`mb-4`}>
            <Text style={tw`mb-1 text-sm font-medium text-[#111827]`}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#a1a1a1"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              style={tw`rounded-lg border border-[#d1d5db] bg-white px-4 py-3 text-[#111827]`}
            />
          </View>

          <View style={tw`mb-4`}>
            <Text style={tw`mb-1 text-sm font-medium text-[#111827]`}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor="#a1a1a1"
              secureTextEntry
              editable={!isLoading}
              style={tw`rounded-lg border border-[#d1d5db] bg-white px-4 py-3 text-[#111827]`}
            />
          </View>

          {success && (
            <View style={tw`mb-4 rounded-lg border border-green-200 bg-green-50 p-3`}>
              <Text style={tw`text-sm text-green-700`}>{success}</Text>
            </View>
          )}

          {error && (
            <View style={tw`mb-4 rounded-lg border border-red-200 bg-red-50 p-3`}>
              <Text style={tw`text-sm text-red-700`}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            style={tw`items-center rounded-lg bg-primary px-4 py-3`}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fafafa" />
            ) : (
              <Text style={tw`font-semibold text-white`}>
                {isSignUp ? "Create Account" : "Sign In"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuccess(null);
            }}
            style={tw`items-center py-3`}
          >
            <Text style={tw`text-sm text-[#4b5563]`}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <Text style={tw`text-primary`}>
                {isSignUp ? "Sign in" : "Sign up"}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
