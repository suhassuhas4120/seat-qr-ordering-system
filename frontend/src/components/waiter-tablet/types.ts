// Thoogudeepa Waiter Tablet POS - Types & Data Models
// Comprehensive type definitions and mock state data

export type ScreenId = 'login' | 'seats' | 'order' | 'profile';
export type SeatStatus = 'occupied' | 'vacant';
export type KitchenStatus = 'PLACED' | 'RECEIVED' | 'PREPARING' | 'READY' | 'SERVED';
export type PaymentMode = 'cash' | 'upi';
export type AlertType = 'customer' | 'kitchen';

export interface WaiterProfile {
  id: string;
  name: string;
  role: string;
  staffId: string;
  assignedZone: string;
  clockInTime: string;
  shiftDuration: string;
  avatarInitials?: string;
  shiftStartTime?: string;
  metrics: {
    totalSales: number;
    billsSettled: number;
    tipsEarned: number;
    kotsPunched: number;
    guestsServed: number;
  };
}

export interface SeatItem {
  id: string;
  seatNumber: string;
  status: SeatStatus;
  guestName: string;
  guestCount: number;
  diningTime: string;
  orderCount: number;
  totalAmount: number;
  hasBillRequest?: boolean;
}

export interface DishItem {
  id: number;
  name: string;
  category: 'biryani' | 'starters' | 'gravy' | 'drinks' | 'special';
  price: number;
  description: string;
  imageUrl: string;
  isVeg: boolean;
}

export interface TicketItem {
  id: number;
  orderItemId?: string;
  ticketNumber?: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl: string;
  status: KitchenStatus;
  isPunched?: boolean;
}

export interface ServiceAlert {
  id: string;
  type: AlertType;
  seatNumber: string;
  chairId?: string;
  dishId?: string;
  dishName?: string;
  itemId?: string;
  guestName: string;
  title: string;
  description: string;
  timeAgo: string;
  amount?: number;
  kotId?: string;
  isResolved: boolean;
}

export interface WaiterOption {
  id: string;
  name: string;
  role: string;
  pinCode: string;
  assignedZone?: string;
}

export const DEFAULT_WAITERS: WaiterOption[] = [
  { id: 'w1', name: 'Ramesh Kumar', role: 'Zone 1 Lead', pinCode: '1234', assignedZone: 'Zone 1 (Seats 01-10)' },
  { id: 'w2', name: 'Suresh M', role: 'Zone 2 Floor', pinCode: '1234', assignedZone: 'Zone 2 (Seats 11-20)' },
  { id: 'w3', name: 'Anand Kumar', role: 'Zone 3 Floor', pinCode: '1234', assignedZone: 'Zone 3 (Seats 21-30)' },
  { id: 'w4', name: 'Deepa Naik', role: 'Zone 4 Floor', pinCode: '1234', assignedZone: 'Zone 4 (Seats 31-40)' }
];

export interface ShiftActivity {
  id: string;
  title?: string;
  description?: string;
  action?: string;
  amount?: string;
  time?: string;
  timestamp?: string;
}

// Initial Mock Data Store
export const INITIAL_WAITER_PROFILE: WaiterProfile = {
  id: 'w1',
  name: 'Ramesh Kumar',
  role: 'Zone 1 Lead',
  staffId: '#TH-104',
  assignedZone: 'Zone 1 (Seats 01-10)',
  clockInTime: '11:00 AM',
  shiftDuration: '3h 45m',
  avatarInitials: 'RK',
  shiftStartTime: '11:00 AM',
  metrics: {
    totalSales: 14850,
    billsSettled: 18,
    tipsEarned: 620,
    kotsPunched: 28,
    guestsServed: 42
  }
};

/**
 * Dynamically returns 10 seats for the selected waiter:
 * - Ramesh Kumar: Seats 01 - 10 (Zone 1)
 * - Suresh M: Seats 11 - 20 (Zone 2)
 * - Anand Kumar: Seats 21 - 30 (Zone 3)
 * - Deepa Naik: Seats 31 - 40 (Zone 4)
 */
