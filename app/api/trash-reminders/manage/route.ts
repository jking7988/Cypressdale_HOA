// app/api/trash-reminders/manage/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { email, action } = await req.json();

  if (!email || !action) {
    return NextResponse.json(
      { error: "Missing email or action." },
      { status: 400 }
    );
  }

  // 1. Look up the subscriber
  const { data: existing, error: fetchError } = await supabase
    .from("trash_reminders")
    .select("email, active")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (fetchError) {
    console.error("Supabase fetch error:", fetchError);
    return NextResponse.json(
      { error: "Database error." },
      { status: 500 }
    );
  }

  // -----------------------------------------------
  // ACTION: UNSUBSCRIBE
  // -----------------------------------------------
  if (action === "unsubscribe") {
    // If no record exists → treat as already unsubscribed
    if (!existing) {
      return NextResponse.json({
        message: "You were already unsubscribed.",
        status: "already-unsubscribed"
      });
    }

    // Already inactive
    if (existing.active === false) {
      return NextResponse.json({
        message: "You were already unsubscribed.",
        status: "already-unsubscribed"
      });
    }

    // Update to inactive
    const { error: updateError } = await supabase
      .from("trash_reminders")
      .update({ active: false })
      .eq("email", email.toLowerCase());

    if (updateError) {
      console.error(updateError);
      return NextResponse.json(
        { error: "Unable to unsubscribe." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "You have been unsubscribed from trash day reminders.",
      status: "unsubscribed"
    });
  }

  // -----------------------------------------------
  // ACTION: RESUBSCRIBE
  // -----------------------------------------------
  if (action === "resubscribe") {
    // If no record exists → create one fresh
    if (!existing) {
      await supabase.from("trash_reminders").insert([
        { email: email.toLowerCase(), active: true }
      ]);

      return NextResponse.json({
        message: "You have been resubscribed!",
        status: "resubscribed"
      });
    }

    // Already active
    if (existing.active === true) {
      return NextResponse.json({
        message: "You are already subscribed.",
        status: "already-subscribed"
      });
    }

    // Update to active
    const { error: updateError } = await supabase
      .from("trash_reminders")
      .update({ active: true })
      .eq("email", email.toLowerCase());

    if (updateError) {
      console.error(updateError);
      return NextResponse.json(
        { error: "Unable to resubscribe." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "You have been resubscribed!",
      status: "resubscribed"
    });
  }

  return NextResponse.json(
    { error: "Unknown action." },
    { status: 400 }
  );
}
