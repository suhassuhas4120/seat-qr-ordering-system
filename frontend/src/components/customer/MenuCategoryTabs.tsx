'use client';

import React from 'react';
import { MenuCategory } from '../../lib/types/restaurant';
import { Flame, UtensilsCrossed, Soup, Wheat, CupSoda, IceCream, LayoutGrid } from 'lucide-react';

interface MenuCategoryTabsProps {
  categories: MenuCategory[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  vegOnlyFilter: boolean;
  onToggleVegFilter: () => void;
}

export const MenuCategoryTabs: React.FC<MenuCategoryTabsProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
  vegOnlyFilter,
  onToggleVegFilter,
}) => {
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'UtensilsCrossed':
        return <UtensilsCrossed className="w-4 h-4 text-orange-400" />;
      case 'Soup':
        return <Soup className="w-4 h-4 text-yellow-400" />;
      case 'Wheat':
        return <Wheat className="w-4 h-4 text-emerald-400" />;
      case 'CupSoda':
        return <CupSoda className="w-4 h-4 text-cyan-400" />;
      case 'IceCream':
        return <IceCream className="w-4 h-4 text-pink-400" />;
      default:
        return <LayoutGrid className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="sticky top-[61px] z-20 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 py-2.5 px-4">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
        {/* Horizontal scrollable categories */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
          <button
            onClick={() => onSelectCategory('all')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategoryId === 'all'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-900/30'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Full Menu</span>
          </button>

          {categories.map((cat) => {
            const isSelected = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-900/30'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
                }`}
              >
                {renderIcon(cat.iconName)}
                <span>{cat.title}</span>
              </button>
            );
          })}
        </div>

        {/* Veg Only Toggle */}
        <button
          onClick={onToggleVegFilter}
          title="Filter Vegetarian Dishes"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
            vegOnlyFilter
              ? 'bg-emerald-950 text-emerald-300 border-emerald-600 shadow-sm shadow-emerald-900/40'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center p-0.5 ${
              vegOnlyFilter ? 'border-emerald-400' : 'border-zinc-500'
            }`}
          >
            <span
              className={`w-full h-full rounded-full ${
                vegOnlyFilter ? 'bg-emerald-400' : 'bg-transparent'
              }`}
            />
          </span>
          <span className="hidden xs:inline">Veg</span>
        </button>
      </div>
    </div>
  );
};