export const getSeatsForWaiter = (waiterId: string): SeatItem[] => {
  switch (waiterId) {
    case 'w2': // Suresh M (Seats 11 to 20)
      return [
        { id: 's11', seatNumber: 'Seat 11', status: 'occupied', guestName: 'Manoj Gowda', guestCount: 2, diningTime: '15m', orderCount: 2, totalAmount: 380 },
        { id: 's12', seatNumber: 'Seat 12', status: 'vacant', guestName: 'Walk-In Guest', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's13', seatNumber: 'Seat 13', status: 'occupied', guestName: 'Pooja Hegde', guestCount: 3, diningTime: '22m', orderCount: 3, totalAmount: 590 },
        { id: 's14', seatNumber: 'Seat 14', status: 'occupied', guestName: 'Harish Kumar', guestCount: 4, diningTime: '41m', orderCount: 4, totalAmount: 960, hasBillRequest: true },
        { id: 's15', seatNumber: 'Seat 15', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's16', seatNumber: 'Seat 16', status: 'occupied', guestName: 'Vinay Prasad', guestCount: 2, diningTime: '28m', orderCount: 2, totalAmount: 450 },
        { id: 's17', seatNumber: 'Seat 17', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's18', seatNumber: 'Seat 18', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's19', seatNumber: 'Seat 19', status: 'occupied', guestName: 'Tejas K', guestCount: 1, diningTime: '10m', orderCount: 1, totalAmount: 260 },
        { id: 's20', seatNumber: 'Seat 20', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 }
      ];

    case 'w3': // Anand Kumar (Seats 21 to 30)
      return [
        { id: 's21', seatNumber: 'Seat 21', status: 'occupied', guestName: 'Girish Reddy', guestCount: 4, diningTime: '30m', orderCount: 4, totalAmount: 890 },
        { id: 's22', seatNumber: 'Seat 22', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's23', seatNumber: 'Seat 23', status: 'occupied', guestName: 'Sanjay Patel', guestCount: 2, diningTime: '19m', orderCount: 2, totalAmount: 420 },
        { id: 's24', seatNumber: 'Seat 24', status: 'occupied', guestName: 'Naveen Kumar', guestCount: 3, diningTime: '35m', orderCount: 3, totalAmount: 680, hasBillRequest: true },
        { id: 's25', seatNumber: 'Seat 25', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's26', seatNumber: 'Seat 26', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's27', seatNumber: 'Seat 27', status: 'occupied', guestName: 'Rohit Shenoy', guestCount: 2, diningTime: '25m', orderCount: 2, totalAmount: 510 },
        { id: 's28', seatNumber: 'Seat 28', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's29', seatNumber: 'Seat 29', status: 'occupied', guestName: 'Arun Murthy', guestCount: 3, diningTime: '14m', orderCount: 2, totalAmount: 390 },
        { id: 's30', seatNumber: 'Seat 30', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 }
      ];

    case 'w4': // Deepa Naik (Seats 31 to 40)
      return [
        { id: 's31', seatNumber: 'Seat 31', status: 'occupied', guestName: 'Chetan B', guestCount: 2, diningTime: '20m', orderCount: 2, totalAmount: 350 },
        { id: 's32', seatNumber: 'Seat 32', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's33', seatNumber: 'Seat 33', status: 'occupied', guestName: 'Sunil Joshi', guestCount: 4, diningTime: '45m', orderCount: 5, totalAmount: 1120, hasBillRequest: true },
        { id: 's34', seatNumber: 'Seat 34', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's35', seatNumber: 'Seat 35', status: 'occupied', guestName: 'Divya Shankar', guestCount: 2, diningTime: '16m', orderCount: 2, totalAmount: 440 },
        { id: 's36', seatNumber: 'Seat 36', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's37', seatNumber: 'Seat 37', status: 'occupied', guestName: 'Praveen Nayak', guestCount: 3, diningTime: '27m', orderCount: 3, totalAmount: 620 },
        { id: 's38', seatNumber: 'Seat 38', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's39', seatNumber: 'Seat 39', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's40', seatNumber: 'Seat 40', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 }
      ];

    case 'w1': // Ramesh Kumar (Seats 01 to 10)
    default:
      return [
        { id: 's01', seatNumber: 'Seat 01', status: 'occupied', guestName: 'Suhas M', guestCount: 2, diningTime: '24m', orderCount: 2, totalAmount: 320 },
        { id: 's02', seatNumber: 'Seat 02', status: 'vacant', guestName: 'Walk-In Guest', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's03', seatNumber: 'Seat 03', status: 'occupied', guestName: 'Rajesh V', guestCount: 3, diningTime: '18m', orderCount: 3, totalAmount: 480 },
        { id: 's04', seatNumber: 'Seat 04', status: 'occupied', guestName: 'Kiran R', guestCount: 4, diningTime: '38m', orderCount: 3, totalAmount: 840, hasBillRequest: true },
        { id: 's05', seatNumber: 'Seat 05', status: 'occupied', guestName: 'Darshan Gowda', guestCount: 2, diningTime: '32m', orderCount: 4, totalAmount: 740 },
        { id: 's06', seatNumber: 'Seat 06', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's07', seatNumber: 'Seat 07', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's08', seatNumber: 'Seat 08', status: 'occupied', guestName: 'Vikram Rao', guestCount: 2, diningTime: '12m', orderCount: 2, totalAmount: 410 },
        { id: 's09', seatNumber: 'Seat 09', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 },
        { id: 's10', seatNumber: 'Seat 10', status: 'vacant', guestName: 'Available', guestCount: 0, diningTime: 'Ready', orderCount: 0, totalAmount: 0 }
      ];
  }
};

