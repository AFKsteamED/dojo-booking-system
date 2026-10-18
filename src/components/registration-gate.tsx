"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";

// 尚未完成註冊（真實資料未填齊）的人，一律先導到 /register。
export function RegistrationGate({ children }: { children: React.ReactNode }) {
  const { profileComplete, t } = useLiff();
  const pathname = usePathname();
  const router = useRouter();
  const mustRegister = !profileComplete && pathname !== "/register";

  useEffect(() => {
    if (mustRegister) router.replace("/register");
  }, [mustRegister, router]);

  if (mustRegister) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted text-sm">{t("common_loading")}</p>
      </div>
    );
  }
  return <>{children}</>;
}
