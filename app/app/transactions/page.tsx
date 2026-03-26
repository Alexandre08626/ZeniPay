"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TransactionsPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/app?tab=transactions"); }, [router]);
  return null;
}
