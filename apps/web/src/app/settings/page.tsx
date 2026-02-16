"use client";

import { useState, useEffect } from "react";
import type { Account } from "@viralreels/shared";
import { formatCount } from "@viralreels/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  AtSign,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Check,
  UserCircle,
  Users,
} from "lucide-react";

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newUsername, setNewUsername] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch {
      setError("Failed to load accounts");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim()) return;

    setIsAdding(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add account");
      }

      const account = await response.json();
      setAccounts((prev) =>
        [...prev, account].sort((a, b) => a.username.localeCompare(b.username))
      );
      setNewUsername("");
      setSuccess(`Added @${account.username}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add account");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    setTogglingIds((prev) => new Set(prev).add(id));

    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });

      if (!response.ok) throw new Error("Failed to update");

      const updated = await response.json();
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? updated : a))
      );
    } catch {
      setError("Failed to toggle account status");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`Delete @${username}? This will also remove all reel associations.`)) {
      return;
    }

    setDeletingIds((prev) => new Set(prev).add(id));

    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setSuccess(`Deleted @${username}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Failed to delete account");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Settings className="h-6 w-6 text-primary" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage the Instagram accounts you want to track.
        </p>
      </div>

      {/* Add new account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Account</CardTitle>
          <CardDescription>
            Enter an Instagram username to start tracking. The scraper will
            fetch reels from all active accounts daily at 8 AM UTC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddAccount} className="flex gap-2">
            <div className="relative flex-1">
              <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. natgeo, nike, mkbhd"
                className="pl-9"
                disabled={isAdding}
              />
            </div>
            <Button type="submit" disabled={isAdding || !newUsername.trim()}>
              {isAdding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Feedback messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">
          <Check className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* Account list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tracked Accounts</CardTitle>
          <CardDescription>
            Toggle accounts on/off or delete them entirely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No accounts added yet. Add one above to get started.
            </div>
          ) : (
            <div className="space-y-1">
              {accounts.map((account, index) => (
                <div key={account.id}>
                  {index > 0 && <Separator className="my-1" />}
                  <div className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={account.active}
                        onCheckedChange={(checked) =>
                          handleToggle(account.id, checked)
                        }
                        disabled={togglingIds.has(account.id)}
                      />
                      <div className="flex items-center gap-3">
                        {account.profile_pic_url ? (
                          <img
                            src={account.profile_pic_url}
                            alt={account.username}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <UserCircle className="h-10 w-10 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            @{account.username}
                            {account.full_name && (
                              <span className="ml-1 font-normal text-muted-foreground">
                                ({account.full_name})
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{account.active ? "Active" : "Paused"}</span>
                            {account.follower_count != null && (
                              <>
                                <span>&middot;</span>
                                <span className="flex items-center gap-0.5">
                                  <Users className="h-3 w-3" />
                                  {formatCount(account.follower_count)}
                                </span>
                              </>
                            )}
                            {account.last_scraped_at && (
                              <>
                                <span>&middot;</span>
                                <span>
                                  Scraped{" "}
                                  {new Date(account.last_scraped_at).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(account.id, account.username)}
                      disabled={deletingIds.has(account.id)}
                    >
                      {deletingIds.has(account.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
