"use client";

import type { Account } from "@viralreels/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCircle } from "lucide-react";

interface AccountSelectorProps {
  accounts: Account[];
  selectedAccountId: string | null;
  onAccountChange: (accountId: string | null) => void;
}

export function AccountSelector({
  accounts,
  selectedAccountId,
  onAccountChange,
}: AccountSelectorProps) {
  return (
    <Select
      value={selectedAccountId ?? "all"}
      onValueChange={(value) =>
        onAccountChange(value === "all" ? null : value)
      }
    >
      <SelectTrigger className="w-[220px]">
        <div className="flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="All Accounts" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Accounts</SelectItem>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <div className="flex items-center gap-2">
              {account.profile_pic_url ? (
                <img
                  src={account.profile_pic_url}
                  alt={account.username}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <UserCircle className="h-5 w-5 text-muted-foreground" />
              )}
              @{account.username}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
