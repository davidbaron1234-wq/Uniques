import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth (uses HTTPS — works from Vercel serverless).
    // user_metadata stores the display name for later retrieval.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      // "User already registered" comes back as a 400-level Supabase error
      const status = error.status === 422 || error.message?.toLowerCase().includes("already") ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { id: data.user?.id, name, email },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[register] error:", message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
