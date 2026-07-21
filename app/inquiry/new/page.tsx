import { Suspense } from "react";
import NewInquiryClient from "./NewInquiryClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-[#0A0A0A] text-zinc-500">
          Načítavam…
        </div>
      }
    >
      <NewInquiryClient />
    </Suspense>
  );
}
