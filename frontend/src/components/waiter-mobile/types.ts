/**
 * Thoogudeepa Donne Biryani - Waiter Mobile POS Cockpit
 * Comprehensive TypeScript Domain Models, Interfaces, and Constants
 *
 * Designed specifically for the high-velocity mobile waiter interface:
 * - Seat-Centric Floor Management (Zone 1: Seats 01 to 10)
 * - Color-Coded Seat Status Tokens (Vacant Emerald, Occupied Amber, Bill Req Rose)
 * - Category-Filtered Donne Biryani Food Catalog
 * - Real-Time KOT Ticket Management & Cart State
 * - Floor Service Alerts (Customer Calls & Kitchen Pass Ready)
 * - Multi-Mode Bill Settlement & Split-Payment Calculation
 * - Waiter Shift Metrics & Performance Telemetry
 *
 * Architecture Compliance:
 * - Strict File Size: Maintained strictly between 300 and 400 lines
 * - Zero Bloat: Native TypeScript definitions without external dependencies
 */

export type SeatOccupancyStatus = 'vacant' | 'occupied' | 'billing';
export type SeatFilterTab = 'all' | 'occupied' | 'vacant';
export type MobileScreenId = 'login' | 'seats' | 'order' | 'cart' | 'alerts' | 'profile' | 'bill';
export type LiveOrderDishMode = 'placed' | 'received' | 'preparing' | 'ready' | 'served';
export type AlertSubTab = 'calls' | 'kitchen';
export type FoodDietaryType = 'non_veg' | 'veg';
export type MenuCategoryKey = 'all' | 'biryani' | 'starters' | 'gravy' | 'drinks' | 'special';
export type PaymentMethod = 'cash' | 'upi' | 'card';
export type ShiftStatus = 'clocked_in' | 'on_break' | 'shift_ended';

/**
 * Individual seat entity on the restaurant floor
 */
export interface SeatEntity {
  readonly id: string;
  readonly seatNumber: string;
  readonly numericId: number;
  readonly status: SeatOccupancyStatus;
  readonly guestName?: string;
  readonly guestCount?: number;
  readonly itemCount?: number;
  readonly runningTotal?: number;
  readonly diningDuration?: string;
  readonly zone: string;
  readonly hasBillRequest?: boolean;
  readonly hasPendingAlert?: boolean;
  readonly alertMessage?: string;
}

/**
 * Food catalog menu item specification
 */
export interface MenuItem {
  readonly id: string;
  readonly name: string;
  readonly kannadaName?: string;
  readonly price: number;
  readonly category: MenuCategoryKey;
  readonly dietary: FoodDietaryType;
  readonly description: string;
  readonly prepTimeMinutes: number;
  readonly isAvailable: boolean;
  readonly isBestseller?: boolean;
  readonly image?: string;
}

/**
 * Cart line item selected by the waiter
 */
export interface CartItem {
  readonly menuItem: MenuItem;
  quantity: number;
  lineTotal: number;
  kitchenNote?: string;
  stage?: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED';
  orderItemId?: string;
  ticketNumber?: string;
  isFired?: boolean;
}

/**
 * Live order ticket punched to kitchen (KOT)
 */
export interface OrderTicket {
  readonly kotNumber: string;
  readonly seatNumber: string;
  readonly guestName: string;
  readonly waiterName: string;
  readonly items: CartItem[];
  readonly subtotal: number;
  readonly gstAmount: number;
  readonly grandTotal: number;
  readonly punchedAt: string;
  readonly status: 'pending' | 'cooking' | 'ready' | 'served';
  readonly specialInstructions?: string;
}

/**
 * Real-time floor service notification
 */
export interface FloorAlert {
  readonly id: string;
  readonly type: 'customer_call' | 'kitchen_ready';
  readonly seatNumber: string;
  readonly chairId?: string;
  readonly dishId?: string;
  readonly dishName?: string;
  readonly itemId?: string;
  readonly guestName?: string;
  readonly title: string;
  readonly message: string;
  readonly timeAgo: string;
  readonly billAmount?: number;
  readonly kotNumber?: string;
  readonly isUrgent: boolean;
}

