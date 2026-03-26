"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PayLinksPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/app?tab=paylinks"); }, [router]);
  return null;
}
