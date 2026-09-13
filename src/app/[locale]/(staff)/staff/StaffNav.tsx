"use client";

import { useTransition } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { staffLogout } from "@/infra/staff/actions";
import { cx } from "@/ui/cx";

export function StaffNav({ items, member, logoutLabel }: { items: Array<{ href: string; label: string }>; member: { name: string; role: string }; logoutLabel: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <>
      <nav className="flex flex-wrap gap-1">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={pathname === i.href || (i.href !== "/staff" && pathname.startsWith(i.href)) ? "page" : undefined}
            className={cx("inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium", pathname === i.href || (i.href !== "/staff" && pathname.startsWith(i.href)) ? "bg-bone-50/15" : "hover:bg-bone-50/10")}
          >
            {i.label}
          </Link>
        ))}
      </nav>
      <div className="ms-auto flex items-center gap-3 text-sm">
        <span>
          {member.name} <span className="text-bone-300">· {member.role}</span>
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await staffLogout();
              router.replace("/staff/login");
              router.refresh();
            })
          }
          className="ring-bone-50/30 hover:bg-bone-50/10 min-h-11 rounded-lg px-3 ring-1"
        >
          {logoutLabel}
        </button>
      </div>
    </>
  );
}
