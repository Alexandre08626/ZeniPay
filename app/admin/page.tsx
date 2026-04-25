// /admin — redirect to the new admin super dashboard.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/overview"); }, [router]);
  return null;
}
