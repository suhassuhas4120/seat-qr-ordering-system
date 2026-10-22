// ==============================================================================
// THOOGUDEEPA V2: DETERMINISTIC TABLE FINITE STATE MACHINE (FSM)
// ==============================================================================

export type TableState =
  | 'VACANT'              // Table is empty, ready for any customer to scan
  | 'OCCUPIED_ORDERING'   // Host scanned and is building tray
  | 'COOKING'             // Order submitted, items in REC / PREP in kitchen
  | 'DINING'              // Items READY / SERVED at the table
  | 'BILL_REQUESTED'      // Customer requested bill or cash collection
  | 'SETTLED';            // Payment confirmed, clearing table back to VACANT

export type TableEvent =
  | { type: 'CUSTOMER_SEATED'; chairId: string; deviceToken: string }
  | { type: 'ORDER_SUBMITTED'; ticketNumber: string }
  | { type: 'KITCHEN_COOKING' }
  | { type: 'FOOD_SERVED' }
  | { type: 'BILL_REQUESTED'; method: 'upi' | 'cash' | 'counter' }
  | { type: 'PAYMENT_CONFIRMED' }
  | { type: 'TABLE_RELEASED' }
  | { type: 'RESET_OVERRIDE' };

const ALLOWED_TRANSITIONS: Record<TableState, TableState[]> = {
  VACANT: ['OCCUPIED_ORDERING', 'COOKING', 'RESET_OVERRIDE' as TableState],
  OCCUPIED_ORDERING: ['COOKING', 'VACANT', 'RESET_OVERRIDE' as TableState],
  COOKING: ['DINING', 'BILL_REQUESTED', 'SETTLED', 'RESET_OVERRIDE' as TableState],
  DINING: ['COOKING', 'BILL_REQUESTED', 'SETTLED', 'RESET_OVERRIDE' as TableState], // Can return to COOKING if extra dishes ordered!
  BILL_REQUESTED: ['SETTLED', 'DINING', 'RESET_OVERRIDE' as TableState],
  SETTLED: ['VACANT', 'RESET_OVERRIDE' as TableState],
};

export function canTransition(current: TableState, next: TableState): boolean {
  if (next === current) return true;
  const allowed = ALLOWED_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

export function transitionTableState(
  current: TableState,
  event: TableEvent
): { valid: boolean; nextState: TableState; note?: string } {
  switch (event.type) {
    case 'CUSTOMER_SEATED':
      if (current === 'VACANT') {
        return { valid: true, nextState: 'OCCUPIED_ORDERING' };
      }
      return { valid: false, nextState: current, note: 'Table is not vacant.' };

    case 'ORDER_SUBMITTED':
      if (current === 'VACANT' || current === 'OCCUPIED_ORDERING' || current === 'DINING') {
        return { valid: true, nextState: 'COOKING' };
      }
      return { valid: false, nextState: current, note: 'Cannot submit order in current state.' };

    case 'KITCHEN_COOKING':
      return { valid: true, nextState: 'COOKING' };

    case 'FOOD_SERVED':
      if (current === 'COOKING') {
        return { valid: true, nextState: 'DINING' };
      }
      return { valid: true, nextState: current };

    case 'BILL_REQUESTED':
      if (current === 'COOKING' || current === 'DINING') {
        return { valid: true, nextState: 'BILL_REQUESTED' };
      }
      return { valid: false, nextState: current, note: 'Cannot request bill before ordering.' };

    case 'PAYMENT_CONFIRMED':
      return { valid: true, nextState: 'SETTLED' };

    case 'TABLE_RELEASED':
      return { valid: true, nextState: 'VACANT' };

    case 'RESET_OVERRIDE':
      return { valid: true, nextState: 'VACANT' };

    default:
      return { valid: false, nextState: current, note: 'Unrecognized table event.' };
  }
}
