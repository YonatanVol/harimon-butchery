import { describe, expect, it } from "vitest";
import { type Capability, can, type StaffRole } from "@/domain/auth/permissions";

describe("staff permissions", () => {
  it.each<[StaffRole, Capability, boolean]>([
    ["BUTCHER", "PICK_AND_WEIGH", true],
    ["BUTCHER", "CAPTURE_PAYMENT", true],
    ["BUTCHER", "REFUND", false],
    ["BUTCHER", "OVERRIDE", false],
    ["BUTCHER", "EDIT_PRICES", false],
    ["PACKER", "VIEW_MONEY", false],
    ["PACKER", "CAPTURE_PAYMENT", false],
    ["DRIVER", "VIEW_MONEY", false],
    ["DRIVER", "DELIVER", true],
    ["DRIVER", "PICK_AND_WEIGH", false],
    ["MANAGER", "OVERRIDE", true],
    ["MANAGER", "REFUND", true],
    ["VIEWER", "PICK_AND_WEIGH", false],
    ["VIEWER", "VIEW_AUDIT", true],
    ["OWNER", "EDIT_PRICES", true],
    ["BUTCHER", "MODERATE_REVIEWS", false],
    ["PACKER", "MODERATE_REVIEWS", false],
    ["VIEWER", "MODERATE_REVIEWS", false],
  ])("%s %s → %s", (role, capability, expected) => {
    expect(can(role, capability)).toBe(expected);
  });

  it("only owners and managers can move money backwards or override", () => {
    const roles: StaffRole[] = ["OWNER", "MANAGER", "BUTCHER", "PACKER", "DRIVER", "VIEWER"];
    // A butcher does not decide which reviews of their own butchering get published.
    for (const cap of ["REFUND", "OVERRIDE", "CANCEL_ORDER", "EDIT_PRICES", "MODERATE_REVIEWS"] as const) {
      expect(roles.filter((r) => can(r, cap))).toEqual(["OWNER", "MANAGER"]);
    }
  });
});
