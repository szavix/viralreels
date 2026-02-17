"use client";

import type { Category } from "@viralreels/shared";
import { Button } from "@/components/ui/button";

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryIds: string[];
  onSelectionChange: (categoryIds: string[]) => void;
}

export function CategorySelector({
  categories,
  selectedCategoryIds,
  onSelectionChange,
}: CategorySelectorProps) {
  function toggleCategory(categoryId: string) {
    if (selectedCategoryIds.includes(categoryId)) {
      onSelectionChange(selectedCategoryIds.filter((id) => id !== categoryId));
      return;
    }
    onSelectionChange([...selectedCategoryIds, categoryId]);
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {categories.map((category) => {
        const isSelected = selectedCategoryIds.includes(category.id);
        return (
          <Button
            key={category.id}
            type="button"
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => toggleCategory(category.id)}
            className="h-8 rounded-full px-3"
          >
            {category.name}
          </Button>
        );
      })}
      {selectedCategoryIds.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSelectionChange([])}
          className="h-8 px-2 text-xs text-muted-foreground"
        >
          Clear
        </Button>
      )}
    </div>
  );
}
