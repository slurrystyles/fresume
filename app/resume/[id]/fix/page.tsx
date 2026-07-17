import { Suspense } from "react";
import FixClient from "./FixClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function Page({ params }: PageProps) {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="animate-spin text-signal text-2xl">●</div>
      </div>
    }>
      <FixClient params={params} />
    </Suspense>
  );
}