export const INITIAL_SEATS: SeatItem[] = getSeatsForWaiter('w1');

export const MENU_DISHES: DishItem[] = [
  // ── Donne Biryani & Rice ───────────────────────────────────────────
  {
    id: 20,
    name: 'Chicken Biryani',
    category: 'biryani',
    price: 170,
    description: 'Fragrant Seeraga Samba short-grain rice cooked with tender chicken cuts, fresh mint, coriander, and native green masala, served hot in authentic leaf donne.',
    imageUrl: '/images/dishes/chicken-biryani.webp',
    isVeg: false
  },
  {
    id: 22,
    name: 'Mutton Biryani',
    category: 'biryani',
    price: 280,
    description: 'Tender country mutton slow-cooked with military hotel spices, fragrant jeera samba rice, and rich bone marrow gravy, served in traditional leaf donne.',
    imageUrl: '/images/dishes/mutton-biryani.webp',
    isVeg: false
  },
  {
    id: 21,
    name: 'Biryani Rice',
    category: 'biryani',
    price: 90,
    description: 'Aromatic Seeraga Samba kushka rice cooked in rich meat stock and fragrant whole spices without meat pieces.',
    imageUrl: '/images/dishes/biryani-rice.webp',
    isVeg: false
  },

  // ── Starters & Sides ───────────────────────────────────────────────
  {
    id: 18,
    name: 'Chicken Kabab',
    category: 'starters',
    price: 160,
    description: 'Crispy deep-fried chicken cubes coated with curd, ginger-garlic paste, and vibrant Indian spices.',
    imageUrl: '/images/dishes/chicken-kabab.webp',
    isVeg: false
  },
  {
    id: 13,
    name: 'Chicken Fry',
    category: 'starters',
    price: 160,
    description: 'Boneless and tender chicken chunks marinated in native spice blend, shallow fried to a golden crisp.',
    imageUrl: '/images/dishes/chicken-fry.webp',
    isVeg: false
  },
  {
    id: 14,
    name: 'Chicken Pepper Dry',
    category: 'starters',
    price: 160,
    description: 'Tender chicken pieces tossed with freshly cracked black pepper, caramelized garlic, and shallots.',
    imageUrl: '/images/dishes/chicken-pepper-dry.webp',
    isVeg: false
  },
  {
    id: 17,
    name: 'Chilli Chicken',
    category: 'starters',
    price: 160,
    description: 'Bite-sized chicken chunks tossed with fiery green chillies, curry leaves, and native seasoning.',
    imageUrl: '/images/dishes/chilli-chicken.webp',
    isVeg: false
  },
  {
    id: 19,
    name: 'Chicken Chops',
    category: 'starters',
    price: 160,
    description: 'Tender chicken cuts slow-simmered in an intensely fragrant green herb and mint-coriander gravy.',
    imageUrl: '/images/dishes/chicken-chops.webp',
    isVeg: false
  },
  {
    id: 15,
    name: 'Chicken Leg Piece (2pcs)',
    category: 'starters',
    price: 160,
    description: 'Two succulent whole chicken drumsticks marinated in aromatic spices and roasted to tenderness.',
    imageUrl: '/images/dishes/chicken-leg-piece-2pcs.webp',
    isVeg: false
  },
  {
    id: 16,
    name: 'Chicken Leg Piece (1pc)',
    category: 'starters',
    price: 80,
    description: 'Single tender whole chicken drumstick seasoned and roasted in traditional military masala.',
    imageUrl: '/images/dishes/chicken-leg-piece-1pc.webp',
    isVeg: false
  },
  {
    id: 7,
    name: 'Mutton Fry',
    category: 'starters',
    price: 260,
    description: 'Tender chunks of fresh country mutton pan-tossed with shallots, crushed spices, and curry leaves.',
    imageUrl: '/images/dishes/mutton-fry.webp',
    isVeg: false
  },
  {
    id: 8,
    name: 'Mutton Dry',
    category: 'starters',
    price: 260,
    description: 'Succulent mutton cuts slow-roasted with black pepper, roasted coriander, and caramelized onions.',
    imageUrl: '/images/dishes/mutton-dry.webp',
    isVeg: false
  },
  {
    id: 9,
    name: 'Mutton Chops',
    category: 'starters',
    price: 260,
    description: 'Juicy rib chops marinated in authentic military green masala and braised to tender perfection.',
    imageUrl: '/images/dishes/mutton-chops.webp',
    isVeg: false
  },
  {
    id: 10,
    name: 'Mutton Liver',
    category: 'starters',
    price: 240,
    description: 'Fresh mutton liver pieces pan-roasted with black peppercorns, browned onions, and curry leaves.',
    imageUrl: '/images/dishes/mutton-liver.webp',
    isVeg: false
  },
  {
    id: 11,
    name: 'Botti Gujju',
    category: 'starters',
    price: 180,
    description: 'Classic Bangalore military hotel goat tripe curry prepared in thick aromatic spice reduction.',
    imageUrl: '/images/dishes/booti-gojju.webp',
    isVeg: false
  },
  {
    id: 12,
    name: 'Keema Ball',
    category: 'starters',
    price: 180,
    description: 'Crispy deep-fried seasoned minced mutton meatballs with aromatic herbs and crunch exterior.',
    imageUrl: '/images/dishes/keema-ball.webp',
    isVeg: false
  },

  // ── Sunday Specials & Soups ─────────────────────────────────────────
  {
    id: 1,
    name: 'Kaalu Soup',
    category: 'special',
    price: 120,
    description: 'Traditional military hotel mutton trotter soup slow-simmered with crushed black pepper, bone marrow, and fresh coriander.',
    imageUrl: '/images/dishes/kaalu-soup.webp',
    isVeg: false
  },
  {
    id: 2,
    name: 'Plain Soup',
    category: 'special',
    price: 25,
    description: 'Aromatic clear mutton bone broth spiced with peppercorns, garlic, and fresh herbs without trotter cuts.',
    imageUrl: '/images/dishes/plain-soup.webp',
    isVeg: false
  },
  {
    id: 3,
    name: 'Idli (2pcs)',
    category: 'special',
    price: 50,
    description: 'Ultra-soft, steamed rice cakes served hot on banana leaf, ideal pairing with mutton curries and kaalu soup.',
    imageUrl: '/images/dishes/idli-2pcs.webp',
    isVeg: true
  },
  {
    id: 4,
    name: 'Dosa (2pcs)',
    category: 'special',
    price: 50,
    description: 'Soft, golden spongy set dosas cooked to perfection on an iron tawa, served hot.',
    imageUrl: '/images/dishes/dosa-2pcs.webp',
    isVeg: true
  },
  {
    id: 5,
    name: 'Booti Gojju',
    category: 'special',
    price: 180,
    description: 'Tender diced mutton tripe simmered in a dark, rich, highly spiced military hotel onion-coconut masala gravy.',
    imageUrl: '/images/dishes/booti-gojju.webp',
    isVeg: false
  },
  {
    id: 6,
    name: 'Keema Gojju',
    category: 'special',
    price: 180,
    description: 'Fine minced mutton simmered into a deeply flavored rustic gravy with ground spices and fresh mint.',
    imageUrl: '/images/dishes/keema-gojju.webp',
    isVeg: false
  }
];

