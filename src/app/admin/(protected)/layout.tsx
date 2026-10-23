import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { AdminLogout } from "@/components/admin-logout";
import { AdminNav, CourseTabs } from "@/components/admin-nav";

// 後台受保護區：未登入一律導回登入頁
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-full">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-stretch justify-between gap-3">
          <div className="flex items-stretch gap-3 min-w-0">
            <span className="self-center font-bold text-brand shrink-0 hidden sm:inline">真實格鬥 後台</span>
            <AdminNav />
          </div>
          <div className="self-center shrink-0">
            <AdminLogout />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-5 space-y-4">
        <CourseTabs />
        <div>{children}</div>
      </main>
    </div>
  );
}
