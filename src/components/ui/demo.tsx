import React from "react";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { Header } from "@/components/ui/header-2";

export default function Demo() {
  return (
    <div className="w-full">
      <Header />

      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-12">
        <div className="mb-4 space-y-2">
          <div className="bg-accent h-6 w-4/6 rounded-md border" />
          <div className="bg-accent h-6 w-1/2 rounded-md border" />
        </div>
        <div className="mb-8 flex gap-2">
          <div className="bg-accent h-3 w-14 rounded-md border" />
          <div className="bg-accent h-3 w-12 rounded-md border" />
        </div>

        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="mb-8 space-y-2">
            <div className="bg-accent h-4 w-full rounded-md border" />
            <div className="bg-accent h-4 w-full rounded-md border" />
            <div className="bg-accent h-4 w-full rounded-md border" />
            <div className="bg-accent h-4 w-1/2 rounded-md border" />
          </div>
        ))}
      </main>
    </div>
  );
}

export function DemoBackgroundPaths() {
  return <BackgroundPaths title="Background Paths" />;
}