export const INITIAL_TICKET_ITEMS: TicketItem[] = [
  {
    id: 20,
    name: 'Chicken Biryani',
    quantity: 2,
    price: 340,
    imageUrl: '/images/dishes/chicken-biryani.webp',
    status: 'READY'
  },
  {
    id: 17,
    name: 'Chilli Chicken',
    quantity: 1,
    price: 160,
    imageUrl: '/images/dishes/chilli-chicken.webp',
    status: 'PREPARING'
  },
  {
    id: 21,
    name: 'Biryani Rice',
    quantity: 1,
    price: 90,
    imageUrl: '/images/dishes/biryani-rice.webp',
    status: 'PLACED'
  }
];

export const INITIAL_ALERTS: ServiceAlert[] = [
  {
    id: 'alert-01',
    type: 'customer',
    seatNumber: 'Seat 03',
    guestName: 'Rajesh V',
    title: 'Water Refill Requested',
    description: 'Guest clicked "Bring Water" on phone menu',
    timeAgo: '2 mins ago',
    isResolved: false
  },
  {
    id: 'alert-02',
    type: 'customer',
    seatNumber: 'Seat 04',
    guestName: 'Kiran R',
    title: 'Bill Requested',
    description: 'Guest is ready to checkout & settle',
    timeAgo: '1 min ago',
    amount: 840,
    isResolved: false
  },
  {
    id: 'alert-03',
    type: 'kitchen',
    seatNumber: 'Seat 01',
    guestName: 'Suhas M',
    title: '2x Chicken Donne Biryani',
    description: 'Pass Counter 1 (Chef Anand)',
    timeAgo: '3 mins ago',
    kotId: 'KOT #108',
    isResolved: false
  },
  {
    id: 'alert-04',
    type: 'kitchen',
    seatNumber: 'Seat 05',
    guestName: 'Darshan Gowda',
    title: '1x Chilli Chicken + 1x Ghee Rice',
    description: 'Tandoor & Starters Section',
    timeAgo: 'Just now',
    kotId: 'KOT #109',
    isResolved: false
  }
];

export const SHIFT_LOGS: ShiftActivity[] = [
  {
    id: 'log-1',
    title: 'Settled Seat 07 Bill',
    description: 'Mutton Biryani + Soda • UPI Payment Verified',
    amount: '+₹400',
    timestamp: '12:49 PM'
  },
  {
    id: 'log-2',
    title: 'Punched KOT #107 for Seat 05',
    description: '4 Items sent to kitchen counter',
    timestamp: '12:44 PM'
  },
  {
    id: 'log-3',
    title: 'Customer Water Call Resolved',
    description: 'Attended Seat 03 (Water Pitcher provided)',
    timestamp: '12:38 PM'
  }
];
