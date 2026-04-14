import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

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

    // Server-side guards — client-only checks are bypassable via direct POST
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 422 });
    }
    if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 50) {
      return NextResponse.json({ error: "Name must be between 1 and 50 characters." }, { status: 422 });
    }
    // Basic email shape check (Supabase validates fully, this catches obvious garbage)
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 422 });
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

    // Immediately create a Profile record so this user appears in the Collectors directory
    // without waiting for their first sign-in to fire the JWT callback.
    if (data.user?.id) {
      try {
        await prisma.profile.upsert({
          where:  { userId: data.user.id },
          create: { userId: data.user.id, name, avatar: "" },
          update: {},
        });
      } catch { /* non-fatal */ }
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