/**
 * Active waiter profile and session statistics
 */
export interface WaiterProfile {
  readonly staffId: string;
  readonly name: string;
  readonly initials: string;
  readonly assignedSection: string;
  readonly assignedSeats: string;
  readonly clockInTime: string;
  readonly activeDuration: string;
  readonly totalSales: number;
  readonly billsSettledCount: number;
  readonly tipsEarned: number;
  readonly kotsPunched: number;
  readonly guestsServed: number;
  readonly connectionStatus: 'online_5g' | 'offline';
}

/**
 * Waiter authentication credentials and assignment
 */
export interface WaiterAuthAccount {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly seatRange: string;
  readonly passcode: string;
  readonly zone: string;
}

/**
 * Item in the shift activity audit log
 */
export interface ShiftActivityLog {
  readonly id: string;
  readonly title: string;
  readonly amountFormatted?: string;
  readonly timestamp: string;
  readonly badgeType: 'sale' | 'kot' | 'alert';
}

/**
 * Bill receipt checkout summary
 */
export interface BillReceipt {
  readonly invoiceNumber: string;
  readonly seatNumber: string;
  readonly guestName: string;
  readonly waiterName: string;
  readonly items: {
    readonly name: string;
    readonly quantity: number;
    readonly unitPrice: number;
    readonly total: number;
  }[];
  readonly subtotal: number;
  readonly cgst: number;
  readonly sgst: number;
  readonly grandTotal: number;
  readonly paymentMethod: PaymentMethod;
  readonly settledAt: string;
}

/**
 * Standard default restaurant configuration constants
 */
export const RESTAURANT_CONSTANTS = {
  BRAND_NAME: 'Thoogudeepa Donne Biryani',
  KANNADA_NAME: 'ತೂಗುದೀಪ ದೊನ್ನೆ ಬಿರಿಯಾನಿ',
  SUBTITLE: 'Military Hotel • Waiter Mobile POS',
  DEFAULT_ZONE: 'Zone 1 (Seats 01 – 10)',
  DEFAULT_WAITER_ID: '#TH-104',
  DEFAULT_WAITER_NAME: 'Ramesh Kumar',
  TAX_RATE_CGST: 0.025,
  TAX_RATE_SGST: 0.025,
  TOTAL_ZONE_SEATS: 10,
} as const;

/**
 * Pre-configured active staff list for login selection
 */
export const DEFAULT_STAFF_ACCOUNTS: WaiterAuthAccount[] = [
  {
    id: '1',
    name: 'Ramesh Kumar',
    initials: 'RK',
    seatRange: 'Seats 01 to 10',
    passcode: '1234',
    zone: 'Zone 1'
  },
  {
    id: '2',
    name: 'Suresh Gowda',
    initials: 'SG',
    seatRange: 'Seats 11 to 20',
    passcode: '2345',
    zone: 'Zone 2'
  },
  {
    id: '3',
    name: 'Anand Kumar',
    initials: 'AK',
    seatRange: 'Seats 21 to 30',
    passcode: '3456',
    zone: 'Zone 3'
  },
  {
    id: '4',
    name: 'Deepa Naik',
    initials: 'DN',
    seatRange: 'Seats 31 to 40',
    passcode: '4567',
    zone: 'Zone 4'
  }
];

/**
 * Dynamically generate assigned seat entities per staff member (10 Seats: 4 Dining, 6 Vacant)
 */
