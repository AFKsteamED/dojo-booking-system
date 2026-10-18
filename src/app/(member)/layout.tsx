import { LiffProvider } from "@/components/liff-provider";
import { BottomNav } from "@/components/bottom-nav";
import { LanguageToggle } from "@/components/language-toggle";
import { RegistrationGate } from "@/components/registration-gate";

// 會員端共用版面：LIFF 身分驗證 → 未註冊先導到註冊頁 → 底部分頁
export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LiffProvider>
      <div className="flex-1 flex flex-col mx-auto w-full max-w-md relative">
        <LanguageToggle />
        <div className="flex-1 flex flex-col">
          <RegistrationGate>{children}</RegistrationGate>
        </div>
        <BottomNav />
      </div>
    </LiffProvider>
  );
}
