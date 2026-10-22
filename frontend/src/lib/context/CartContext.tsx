'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartEntry {
  itemId: string;
  quantity: number;
  selectedOption?: string;
  addOns?: string[];
}

interface CartContextType {
  items: Record<string, CartEntry>;
  getItemQuantity: (itemId: string) => number;
  updateQuantity: (itemId: string, newQuantity: number) => void;
  addItemWithDetails: (
    itemId: string,
    quantity: number,
    selectedOption?: string,
    addOns?: string[]
  ) => void;
  clearCart: () => void;
  totalItemCount: number;
  likedItems: Record<string, boolean>;
  toggleLike: (itemId: string) => void;
  isItemLiked: (itemId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'thoogudeepa_v2_cart_data';
const LIKES_STORAGE_KEY = 'thoogudeepa_v2_liked_items';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Record<string, CartEntry>>({});
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  // Load cart and liked items on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
      const storedLikes = localStorage.getItem(LIKES_STORAGE_KEY);
      if (storedLikes) {
        setLikedItems(JSON.parse(storedLikes));
      }
    } catch {
      // Ignore storage errors
    }
    setMounted(true);
  }, []);

  // Save cart and liked items to local storage
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Ignore storage errors
      }
    }
  }, [items, mounted]);

  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likedItems));
      } catch {
        // Ignore storage errors
      }
    }
  }, [likedItems, mounted]);

  const toggleLike = (itemId: string) => {
    setLikedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const isItemLiked = (itemId: string): boolean => {
    return !!likedItems[itemId];
  };

  const getItemQuantity = (itemId: string): number => {
    return items[itemId]?.quantity || 0;
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    setItems((prev) => {
      const copy = { ...prev };
      if (newQuantity <= 0) {
        delete copy[itemId];
      } else {
        copy[itemId] = {
          ...copy[itemId],
          itemId,
          quantity: newQuantity,
        };
      }
      return copy;
    });
  };

  const addItemWithDetails = (
    itemId: string,
    quantity: number,
    selectedOption?: string,
    addOns?: string[]
  ) => {
    setItems((prev) => {
      const currentQty = prev[itemId]?.quantity || 0;
      return {
        ...prev,
        [itemId]: {
          itemId,
          quantity: currentQty + quantity,
          selectedOption,
          addOns,
        },
      };
    });
  };

  const clearCart = () => {
    setItems({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const totalItemCount = Object.values(items).reduce(
    (total, entry) => total + (entry.quantity || 0),
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        getItemQuantity,
        updateQuantity,
        addItemWithDetails,
        clearCart,
        totalItemCount,
        likedItems,
        toggleLike,
        isItemLiked,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
