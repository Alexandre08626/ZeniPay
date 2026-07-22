export const dynamic = "force-dynamic";

/**
 * ZeniPay Merchant Registration API
 * POST /api/merchants/register
 * Creates a new merchant account with Supabase Auth user + merchant record
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { hashPassword } from "@/modules/zenipay/services/auth";
import { generateApiKey, generateApiSecret } from "@/modules/zenipay/services/keys";
import { rateLimit } from "@/modules/zenipay/services/rate-limit";
import { z } from "zod";

const RegisterSchema = z.object({
  // Required
  businessName: z.string().min(2).max(200),
  ownerName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  // Optional
  phone: z.string().max(30).optional(),
  website: z.string().url().optional().or(z.literal("")),
  businessType: z.string().max(100).optional(),
  country: z.string().length(2).optional().default("CA"),
  monthlyVolume: z.string().max(50).optional(),
  plan: z.enum(["Standard", "Professional", "Enterprise"]).optional().default("Standard"),
  // Source tracking
  source: z.string().optional().default("landing"),
  referrer: z.string().optional(),
});

function generateMerchantId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return "mer_" + Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 5 registrations per IP per hour
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(`merchant_register:${ip}`, 5, 3600000)) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      businessName,
      ownerName,
      email,
      password,
      phone,
      website,
      businessType,
      country,
      monthlyVolume,
      plan,
      source,
      referrer,
    } = parsed.data;

    const supabase = getSupabaseAdmin();
    const merchantId = generateMerchantId();

    // Check if email already exists in auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());

    if (emailExists) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Check if merchant email already exists
    const { data: existingMerchant } = await supabase
      .from("zenipay_merchants")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existingMerchant) {
      return NextResponse.json(
        { error: "A merchant with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate API keys
    const sandboxKey = generateApiKey("zpk_sb");
    const sandboxSecret = generateApiSecret("zps_sb");
    const liveKey = generateApiKey("zpk_lk");
    const liveSecret = generateApiSecret("zps_lk");

    // Create Supabase Auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        role: "merchant",
        merchant_id: merchantId,
        business_name: businessName,
        source,
      },
      app_metadata: {
        provider: "email",
        providers: ["email"],
      },
    });

    if (authError) {
      console.error("[Merchant Register] Auth error:", authError);
      return NextResponse.json(
        { error: "Failed to create account. Please try again." },
        { status: 500 }
      );
    }

    const authUserId = authUser.user.id;

    // Create merchant record
    const merchantRecord = {
      id: merchantId,
      auth_user_id: authUserId,
      business_name: businessName,
      owner_name: ownerName,
      email: email.toLowerCase(),
      phone: phone || null,
      website: website || null,
      business_type: businessType || null,
      country: country.toUpperCase(),
      monthly_volume: monthlyVolume || null,
      status: "sandbox",
      plan,
      sandbox_key: sandboxKey,
      sandbox_secret: sandboxSecret,
      live_key: liveKey,
      live_secret: liveSecret,
      volume: 0,
      tx_count: 0,
      balance: 0,
      notes: "",
      onboarding_state: "pending",
      merchant_data: {
        email: email.toLowerCase(),
        businessName,
        ownerName,
        phone: phone || "",
        website: website || "",
        businessType: businessType || "",
        country: country.toUpperCase(),
        monthlyVolume: monthlyVolume || "",
        plan,
        status: "sandbox",
        source,
        referrer: referrer || "",
        password: passwordHash,
        createdAt: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: merchantError } = await supabase
      .from("zenipay_merchants")
      .insert(merchantRecord);

    if (merchantError) {
      // Rollback auth user on merchant creation failure
      await supabase.auth.admin.deleteUser(authUserId);
      console.error("[Merchant Register] Merchant insert error:", merchantError);
      return NextResponse.json(
        { error: "Failed to create merchant record" },
        { status: 500 }
      );
    }

    // Log access request for tracking
    await supabase.from("zenipay_access_requests").insert({
      email: email.toLowerCase(),
      company: businessName,
      role: ownerName,
      source: "registration",
      message: `Merchant registered: ${businessName} (${plan} plan)`,
    });

    return NextResponse.json({
      success: true,
      merchant: {
        id: merchantId,
        businessName,
        email: email.toLowerCase(),
        status: "sandbox",
        plan,
        sandboxKey,
        sandboxSecret,
        liveKey,
      },
      message: "Merchant account created successfully. Check your email for login details.",
    });
  } catch (err) {
    console.error("[Merchant Register] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}