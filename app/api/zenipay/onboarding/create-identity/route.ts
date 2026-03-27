export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

const FINIX_BASE = "https://finix.sandbox-payments-api.com";

function finixAuth() {
  const user = process.env.FINIX_API_USERNAME || "";
  const pass = process.env.FINIX_API_PASSWORD || "";
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      business_name,
      business_type,
      doing_business_as,
      first_name,
      last_name,
      email,
      phone,
      line1,
      city,
      region,
      postal_code,
      country,
      tax_id,
      dob_month,
      dob_day,
      dob_year,
    } = body;

    const address = { line1, city, region, postal_code, country: country || "USA" };

    const finixBody = {
      entity: {
        type: "BUSINESS",
        business_name,
        business_type: business_type || "LIMITED_LIABILITY_COMPANY",
        doing_business_as: doing_business_as || business_name,
        first_name,
        last_name,
        email,
        phone,
        business_phone: phone,
        business_address: address,
        personal_address: address,
        tax_id,
        dob: {
          month: Number(dob_month),
          day: Number(dob_day),
          year: Number(dob_year),
        },
        mcc: "4722",
        max_transaction_amount: 1500000,
        default_statement_descriptor: "ZENIPAY",
      },
    };

    const res = await fetch(`${FINIX_BASE}/identities`, {
      method: "POST",
      headers: {
        Authorization: finixAuth(),
        "Content-Type": "application/json",
        "Finix-Version": "2022-02-01",
      },
      body: JSON.stringify(finixBody),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Finix API error", details: data },
        { status: res.status },
      );
    }

    return NextResponse.json({
      identity_id: data.id,
      identity: data,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
