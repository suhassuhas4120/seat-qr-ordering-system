import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { supabaseSync } from './supabaseSync.js';
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
} from '../shared/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.resolve(__dirname, '../../../restaurant_state.json');
const WAL_FILE = path.resolve(__dirname, '../../../transactions.jsonl');

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

  private isWriting = false;
  private pendingWrite = false;

  constructor() {
    this.loadState();
  }

  private loadState() {
    if (fs.existsSync(STATE_FILE)) {
      try {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        console.log(`📦 Loaded existing database state from ${STATE_FILE}`);
        this.ensureTakeawaySeat();
        return;
      } catch (err) {
        console.warn('⚠️ Could not parse existing state file, initializing fresh seed.');
      }
    }
    this.seed();
  }

  private ensureTakeawaySeat() {
    if (!this.data.seats.some((s) => s.id === 0)) {
      this.data.seats.unshift({
        id: 0,
        seatNumber: 'TK-01',
        zone: 'COUNTER_A',
        currentStatus: 'VACANT',
        epochHash: crypto.randomBytes(8).toString('hex'),
        activeSessionId: null,
        activeOrderTotal: 0,
        activeItemCount: 0,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * High-concurrency atomic state persistence.
   * Writes to a temporary file first, then atomically renames it.
   * Completely eliminates file corruption risks during high-volume rush hours.
   */
  public saveState() {
    if (this.isWriting) {
      this.pendingWrite = true;
      return;
    }

    this.isWriting = true;
    const tempFile = `${STATE_FILE}.${Date.now()}.${Math.random().toString(36).substring(7)}.tmp`;
    const payload = JSON.stringify(this.data, null, 2);

    try {
      fs.writeFileSync(tempFile, payload, 'utf-8');
      fs.renameSync(tempFile, STATE_FILE);
    } catch (err) {
      console.error('Failed to persist database state atomically:', err);
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch {}
    } finally {
      this.isWriting = false;
      if (this.pendingWrite) {
        this.pendingWrite = false;
        this.saveState();
      }
    }
  }

  /**
   * Append-only Write-Ahead Transaction Logger (WAL) + Asynchronous Cloud Mirror.
   * Appends an immutable record of every order, item bump, and payment for 100% financial auditing,
   * and mirrors changes to Supabase PostgreSQL when credentials are configured.
   */
  public logTransaction(type: string, payload: any) {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      type,
      payload,
    }) + '\n';

    try {
      fs.appendFileSync(WAL_FILE, entry, 'utf-8');
    } catch (err) {
      console.error('Failed to append to WAL log:', err);
    }

    // Non-blocking cloud persistence
    try {
      supabaseSync.syncAuditLog(type, payload);

      if (type === 'ORDER_PLACED' && payload.orderId) {
        const order = this.data.orders.find((o) => o.id === payload.orderId);
        if (order) supabaseSync.syncOrder(order);
      } else if (type === 'ITEM_STAGE_BUMPED') {
        supabaseSync.syncItemStage(payload.orderId, payload.itemId, payload.stage);
      } else if (type === 'PAYMENT_SETTLED' && payload.paymentId) {
        const payment = this.data.payments.find((p) => p.id === payload.paymentId);
        if (payment) supabaseSync.syncPayment(payment);
      } else if (type === 'SEAT_CLAIMED' && payload.seatId) {
        const seat = this.data.seats.find((s) => s.id === payload.seatId);
        if (seat) supabaseSync.syncSeat(seat);
      }
    } catch (err) {
      // Cloud backup errors must never disrupt core transaction flow
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
    // 0. Seed Takeaway / Parcel Seat 0
    seatsList.push({
      id: 0,
      seatNumber: 'TK-01',
      zone: 'COUNTER_A',
      currentStatus: 'VACANT',
      epochHash: crypto.randomBytes(8).toString('hex'),
      activeSessionId: null,
      activeOrderTotal: 0,
      activeItemCount: 0,
      updatedAt: new Date().toISOString(),
    });

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
      { id: 1, name: 'Donne Biryani & Rice', displayOrder: 1, isActive: true },
      { id: 2, name: 'Starters & Sides', displayOrder: 2, isActive: true },
      { id: 3, name: 'Sunday Specials & Soups', displayOrder: 3, isActive: true },
    ];

    // 3. Seed Menu Items (Matching authentic Thoogudeepa Donne Biryani Mane menu)
    this.data.menuItems = [
      // Donne Biryani & Rice
      {
        id: 20,
        categoryId: 1,
        name: 'Chicken Biryani',
        description: 'Fragrant Seeraga Samba short-grain rice cooked with tender chicken cuts, fresh mint, coriander, and native green masala.',
        price: 170,
        imageUrl: '/images/dishes/chicken-biryani.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 10,
      },
      {
        id: 22,
        categoryId: 1,
        name: 'Mutton Biryani',
        description: 'Tender country mutton slow-cooked with military hotel spices, fragrant jeera samba rice, and rich bone marrow gravy.',
        price: 280,
        imageUrl: '/images/dishes/mutton-biryani.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 12,
      },
      {
        id: 21,
        categoryId: 1,
        name: 'Biryani Rice',
        description: 'Aromatic Seeraga Samba kushka rice cooked in rich meat stock and fragrant whole spices without meat pieces.',
        price: 90,
        imageUrl: '/images/dishes/biryani-rice.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 5,
      },

      // Starters & Sides
      {
        id: 18,
        categoryId: 2,
        name: 'Chicken Kabab',
        description: 'Crispy deep-fried chicken cubes coated with curd, ginger-garlic paste, and vibrant Indian spices.',
        price: 160,
        imageUrl: '/images/dishes/chicken-kabab.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 8,
      },
      {
        id: 13,
        categoryId: 2,
        name: 'Chicken Fry',
        description: 'Boneless and tender chicken chunks marinated in native spice blend, shallow fried to a golden crisp.',
        price: 160,
        imageUrl: '/images/dishes/chicken-fry.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 10,
      },
      {
        id: 14,
        categoryId: 2,
        name: 'Chicken Pepper Dry',
        description: 'Tender chicken pieces tossed with freshly cracked black pepper, caramelized garlic, and shallots.',
        price: 160,
        imageUrl: '/images/dishes/chicken-pepper-dry.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 10,
      },
      {
        id: 17,
        categoryId: 2,
        name: 'Chilli Chicken',
        description: 'Bite-sized chicken chunks tossed with fiery green chillies, curry leaves, and native seasoning.',
        price: 160,
        imageUrl: '/images/dishes/chilli-chicken.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 10,
      },
      {
        id: 19,
        categoryId: 2,
        name: 'Chicken Chops',
        description: 'Tender chicken cuts slow-simmered in an intensely fragrant green herb and mint-coriander gravy.',
        price: 160,
        imageUrl: '/images/dishes/chicken-chops.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 12,
      },
      {
        id: 15,
        categoryId: 2,
        name: 'Chicken Leg Piece (2pcs)',
        description: 'Two succulent whole chicken drumsticks marinated in aromatic spices and roasted to tenderness.',
        price: 160,
        imageUrl: '/images/dishes/chicken-leg-piece-2pcs.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 12,
      },
      {
        id: 16,
        categoryId: 2,
        name: 'Chicken Leg Piece (1pc)',
        description: 'Single tender whole chicken drumstick seasoned and roasted in traditional military masala.',
        price: 80,
        imageUrl: '/images/dishes/chicken-leg-piece-1pc.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 8,
      },
      {
        id: 7,
        categoryId: 2,
        name: 'Mutton Fry',
        description: 'Tender chunks of fresh country mutton pan-tossed with shallots, crushed spices, and curry leaves.',
        price: 260,
        imageUrl: '/images/dishes/mutton-fry.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 14,
      },
      {
        id: 8,
        categoryId: 2,
        name: 'Mutton Dry',
        description: 'Succulent mutton cuts slow-roasted with black pepper, roasted coriander, and caramelized onions.',
        price: 260,
        imageUrl: '/images/dishes/mutton-dry.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 14,
      },
      {
        id: 9,
        categoryId: 2,
        name: 'Mutton Chops',
        description: 'Juicy rib chops marinated in authentic military green masala and braised to tender perfection.',
        price: 260,
        imageUrl: '/images/dishes/mutton-chops.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 14,
      },
      {
        id: 10,
        categoryId: 2,
        name: 'Mutton Liver',
        description: 'Fresh mutton liver pieces pan-roasted with black peppercorns, browned onions, and curry leaves.',
        price: 240,
        imageUrl: '/images/dishes/mutton-liver.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 10,
      },
      {
        id: 11,
        categoryId: 2,
        name: 'Botti Gujju',
        description: 'Classic Bangalore military hotel goat tripe curry prepared in thick aromatic spice reduction.',
        price: 180,
        imageUrl: '/images/dishes/booti-gojju.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 12,
      },
      {
        id: 12,
        categoryId: 2,
        name: 'Keema Ball',
        description: 'Crispy deep-fried seasoned minced mutton meatballs with aromatic herbs and crunch exterior.',
        price: 180,
        imageUrl: '/images/dishes/keema-ball.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 10,
      },

      // Sunday Specials & Soups
      {
        id: 1,
        categoryId: 3,
        name: 'Kaalu Soup',
        description: 'Traditional military hotel mutton trotter soup slow-simmered with crushed black pepper and bone marrow.',
        price: 120,
        imageUrl: '/images/dishes/kaalu-soup.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 5,
      },
      {
        id: 2,
        categoryId: 3,
        name: 'Plain Soup',
        description: 'Aromatic clear mutton bone broth spiced with peppercorns, garlic, and fresh herbs without trotter cuts.',
        price: 25,
        imageUrl: '/images/dishes/plain-soup.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 3,
      },
      {
        id: 3,
        categoryId: 3,
        name: 'Idli (2pcs)',
        description: 'Ultra-soft, steamed rice cakes served hot on banana leaf, ideal pairing with mutton curries.',
        price: 50,
        imageUrl: '/images/dishes/idli-2pcs.webp',
        dietaryType: 'VEG',
        isAvailable: true,
        preparationTimeMinutes: 4,
      },
      {
        id: 4,
        categoryId: 3,
        name: 'Dosa (2pcs)',
        description: 'Soft, golden spongy set dosas cooked to perfection on an iron tawa, served hot.',
        price: 50,
        imageUrl: '/images/dishes/dosa-2pcs.webp',
        dietaryType: 'VEG',
        isAvailable: true,
        preparationTimeMinutes: 6,
      },
      {
        id: 5,
        categoryId: 3,
        name: 'Booti Gojju',
        description: 'Tender diced mutton tripe simmered in a dark, rich, highly spiced military hotel onion-coconut masala gravy.',
        price: 180,
        imageUrl: '/images/dishes/booti-gojju.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 10,
      },
      {
        id: 6,
        categoryId: 3,
        name: 'Keema Gojju',
        description: 'Fine minced mutton simmered into a deeply flavored rustic gravy with ground spices and fresh mint.',
        price: 180,
        imageUrl: '/images/dishes/keema-gojju.webp',
        dietaryType: 'NON_VEG',
        isAvailable: true,
        preparationTimeMinutes: 10,
      },
    ];

    // 4. Seed Physical Operation Staff (6 Waiters, 1 Kitchen KDS Chef, 1 Floor Manager)
    this.data.users = [
      { id: 1, name: 'Alex Johnson', role: 'WAITER', assignedZone: 'COUNTER_A', isActive: true },
      { id: 2, name: 'Maya Lin', role: 'WAITER', assignedZone: 'COUNTER_B', isActive: true },
      { id: 3, name: 'Ramesh Kumar', role: 'WAITER', assignedZone: 'BAR', isActive: true },
      { id: 4, name: 'Suresh M', role: 'WAITER', assignedZone: 'WINDOW', isActive: true },
      { id: 5, name: 'Anand Kumar', role: 'WAITER', assignedZone: 'CENTER', isActive: true },
      { id: 6, name: 'Deepa Naik', role: 'WAITER', assignedZone: null, isActive: true },
      { id: 7, name: 'Head Chef Gordon', role: 'CHEF', assignedZone: null, isActive: true },
      { id: 8, name: 'Manjunath (General Manager)', role: 'MANAGER', assignedZone: null, isActive: true },
    ];

    this.saveState();
    console.log(`✅ Seeded ${this.data.seats.length} seats and ${this.data.menuItems.length} menu items.`);
  }
}

export const db = new InDatabase();
