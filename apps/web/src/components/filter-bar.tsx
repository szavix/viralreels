"use client";

import {
  FILTER_OPTIONS,
  REEL_SORT_OPTIONS,
  type FilterOption,
  type ReelSortOption,
} from "@viralreels/shared";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Zap, Music, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterBarProps {
  activeFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  sortBy: ReelSortOption;
  onSortChange: (sortBy: ReelSortOption) => void;
}

const filterIcons: Record<FilterOption, React.ReactNode> = {
  all: <LayoutGrid className="h-4 w-4" />,
  last24h: <Clock className="h-4 w-4" />,
  risingStars: <Zap className="h-4 w-4" />,
  audioTrending: <Music className="h-4 w-4" />,
};

export function FilterBar({
  activeFilter,
  onFilterChange,
  sortBy,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="space-y-2">
      <Tabs
        value={activeFilter}
        onValueChange={(v) => onFilterChange(v as FilterOption)}
      >
        <TabsList className="h-auto flex-wrap">
          {(Object.entries(FILTER_OPTIONS) as [FilterOption, string][]).map(
            ([key, label]) => (
              <TabsTrigger
                key={key}
                value={key}
                className="flex items-center gap-1.5"
              >
                {filterIcons[key]}
                {label}
              </TabsTrigger>
            )
          )}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        {(Object.entries(REEL_SORT_OPTIONS) as [ReelSortOption, string][]).map(
          ([key, label]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={sortBy === key ? "default" : "outline"}
              onClick={() => onSortChange(key)}
              className="h-8 rounded-full px-3"
            >
              {label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
