import { MenuCategory, MenuItem } from '../types/restaurant';

export const MENU_CATEGORIES: MenuCategory[] = [
  { id: 'all', title: 'All', iconName: 'Sparkles', sortRank: 0 },
  { id: 'cat-biryani', title: 'Donne Biryani & Rice', iconName: 'Flame', sortRank: 1 },
  { id: 'cat-starters', title: 'Starters & Sides', iconName: 'UtensilsCrossed', sortRank: 2 },
  { id: 'cat-special', title: 'Sunday Specials & Soups', iconName: 'Soup', sortRank: 3 },
];

export const MENU_ITEMS: MenuItem[] = [
  // ── Rice & Biryani ──────────────────────────────────────────────────
  {
    id: 'dish-20',
    categoryId: 'cat-biryani',
    title: 'Chicken Biryani',
    description:
      'Fragrant Seeraga Samba short-grain rice cooked with tender chicken cuts, fresh mint, coriander, and native green masala, served hot in authentic leaf donne.',
    price: 170,
    isVegetarian: false,
    isSpicy: true,
    isSignature: true,
    inStock: true,
    prepTimeMinutes: 10,
    imageUrl: '/images/dishes/chicken-biryani.webp',
    options: ['Medium Spicy (Traditional)', 'Extra Hot Guntur Chilli'],
    addOns: [
      { name: 'Extra Boiled Egg (1 Pc)', price: 20 },
      { name: 'Kushka Rice Portion', price: 90 },
      { name: 'Double Raita Bowl', price: 20 },
    ],
  },
  {
    id: 'dish-22',
    categoryId: 'cat-biryani',
    title: 'Mutton Biryani',
    description:
      'Tender country mutton slow-cooked with military hotel spices, fragrant jeera samba rice, and rich bone marrow gravy, served in traditional leaf donne.',
    price: 280,
    isVegetarian: false,
    isSpicy: true,
    isSignature: true,
    inStock: true,
    prepTimeMinutes: 12,
    imageUrl: '/images/dishes/mutton-biryani.webp',
    options: ['Traditional Bone-In Cut', 'Tender Boneless Cut'],
    addOns: [
      { name: 'Extra Pepper Gravy Bowl', price: 35 },
      { name: 'Boiled Egg (2 Pcs)', price: 35 },
      { name: 'Double Raita Bowl', price: 20 },
    ],
  },
  {
    id: 'dish-21',
    categoryId: 'cat-biryani',
    title: 'Biryani Rice',
    description:
      'Aromatic Seeraga Samba kushka rice cooked in rich meat stock and fragrant whole spices without meat pieces.',
    price: 90,
    isVegetarian: false,
    isSpicy: false,
    isSignature: false,
    inStock: true,
    prepTimeMinutes: 5,
    imageUrl: '/images/dishes/biryani-rice.webp',
    options: ['With Raita & Salan', 'Salan Only'],
    addOns: [
      { name: 'Extra Salan Bowl', price: 25 },
      { name: 'Boiled Egg (1 Pc)', price: 20 },
    ],
  },

  // ── Starters ────────────────────────────────────────────────────────
  {
    id: 'dish-18',
    categoryId: 'cat-starters',
    title: 'Chicken Kabab',
    description:
      'Crispy deep-fried chicken cubes coated with curd, ginger-garlic paste, and vibrant Indian spices.',
    price: 160,
    isVegetarian: false,
    isSpicy: true,
    isSignature: true,
    inStock: true,
    prepTimeMinutes: 8,
    imageUrl: '/images/dishes/chicken-kabab.webp',
    options: ['Boneless Cuts', 'Traditional Bone-In'],
    addOns: [
      { name: 'Onion Salad Plate', price: 15 },
      { name: 'Mint Dip', price: 20 },
    ],
  },
  {
    id: 'dish-13',
    categoryId: 'cat-starters',
    title: 'Chicken Fry',
    description:
      'Boneless and tender chicken chunks marinated in native spice blend, shallow fried to a golden crisp.',
    price: 160,
    isVegetarian: false,
    isSpicy: true,
    isSignature: true,
    inStock: true,
    prepTimeMinutes: 10,
    imageUrl: '/images/dishes/chicken-fry.webp',
    options: ['Crispy Dry', 'Semi-Roast'],
    addOns: [
      { name: 'Extra Onion & Lemon', price: 15 },
    ],
  },
  {
    id: 'dish-14',
    categoryId: 'cat-starters',
    title: 'Chicken Pepper Dry',
    description:
      'Tender chicken pieces tossed with freshly cracked black pepper, caramelized garlic, and shallots.',
    price: 160,
    isVegetarian: false,
    isSpicy: true,
    isSignature: false,
    inStock: true,
    prepTimeMinutes: 10,
    imageUrl: '/images/dishes/chicken-pepper-dry.webp',
    options: ['High Pepper Heat', 'Balanced Pepper'],
    addOns: [
      { name: 'Garlic Flakes Topping', price: 15 },
      { name: 'Lemon Slice Squeeze', price: 10 },
    ],
  },
  {
    id: 'dish-17',
    categoryId: 'cat-starters',
    title: 'Chilli Chicken',
    description:
      'Bite-sized chicken chunks tossed with fiery green chillies, curry leaves, and native seasoning.',
    price: 160,
    isVegetarian: false,
    isSpicy: true,
    isSignature: false,
    inStock: true,
    prepTimeMinutes: 10,
    imageUrl: '/images/dishes/chilli-chicken.webp',
    options: ['Fiery Andhra Style', 'Medium Spicy'],
    addOns: [
      { name: 'Fried Green Chillies', price: 15 },
    ],
  },
  {
    id: 'dish-19',
    categoryId: 'cat-starters',
    title: 'Chicken Chops',
    description:
      'Tender chicken cuts slow-simmered in an intensely fragrant green herb and mint-coriander gravy.',
    price: 160,
    isVegetarian: false,
    isSpicy: true,
    isSignature: false,
    inStock: true,
    prepTimeMinutes: 12,
    imageUrl: '/images/dishes/chicken-chops.webp',
    options: ['Thick Semi-Gravy', 'Rich Curry Base'],
    addOns: [
      { name: 'Extra Mint Leaves Garnish', price: 10 },
    ],
  },
  {
    id: 'dish-15',
    categoryId: 'cat-starters',
    title: 'Chicken Leg Piece (2pcs)',
    description:
      'Two succulent whole chicken drumsticks marinated in aromatic spices and roasted to tenderness.',
    price: 160,
    isVegetarian: false,
    isSpicy: true,
    isSignature: false,
    inStock: true,
    prepTimeMinutes: 12,
    imageUrl: '/images/dishes/chicken-leg-piece-2pcs.webp',
    options: ['Masala Roasted', 'Crispy Tawa Fry'],
    addOns: [
      { name: 'Mint Chutney & Lime Dip', price: 20 },
    ],
  },
  {
    id: 'dish-16',
    categoryId: 'cat-starters',
    title: 'Chicken Leg Piece (1pc)',
    description:
      'Single tender whole chicken drumstick seasoned and roasted in traditional military masala.',
    price: 80,
    isVegetarian: false,
    isSpicy: true,
    isSignature: false,
    inStock: true,
    prepTimeMinutes: 8,
    imageUrl: '/images/dishes/chicken-leg-piece-1pc.webp',
    options: ['Masala Roasted', 'Crispy Tawa Fry'],
    addOns: [
      { name: 'Lime & Sliced Onions', price: 10 },
    ],
  },
  {
    id: 'dish-7',
    categoryId: 'cat-starters',
    title: 'Mutton Fry',
    description:
      'Tender chunks of fresh country mutton pan-tossed with shallots, crushed spices, and curry leaves.',
    price: 260,
    isVegetarian: false,
    isSpicy: true,
    isSignature: true,
    inStock: true,
    prepTimeMinutes: 14,
    imageUrl: '/images/dishes/mutton-fry.webp',
    options: ['Semi-Gravy Roast', 'Dry Masala Fry'],
    addOns: [
      { name: 'Lemon & Sliced Onions Platter', price: 15 },
    ],
  },
  {
    id: 'dish-8',
    categoryId: 'cat-starters',
    title: 'Mutton Dry',
    description:
      'Succulent mutton cuts slow-roasted with black pepper, roasted coriander, and caramelized onions.',
    price: 260,
    isVegetarian: false,
    isSpicy: true,
    isSignature: false,
    inStock: true,
    prepTimeMinutes: 14,
    imageUrl: '/images/dishes/mutton-dry.webp',
    options: ['Extra Black Pepper', 'Medium Peppery'],
    addOns: [
      { name: 'Fried Green Chillies', price: 15 },
    ],
  },
  {
    id: 'dish-9',
    categoryId: 'cat-starters',
    title: 'Mutton Chops',
    description:
      'Juicy rib chops marinated in authentic military green masala and braised to tender perfection.',
    price: 260,
    isVegetarian: false,
    isSpicy: true,
    isSignature: true,
    inStock: true,
    prepTimeMinutes: 14,
    imageUrl: '/images/dishes/mutton-chops.webp',
    options: ['Juicy Bone-In Chops', 'Tender Soft Cut'],
    addOns: [
      { name: 'Extra Green Masala Dip', price: 25 },
    ],
  },
  {
    id: 'dish-10',
    categoryId: 'cat-starters',
    title: 'Mutton Liver',
    description:
      'Fresh mutton liver pieces pan-roasted with black peppercorns, browned onions, and curry leaves.',
    price: 240,
    isVegetarian: false,
    isSpicy: true,
    isSignature: false,
    inStock: true,
    prepTimeMinutes: 10,
    imageUrl: '/images/dishes/mutton-liver.webp',
    options: ['Pan Roast Pepper', 'Masala Tossed'],
    addOns: [
      { name: 'Lemon Wedge & Onion Rings', price: 15 },
    ],
  },
  {
    id: 'dish-11',
    categoryId: 'cat-starters',
    title: 'Botti Gujju',
    description:
      'Classic Bangalore military hotel goat tripe curry prepared in thick aromatic spice reduction.',
    price: 180,
    isVegetarian: false,
    isSpicy: true,
    isSignature: false,
    inStock: true,
    prepTimeMinutes: 12,
    imageUrl: '/images/dishes/booti-gojju.webp',
    options: ['Traditional Karnataka Masala', 'Extra Hot Pepper'],
    addOns: [
      { name: 'Curry Leaf Garnish', price: 10 },
    ],
  },
  {
    id: 'dish-12',
    categoryId: 'cat-starters',
    title: 'Keema Ball',
    description:
      'Crispy deep-fried seasoned minced mutton meatballs with aromatic herbs and crunch exterior.',
    price: 180,
    isVegetarian: false,
    isSpicy: true,
    isSignature: true,
    inStock: true,
    prepTimeMinutes: 10,
    imageUrl: '/images/dishes/keema-ball.webp',
    options: ['Hot Crispy Toss', 'With Mint Chutney'],
    addOns: [
      { name: 'Extra Chutney Bowl', price: 20 },
    ],
  },

  // ── Sunday Specials & Soups ─────────────────────────────────────────
  {
    id: 'dish-1',
    categoryId: 'cat-special',
    title: 'Kaalu Soup',
    description:
      'Traditional military hotel mutton trotter soup slow-simmered with crushed black pepper, bone marrow, and fresh coriander.',
    price: 120,
    isVegetarian: false,
    isSpicy: true,
    isSignature: true,
    inStock: true,
    prepTimeMinutes: 5,
    imageUrl: '/images/dishes/kaalu-soup.webp',
    options: ['Traditional Pepper Hot', 'Mild Warm Spice'],
    addOns: [
      { name: 'Extra Soup Bowl', price: 60 },
      { name: 'Lemon & Pepper Spritz', price: 10 },
    ],
  },
  {
    id: 'dish-2',
    categoryId: 'cat-special',
    title: 'Plain Soup',
    description:
      'Aromatic clear mutton bone broth spiced with peppercorns, garlic, and fresh herbs without trotter cuts.',
    price: 25,
    isVegetarian: false,
    isSpicy: false,
    isSignature: false,
    inStock: true,
    prepTimeMinutes: 3,
    imageUrl: '/images/dishes/plain-soup.webp',
    options: ['Piping Hot', 'Warm'],
    addOns: [
      { name: 'Extra Peppercorn Dust', price: 5 },
    ],
  },
  {
    id: 'dish-3',
    categoryId: 'cat-special',
    title: 'Idli (2pcs)',
    description:
      'Ultra-soft, steamed rice cakes served hot on banana leaf, ideal pairing with mutton curries and kaalu soup.',
    price: 50,
    isVegetarian: true,
    isSpicy: false,
    isSignature: false,
    inStock: true,
    prepTimeMinutes: 4,
    imageUrl: '/images/dishes/idli-2pcs.webp',
    options: ['With Non-Veg Gravy', 'With Chutney & Sambar'],
    addOns: [
      { name: 'Extra Idli (1 Pc)', price: 25 },
    ],
  },
  {
    id: 'dish-4',
    categoryId: 'cat-special',
    title: 'Dosa (2pcs)',
    description:
      'Soft, golden spongy set dosas cooked to perfection on an iron tawa, served hot.',
    price: 50,
    isVegetarian: true,
    isSpicy: false,
    isSignature: false,
    inStock: true,
    prepTimeMinutes: 6,
    imageUrl: '/images/dishes/dosa-2pcs.webp',
    options: ['Soft Spongy Set', 'Crisp Edge Roast'],
    addOns: [
      { name: 'Pure Ghee Topping', price: 20 },
    ],
  },
  {
    id: 'dish-5',
    categoryId: 'cat-special',
    title: 'Booti Gojju',
    description:
      'Tender diced mutton tripe simmered in a dark, rich, highly spiced military hotel onion-coconut masala gravy.',
    price: 180,
    isVegetarian: false,
    isSpicy: true,
    isSignature: true,
    inStock: true,
    prepTimeMinutes: 10,
    imageUrl: '/images/dishes/booti-gojju.webp',
    options: ['Traditional Hot', 'Extra Spicy Guntur'],
    addOns: [
      { name: 'Extra Gravy Portion', price: 40 },
    ],
  },
  {
    id: 'dish-6',
    categoryId: 'cat-special',
    title: 'Keema Gojju',
    description:
      'Fine minced mutton simmered into a deeply flavored rustic gravy with ground spices and fresh mint.',
    price: 180,
    isVegetarian: false,
    isSpicy: true,
    isSignature: true,
    inStock: true,
    prepTimeMinutes: 10,
    imageUrl: '/images/dishes/keema-gojju.webp',
    options: ['Traditional Medium Spicy', 'Military Hotel Hot'],
    addOns: [
      { name: 'Boiled Egg (1 Pc)', price: 20 },
    ],
  },
];

