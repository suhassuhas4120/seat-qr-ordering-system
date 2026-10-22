import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import type {
  Seat,
  SeatZone,
  SeatSession,
  MenuCategory,
  MenuItem,
  Order,
  OrderItem,
  Payment,
  StaffUser,
} from '@seat-order/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.resolve(__dirname, '../../../restaurant_state.json');

export interface DatabaseState {
  seats: Seat[];
  seatSessions: SeatSession[];
  menuCategories: MenuCategory[];
  menuItems: MenuItem[];
  orders: Order[];
  payments: Payment[];
  users: StaffUser[];
}

class InDatabase {
  public data: DatabaseState = {
    seats: [],
    seatSessions: [],
    menuCategories: [],
    menuItems: [],
    orders: [],
    payments: [],
    users: [],
  };

  constructor() {
    this.loadState();
  }

  private loadState() {
    if (fs.existsSync(STATE_FILE)) {
      try {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        console.log(`📦 Loaded existing database state from ${STATE_FILE}`);
        return;
      } catch (err) {
        console.warn('⚠️ Could not parse existing state file, initializing fresh seed.');
      }
    }
    this.seed();
  }

  public saveState() {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database state:', err);
    }
  }

  public seed() {
    console.log('🌱 Seeding 100 physical seats, categories, dishes, and staff...');

    // 1. Seed 100 Seats across 5 zones
    const zones: Array<{ name: SeatZone; count: number; prefix: number }> = [
      { name: 'COUNTER_A', count: 20, prefix: 1 },
      { name: 'COUNTER_B', count: 20, prefix: 21 },
      { name: 'BAR', count: 20, prefix: 41 },
      { name: 'WINDOW', count: 20, prefix: 61 },
      { name: 'CENTER', count: 20, prefix: 81 },
    ];

    const seatsList: Seat[] = [];
    let idCounter = 1;
    for (const z of zones) {
      for (let i = 0; i < z.count; i++) {
        const num = z.prefix + i;
        const seatNumber = `S${String(num).padStart(3, '0')}`;
        const epochHash = crypto.randomBytes(8).toString('hex');
        seatsList.push({
          id: idCounter++,
          seatNumber,
          zone: z.name,
          currentStatus: 'VACANT',
          epochHash,
          activeSessionId: null,
          activeOrderTotal: 0,
          activeItemCount: 0,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    this.data.seats = seatsList;

    // 2. Seed Categories
    this.data.menuCategories = [
      { id: 1, name: 'Appetizers & Starters', displayOrder: 1, isActive: true },
      { id: 2, name: 'Gourmet Mains', displayOrder: 2, isActive: true },
      { id: 3, name: 'Craft Beverages & Mocktails', displayOrder: 3, isActive: true },
      { id: 4, name: 'Artisanal Desserts', displayOrder: 4, isActive: true },
    ];

    // 3. Seed Menu Items
    this.data.menuItems = [
      // Starters
      {
        id: 1,
        categoryId: 1,
        name: 'Truffle Parmesan Fries',
        description: 'Hand-cut russet potatoes tossed in white truffle oil, grated aged parmesan, and fresh rosemary.',
        price: 280,
        imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=60',
        dietaryType: 'VEG',
        isAvailable: true,
        preparationTimeMinutes: 8,
      },
      {
        id: 2,
        categoryId: 1,
        name: 'Crispy Garlic Butter Calamari',
        description: 'Tender squid rings flashed in garlic herb butter with charred lemon aioli dipping sauce.',
        price: 420,
        imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=60',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 10,
      },
      {
        id: 3,
        categoryId: 1,
        name: 'Burrata Bruschetta',
        description: 'Toasted sourdough topped with heirloom cherry tomatoes, fresh basil, balsamic reduction, and artisanal burrata.',
        price: 360,
        imageUrl: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=500&auto=format&fit=crop&q=60',
        dietaryType: 'VEG',
        isAvailable: true,
        preparationTimeMinutes: 7,
      },
      {
        id: 4,
        categoryId: 1,
        name: 'Spicy Edamame with Sea Salt',
        description: 'Steamed young soy pods tossed in chili garlic crunch and flaked Maldon sea salt.',
        price: 240,
        imageUrl: 'https://images.unsplash.com/photo-1550461716-dbf266b2a8a7?w=500&auto=format&fit=crop&q=60',
        dietaryType: 'VEGAN',
        isAvailable: true,
        preparationTimeMinutes: 5,
      },

      // Mains
      {
        id: 5,
        categoryId: 2,
        name: 'Signature Wagyu Smash Burger',
        description: 'Double Wagyu smash patties, caramelized onions, smoked cheddar, brioche bun, house burger sauce.',
        price: 650,
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 14,
      },
      {
        id: 6,
        categoryId: 2,
        name: 'Pan-Seared Atlantic Salmon',
        description: 'Crisp-skin salmon filet on a bed of asparagus spears, mashed potatoes, and lemon caper emulsion.',
        price: 780,
        imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop&q=60',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 18,
      },
      {
        id: 7,
        categoryId: 2,
        name: 'Wild Forest Mushroom Risotto',
        description: 'Carnaroli rice slow-simmered in rich vegetable broth with shiitake, porcini, truffle cream, and chives.',
        price: 520,
        imageUrl: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=500&auto=format&fit=crop&q=60',
        dietaryType: 'VEG',
        isAvailable: true,
        preparationTimeMinutes: 15,
      },
      {
        id: 8,
        categoryId: 2,
        name: 'Butter Chicken with Flaky Naan',
        description: 'Tandoori-roasted chicken chunks in velvety spiced tomato butter gravy served with hot garlic naan.',
        price: 490,
        imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop&q=60',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 12,
      },
      {
        id: 9,
        categoryId: 2,
        name: 'Wood-Fired Margherita Pizza',
        description: 'San Marzano tomato base, fresh fior di latte mozzarella, extra virgin olive oil, and organic garden basil.',
        price: 460,
        imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500&auto=format&fit=crop&q=60',
        dietaryType: 'VEG',
        isAvailable: true,
        preparationTimeMinutes: 12,
      },

      // Beverages
      {
        id: 10,
        categoryId: 3,
        name: 'Yuzu Passionfruit Iced Tea',
        description: 'Brewed Ceylon black tea infused with Japanese yuzu juice, fresh passionfruit pulp, and mint.',
        price: 190,
        imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60',
        dietaryType: 'VEGAN',
        isAvailable: true,
        preparationTimeMinutes: 4,
      },
      {
        id: 11,
        categoryId: 3,
        name: 'Matcha Cloud Espresso Latte',
        description: 'Ceremonial grade matcha whipped cream cold foam layered over fresh double espresso and almond milk.',
        price: 240,
        imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=60',
        dietaryType: 'VEGAN',
        isAvailable: true,
        preparationTimeMinutes: 5,
      },
      {
        id: 12,
        categoryId: 3,
        name: 'Smoked Hibiscus Margarita (Mocktail)',
        description: 'Wild hibiscus flower reduction, smoked agave, fresh lime, rimmed with pink Himalayan chili salt.',
        price: 220,
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=60',
        dietaryType: 'VEGAN',
        isAvailable: true,
        preparationTimeMinutes: 4,
      },

      // Desserts
      {
        id: 13,
        categoryId: 4,
        name: '70% Dark Chocolate Lava Cake',
        description: 'Warm Belgian dark chocolate cake with a molten center, accompanied by Madagascar vanilla bean gelato.',
        price: 340,
        imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60',
        dietaryType: 'VEG',
        isAvailable: true,
        preparationTimeMinutes: 10,
      },
      {
        id: 14,
        categoryId: 4,
        name: 'Classic Espresso Tiramisu',
        description: 'Espresso-soaked Savoiardi biscuits layered with light mascarpone mousse and Dutch cocoa dust.',
        price: 320,
        imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=60',
        dietaryType: 'VEG',
        isAvailable: true,
        preparationTimeMinutes: 5,
      },
    ];

    // 4. Seed Staff Users
    this.data.users = [
      { id: 1, name: 'Alex Johnson', role: 'WAITER', assignedZone: 'COUNTER_A', isActive: true },
      { id: 2, name: 'Maya Lin', role: 'WAITER', assignedZone: 'COUNTER_B', isActive: true },
      { id: 3, name: 'Gordon Ramsay', role: 'CHEF', assignedZone: null, isActive: true },
      { id: 4, name: 'David Miller', role: 'MANAGER', assignedZone: null, isActive: true },
    ];

    this.saveState();
    console.log(`✅ Seeded ${this.data.seats.length} seats and ${this.data.menuItems.length} menu items.`);
  }
}

export const db = new InDatabase();