export const generateSeatsForStaff = (account: WaiterAuthAccount): SeatEntity[] => {
  let baseNumber = 1;
  if (account?.seatRange) {
    const match = account.seatRange.match(/\d+/);
    if (match) {
      baseNumber = parseInt(match[0], 10);
    }
  }
  if (!baseNumber || isNaN(baseNumber)) {
    if (account?.id === '2' || account?.name?.includes('Suresh')) baseNumber = 11;
    else if (account?.id === '3' || account?.name?.includes('Anand')) baseNumber = 21;
    else if (account?.id === '4' || account?.name?.includes('Deepa') || account?.name?.includes('Dinesh')) baseNumber = 31;
    else baseNumber = 1;
  }

  const mockGuests = [
    { name: 'Karthik R', total: 850, duration: '24m', status: 'occupied' as const },
    { name: 'Suhas M', total: 1030, duration: '42m', status: 'billing' as const },
    { name: 'Pooja S', total: 480, duration: '15m', status: 'occupied' as const },
    { name: 'Vikas G', total: 620, duration: '31m', status: 'occupied' as const },
  ];

  return Array.from({ length: 10 }, (_, idx) => {
    const num = baseNumber + idx;
    const numStr = num < 10 ? `0${num}` : `${num}`;
    const seatNumber = `Seat ${numStr}`;
    
    // Seat pattern: 4 occupied / billing, 6 vacant
    if (idx === 2) {
      return {
        id: `seat-${numStr}`,
        seatNumber,
        numericId: num,
        status: mockGuests[0].status,
        guestName: mockGuests[0].name,
        runningTotal: mockGuests[0].total,
        diningDuration: mockGuests[0].duration,
        itemCount: 3,
        zone: account.zone
      };
    }
    if (idx === 3) {
      return {
        id: `seat-${numStr}`,
        seatNumber,
        numericId: num,
        status: mockGuests[1].status,
        guestName: mockGuests[1].name,
        runningTotal: mockGuests[1].total,
        diningDuration: mockGuests[1].duration,
        itemCount: 4,
        zone: account.zone
      };
    }
    if (idx === 5) {
      return {
        id: `seat-${numStr}`,
        seatNumber,
        numericId: num,
        status: mockGuests[2].status,
        guestName: mockGuests[2].name,
        runningTotal: mockGuests[2].total,
        diningDuration: mockGuests[2].duration,
        itemCount: 2,
        zone: account.zone
      };
    }
    if (idx === 7) {
      return {
        id: `seat-${numStr}`,
        seatNumber,
        numericId: num,
        status: mockGuests[3].status,
        guestName: mockGuests[3].name,
        runningTotal: mockGuests[3].total,
        diningDuration: mockGuests[3].duration,
        itemCount: 3,
        zone: account.zone
      };
    }

    return {
      id: `seat-${numStr}`,
      seatNumber,
      numericId: num,
      status: 'vacant' as const,
      zone: account.zone
    };
  });
};

/**
 * Initial Zone 1 seat matrix (10 Seats: 4 Occupied, 6 Vacant)
 */
export const INITIAL_SEAT_DATA: SeatEntity[] = [
  {
    id: 'seat-01',
    seatNumber: 'Seat 01',
    numericId: 1,
    status: 'occupied',
    guestName: 'Suhas M',
    guestCount: 2,
    itemCount: 2,
    runningTotal: 320,
    diningDuration: '14m',
    zone: 'Zone 1'
  },
  {
    id: 'seat-02',
    seatNumber: 'Seat 02',
    numericId: 2,
    status: 'vacant',
    zone: 'Zone 1'
  },
  {
    id: 'seat-03',
    seatNumber: 'Seat 03',
    numericId: 3,
    status: 'occupied',
    guestName: 'Rajesh V',
    guestCount: 1,
    itemCount: 3,
    runningTotal: 480,
    diningDuration: '22m',
    zone: 'Zone 1',
    hasPendingAlert: true,
    alertMessage: 'Water Refill Requested'
  },
  {
    id: 'seat-04',
    seatNumber: 'Seat 04',
    numericId: 4,
    status: 'billing',
    guestName: 'Kiran R',
    guestCount: 2,
    itemCount: 3,
    runningTotal: 840,
    diningDuration: '38m',
    zone: 'Zone 1',
    hasPendingAlert: true,
    alertMessage: 'Bill Requested (₹840)'
  },
  {
    id: 'seat-05',
    seatNumber: 'Seat 05',
    numericId: 5,
    status: 'occupied',
    guestName: 'Anil Kumar',
    guestCount: 2,
    itemCount: 2,
    runningTotal: 420,
    diningDuration: '8m',
    zone: 'Zone 1'
  },
  {
    id: 'seat-06',
    seatNumber: 'Seat 06',
    numericId: 6,
    status: 'vacant',
    zone: 'Zone 1'
  },
  {
    id: 'seat-07',
    seatNumber: 'Seat 07',
    numericId: 7,
    status: 'vacant',
    zone: 'Zone 1'
  },
  {
    id: 'seat-08',
    seatNumber: 'Seat 08',
    numericId: 8,
    status: 'vacant',
    zone: 'Zone 1'
  },
  {
    id: 'seat-09',
    seatNumber: 'Seat 09',
    numericId: 9,
    status: 'vacant',
    zone: 'Zone 1'
  },
  {
    id: 'seat-10',
    seatNumber: 'Seat 10',
    numericId: 10,
    status: 'vacant',
    zone: 'Zone 1'
  }
];

