import { NextResponse } from "next/server";
import { connection } from "@/utils/connection";
import FacebookAdsSettings from "@/models/FacebookAdsSettings";
import { FacebookAdsConnectionSchema } from "@/lib/facebookAds";

export async function GET() {
  try {
    await connection();
    const settings = await FacebookAdsSettings.findOne()
      .sort({ updatedAt: -1 })
      .lean();

    if (!settings) {
      return NextResponse.json({ ok: true, data: null });
    }

    return NextResponse.json({ ok: true, data: settings });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: error.message || "Unable to load Facebook Ads settings.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = FacebookAdsConnectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid Facebook Ads connection payload.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    await connection();

    const settings = await FacebookAdsSettings.findOneAndUpdate(
      {},
      { $set: parsed.data },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({
      ok: true,
      data: settings,
      message: "Facebook Ads settings saved.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: error.message || "Unable to save Facebook Ads settings.",
      },
      { status: 500 },
    );
  }
}