// Flexible lookup dictionary mapping 'dish-X' and plain 'X'
export const MENU_ITEMS_BY_ID: Record<string, MenuItem> = MENU_ITEMS.reduce((acc, item) => {
  acc[item.id] = item;
  const numId = item.id.replace('dish-', '');
  acc[numId] = item;
  acc[`dish-${numId}`] = item;
  return acc;
}, {} as Record<string, MenuItem>);

export function getMenuItemById(id: string): MenuItem {
  const clean = id.trim();
  const numId = clean.replace('dish-', '');
  const prefixedId = clean.startsWith('dish-') ? clean : `dish-${clean}`;

  return (
    MENU_ITEMS_BY_ID[clean] ||
    MENU_ITEMS_BY_ID[prefixedId] ||
    MENU_ITEMS_BY_ID[numId] || {
      id: clean,
      categoryId: 'cat-biryani',
      title: `Special Dish #${numId}`,
      description: 'Handcrafted fresh military hotel recipe prepared to order.',
      price: 160,
      isVegetarian: false,
      isSpicy: true,
      isSignature: false,
      inStock: true,
      prepTimeMinutes: 10,
      imageUrl: '/images/dishes/chicken-biryani.webp',
      options: ['Traditional Spicy', 'Mild Masala'],
      addOns: [{ name: 'Extra Gravy Cup', price: 30 }],
    }
  );
}
