"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InvoicesPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/app?tab=invoices"); }, [router]);
  return null;
}
