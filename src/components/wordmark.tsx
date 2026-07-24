// 品牌字標：REAL 藍 / FIGHTING 紅，呼應道館 Logo 配色。
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <p className={`font-extrabold tracking-[0.2em] ${className}`}>
      <span className="text-brand">REAL</span>{" "}
      <span className="text-accent">FIGHTING</span>
    </p>
  );
}
