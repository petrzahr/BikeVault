import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonClass } from "@/lib/ui";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-4xl font-extrabold text-slate-900 mb-2">404</h1>
      <p className="text-slate-500 mb-6 text-sm">Stránka nebyla nalezena.</p>
      <Link
        href="/garage"
        className={buttonClass("primary", "md")}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Zpět do Garáže</span>
      </Link>
    </div>
  );
}
