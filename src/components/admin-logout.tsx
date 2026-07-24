"use client";

import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";

export function AdminLogout() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await adminApi.logout();
        router.push("/admin/login");
        router.refresh();
      }}
      className="text-sm text-gray-400 hover:text-gray-600"
    >
      登出
    </button>
  );
}
