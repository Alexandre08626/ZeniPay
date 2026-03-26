"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BenAiPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/app?tab=ben"); }, [router]);
  return null;
}
