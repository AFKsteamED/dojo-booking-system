import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { AdminLogout } from "@/components/admin-logout";

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
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="font-bold text-brand">真實格鬥 後台</span>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin/schedule" className="text-gray-600 hover:text-brand">
                課表 / 名單
              </Link>
              <Link href="/admin/members" className="text-gray-600 hover:text-brand">
                會員 / 堂數
              </Link>
              <Link href="/admin/coaches" className="text-gray-600 hover:text-brand">
                教練
              </Link>
            </nav>
          </div>
          <AdminLogout />
        </div>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-5">{children}</main>
    </div>
  );
}
