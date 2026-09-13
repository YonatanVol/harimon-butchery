"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { customerSignOut } from "@/infra/customer/actions";
import { Button } from "../../primitives/Button";

export function SignOutButton() {
  const t = useTranslations("shop.account");
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" pendingLabel={pending ? t("signingOut") : null} onClick={() => start(() => customerSignOut())}>
      {t("signOut")}
    </Button>
  );
}
