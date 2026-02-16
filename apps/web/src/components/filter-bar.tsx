"use client";

import { FILTER_OPTIONS, type FilterOption } from "@viralreels/shared";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Zap, Music, LayoutGrid } from "lucide-react";

interface FilterBarProps {
  activeFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
}

const filterIcons: Record<FilterOption, React.ReactNode> = {
  all: <LayoutGrid className="h-4 w-4" />,
  last24h: <Clock className="h-4 w-4" />,
  risingStars: <Zap className="h-4 w-4" />,
  audioTrending: <Music className="h-4 w-4" />,
};

export function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
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
  );
}
