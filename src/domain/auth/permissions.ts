/** Who on the staff can do what. Pure data, tested as a table. */

export type StaffRole = "OWNER" | "MANAGER" | "BUTCHER" | "PACKER" | "DRIVER" | "VIEWER";

export type Capability =
  | "VIEW_BOARD"
  | "VIEW_MONEY"
  | "PICK_AND_WEIGH"
  | "CAPTURE_PAYMENT"
  | "PACK"
  | "DELIVER"
  | "OVERRIDE"
  | "REFUND"
  | "CANCEL_ORDER"
  | "EDIT_CATALOG"
  | "EDIT_PRICES"
  | "MANAGE_STOCK"
  | "MANAGE_SLOTS"
  | "VIEW_MESSAGES"
  | "VIEW_AUDIT";

const MATRIX: Record<StaffRole, readonly Capability[]> = {
  OWNER: ["VIEW_BOARD", "VIEW_MONEY", "PICK_AND_WEIGH", "CAPTURE_PAYMENT", "PACK", "DELIVER", "OVERRIDE", "REFUND", "CANCEL_ORDER", "EDIT_CATALOG", "EDIT_PRICES", "MANAGE_STOCK", "MANAGE_SLOTS", "VIEW_MESSAGES", "VIEW_AUDIT"],
  MANAGER: ["VIEW_BOARD", "VIEW_MONEY", "PICK_AND_WEIGH", "CAPTURE_PAYMENT", "PACK", "DELIVER", "OVERRIDE", "REFUND", "CANCEL_ORDER", "EDIT_CATALOG", "EDIT_PRICES", "MANAGE_STOCK", "MANAGE_SLOTS", "VIEW_MESSAGES", "VIEW_AUDIT"],
  BUTCHER: ["VIEW_BOARD", "VIEW_MONEY", "PICK_AND_WEIGH", "CAPTURE_PAYMENT", "PACK", "MANAGE_STOCK", "VIEW_MESSAGES"],
  PACKER: ["VIEW_BOARD", "PICK_AND_WEIGH", "PACK", "VIEW_MESSAGES"],
  DRIVER: ["VIEW_BOARD", "DELIVER"],
  VIEWER: ["VIEW_BOARD", "VIEW_MONEY", "VIEW_MESSAGES", "VIEW_AUDIT"],
};

export function can(role: StaffRole, capability: Capability): boolean {
  return MATRIX[role].includes(capability);
}

export const ALL_CAPABILITIES = Object.freeze([...new Set(Object.values(MATRIX).flat())]) as readonly Capability[];
