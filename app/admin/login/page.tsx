// /admin/login — legacy admin login, retired in favour of the
// AdminGate allowlist on the regular /login flow. Log in with your
// ZeniPay account; admins on the allowlist (info@zeniva.ca,
// alexandreblais26@gmail.com) get the green sidebar automatically.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/login"); }, [router]);
  return null;
}