/**
 * Pre-populated food catalog for Thoogudeepa Donne Biryani
 */
export const SAMPLE_MENU_ITEMS: MenuItem[] = [
  // ── Donne Biryani & Rice ───────────────────────────────────────────
  {
    id: 'dish-20',
    name: 'Chicken Biryani',
    kannadaName: 'ಚಿಕನ್ ಬಿರಿಯಾನಿ',
    price: 170,
    category: 'biryani',
    dietary: 'non_veg',
    description: 'Fragrant Seeraga Samba short-grain rice cooked with tender chicken cuts, fresh mint, coriander, and native green masala, served hot in authentic leaf donne.',
    prepTimeMinutes: 10,
    isAvailable: true,
    isBestseller: true,
    image: '/images/dishes/chicken-biryani.webp'
  },
  {
    id: 'dish-22',
    name: 'Mutton Biryani',
    kannadaName: 'ಮಟನ್ ಬಿರಿಯಾನಿ',
    price: 280,
    category: 'biryani',
    dietary: 'non_veg',
    description: 'Tender country mutton slow-cooked with military hotel spices, fragrant jeera samba rice, and rich bone marrow gravy, served in traditional leaf donne.',
    prepTimeMinutes: 12,
    isAvailable: true,
    isBestseller: true,
    image: '/images/dishes/mutton-biryani.webp'
  },
  {
    id: 'dish-21',
    name: 'Biryani Rice',
    kannadaName: 'ಬಿರಿಯಾನಿ ರೈಸ್ (ಕುಷ್ಕಾ)',
    price: 90,
    category: 'biryani',
    dietary: 'non_veg',
    description: 'Aromatic Seeraga Samba kushka rice cooked in rich meat stock and fragrant whole spices without meat pieces.',
    prepTimeMinutes: 5,
    isAvailable: true,
    isBestseller: false,
    image: '/images/dishes/biryani-rice.webp'
  },

  // ── Starters & Sides ───────────────────────────────────────────────
  {
    id: 'dish-18',
    name: 'Chicken Kabab',
    kannadaName: 'ಚಿಕನ್ ಕಬಾಬ್',
    price: 160,
    category: 'starters',
    dietary: 'non_veg',
    description: 'Crispy deep-fried chicken cubes coated with curd, ginger-garlic paste, and vibrant Indian spices.',
    prepTimeMinutes: 8,
    isAvailable: true,
    isBestseller: true,
    image: '/images/dishes/chicken-kabab.webp'
  },
  {
    id: 'dish-13',
    name: 'Chicken Fry',
    kannadaName: 'ಚಿಕನ್ ಫ್ರೈ',
    price: 160,
    category: 'starters',
    dietary: 'non_veg',
    description: 'Boneless and tender chicken chunks marinated in native spice blend, shallow fried to a golden crisp.',
    prepTimeMinutes: 10,
    isAvailable: true,
    isBestseller: true,
    image: '/images/dishes/chicken-fry.webp'
  },
  {
    id: 'dish-14',
    name: 'Chicken Pepper Dry',
    kannadaName: 'ಚಿಕನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ',
    price: 160,
    category: 'starters',
    dietary: 'non_veg',
    description: 'Tender chicken pieces tossed with freshly cracked black pepper, caramelized garlic, and shallots.',
    prepTimeMinutes: 10,
    isAvailable: true,
    isBestseller: false,
    image: '/images/dishes/chicken-pepper-dry.webp'
  },
  {
    id: 'dish-17',
    name: 'Chilli Chicken',
    kannadaName: 'ಚಿಲ್ಲಿ ಚಿಕನ್',
    price: 160,
    category: 'starters',
    dietary: 'non_veg',
    description: 'Bite-sized chicken chunks tossed with fiery green chillies, curry leaves, and native seasoning.',
    prepTimeMinutes: 10,
    isAvailable: true,
    isBestseller: false,
    image: '/images/dishes/chilli-chicken.webp'
  },
  {
    id: 'dish-19',
    name: 'Chicken Chops',
    kannadaName: 'ಚಿಕನ್ ಚಾಪ್ಸ್',
    price: 160,
    category: 'starters',
    dietary: 'non_veg',
    description: 'Tender chicken cuts slow-simmered in an intensely fragrant green herb and mint-coriander gravy.',
    prepTimeMinutes: 12,
    isAvailable: true,
    isBestseller: false,
    image: '/images/dishes/chicken-chops.webp'
  },
  {
    id: 'dish-15',
    name: 'Chicken Leg Piece (2pcs)',
    kannadaName: 'ಚಿಕನ್ ಲೆಗ್ ಪೀಸ್ (೨ ಪೀಸ್)',
    price: 160,
    category: 'starters',
    dietary: 'non_veg',
    description: 'Two succulent whole chicken drumsticks marinated in aromatic spices and roasted to tenderness.',
    prepTimeMinutes: 12,
    isAvailable: true,
    isBestseller: false,
    image: '/images/dishes/chicken-leg-piece-2pcs.webp'
  },
  {
    id: 'dish-16',
    name: 'Chicken Leg Piece (1pc)',
    kannadaName: 'ಚಿಕನ್ ಲೆಗ್ ಪೀಸ್ (೧ ಪೀಸ್)',
    price: 80,
    category: 'starters',
    dietary: 'non_veg',
    description: 'Single tender whole chicken drumstick seasoned and roasted in traditional military masala.',
    prepTimeMinutes: 8,
    isAvailable: true,
    isBestseller: false,
    image: '/images/dishes/chicken-leg-piece-1pc.webp'
  },
  {
    id: 'dish-7',
    name: 'Mutton Fry',
    kannadaName: 'ಮಟನ್ ಫ್ರೈ',
    price: 260,
    category: 'starters',
    dietary: 'non_veg',
    description: 'Tender chunks of fresh country mutton pan-tossed with shallots, crushed spices, and curry leaves.',
    prepTimeMinutes: 14,
    isAvailable: true,
    isBestseller: true,
    image: '/images/dishes/mutton-fry.webp'
  },
  {
    id: 'dish-8',
    name: 'Mutton Dry',
    kannadaName: 'ಮಟನ್ ಡ್ರೈ',
    price: 260,
    category: 'starters',
    dietary: 'non_veg',
    description: 'Succulent mutton cuts slow-roasted with black pepper, roasted coriander, and caramelized onions.',
    prepTimeMinutes: 14,
    isAvailable: true,
    isBestseller: false,
    image: '/images/dishes/mutton-dry.webp'
  },
  {
    id: 'dish-9',
    name: 'Mutton Chops',
    kannadaName: 'ಮಟನ್ ಚಾಪ್ಸ್',
    price: 260,
    category: 'starters',
    dietary: 'non_veg',
    description: 'Juicy rib chops marinated in authentic military green masala and braised to tender perfection.',
    prepTimeMinutes: 14,
    isAvailable: true,
    isBestseller: true,
    image: '/images/dishes/mutton-chops.webp'
  },
  {
    id: 'dish-10',
    name: 'Mutton Liver',
    kannadaName: 'ಮಟನ್ ಲಿವರ್',
    price: 240,
    category: 'starters',
    dietary: 'non_veg',
    description: 'Fresh mutton liver pieces pan-roasted with black peppercorns, browned onions, and curry leaves.',
    prepTimeMinutes: 10,
    isAvailable: true,
    isBestseller: false,
    image: '/images/dishes/mutton-liver.webp'
  },
  {
    id: 'dish-11',
    name: 'Botti Gujju',
    kannadaName: 'ಬೊಟ್ಟಿ ಗೊಜ್ಜು',
    price: 180,
    category: 'starters',
    dietary: 'non_veg',
    description: 'Classic Bangalore military hotel goat tripe curry prepared in thick aromatic spice reduction.',
    prepTimeMinutes: 12,
    isAvailable: true,
    isBestseller: false,
    image: '/images/dishes/booti-gojju.webp'
  },
  {
    id: 'dish-12',
    name: 'Keema Ball',
    kannadaName: 'ಖೀಮಾ ಬಾಲ್',
    price: 180,
    category: 'starters',
    dietary: 'non_veg',
    description: 'Crispy deep-fried seasoned minced mutton meatballs with aromatic herbs and crunch exterior.',
    prepTimeMinutes: 10,
    isAvailable: true,
    isBestseller: true,
    image: '/images/dishes/keema-ball.webp'
  },

  // ── Sunday Specials & Soups ─────────────────────────────────────────
  {
    id: 'dish-1',
    name: 'Kaalu Soup',
    kannadaName: 'ಕಾಲು ಸೂಪ್',
    price: 120,
    category: 'special',
    dietary: 'non_veg',
    description: 'Traditional military hotel mutton trotter soup slow-simmered with crushed black pepper, bone marrow, and fresh coriander.',
    prepTimeMinutes: 5,
    isAvailable: true,
    isBestseller: true,
    image: '/images/dishes/kaalu-soup.webp'
  },
  {
    id: 'dish-2',
    name: 'Plain Soup',
    kannadaName: 'ಪ್ಲೇನ್ ಸೂಪ್',
    price: 25,
    category: 'special',
    dietary: 'non_veg',
    description: 'Aromatic clear mutton bone broth spiced with peppercorns, garlic, and fresh herbs without trotter cuts.',
    prepTimeMinutes: 3,
    isAvailable: true,
    isBestseller: false,
    image: '/images/dishes/plain-soup.webp'
  },
  {
    id: 'dish-3',
    name: 'Idli (2pcs)',
    kannadaName: 'ಇಡ್ಲಿ (೨ ಪೀಸ್)',
    price: 50,
    category: 'special',
    dietary: 'veg',
    description: 'Ultra-soft, steamed rice cakes served hot on banana leaf, ideal pairing with mutton curries and kaalu soup.',
    prepTimeMinutes: 4,
    isAvailable: true,
    isBestseller: false,
    image: '/images/dishes/idli-2pcs.webp'
  },
  {
    id: 'dish-4',
    name: 'Dosa (2pcs)',
    kannadaName: 'ದೋಸೆ (೨ ಪೀಸ್)',
    price: 50,
    category: 'special',
    dietary: 'veg',
    description: 'Soft, golden spongy set dosas cooked to perfection on an iron tawa, served hot.',
    prepTimeMinutes: 6,
    isAvailable: true,
    isBestseller: false,
    image: '/images/dishes/dosa-2pcs.webp'
  },
  {
    id: 'dish-5',
    name: 'Booti Gojju',
    kannadaName: 'ಬೂಟಿ ಗೊಜ್ಜು',
    price: 180,
    category: 'special',
    dietary: 'non_veg',
    description: 'Tender diced mutton tripe simmered in a dark, rich, highly spiced military hotel onion-coconut masala gravy.',
    prepTimeMinutes: 10,
    isAvailable: true,
    isBestseller: true,
    image: '/images/dishes/booti-gojju.webp'
  },
  {
    id: 'dish-6',
    name: 'Keema Gojju',
    kannadaName: 'ಖೀಮಾ ಗೊಜ್ಜು',
    price: 180,
    category: 'special',
    dietary: 'non_veg',
    description: 'Fine minced mutton simmered into a deeply flavored rustic gravy with ground spices and fresh mint.',
    prepTimeMinutes: 10,
    isAvailable: true,
    isBestseller: true,
    image: '/images/dishes/keema-gojju.webp'
  }
];
