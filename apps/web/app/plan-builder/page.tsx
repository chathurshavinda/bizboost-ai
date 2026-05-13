"use client";
export const dynamic = "force-dynamic";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
export default function PlanBuilderPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    useEffect(() => {
        const mode = searchParams.get("mode");
        const days = searchParams.get("days");
        const query = new URLSearchParams();
        if (mode)
            query.set("mode", mode);
        if (days)
            query.set("days", days);
        router.replace(`/marketing-plan${query.toString() ? `?${query.toString()}` : ""}`);
    }, [router, searchParams]);
    return null;
}
