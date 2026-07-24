import { LiffProvider } from "@/components/liff-provider";
import { BottomNav } from "@/components/bottom-nav";

// 會員端共用版面：LIFF 身分驗證 + 底部分頁
export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LiffProvider>
      <div className="flex-1 flex flex-col mx-auto w-full max-w-md">
        <div className="flex-1 flex flex-col">{children}</div>
        <BottomNav />
      </div>
    </LiffProvider>
  );
}
