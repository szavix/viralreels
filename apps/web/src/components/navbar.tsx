import Link from "next/link";
import { Flame, Heart, LayoutDashboard, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LogoutButton } from "@/components/logout-button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">ViralReelsAI</span>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Accounts
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/favorites" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Favorites
              </Link>
            </Button>
          </nav>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
