import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { display_name, username } = body as {
    display_name?: string;
    username?: string;
  };

  // Validate username format if provided
  if (username !== undefined) {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3–20 characters, letters, numbers, or underscores only." },
        { status: 422 }
      );
    }

    // Check uniqueness (excluding current user)
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
    }
  }

  type ProfileUpdate = {
    display_name?: string | null;
    username?: string;
  };

  const updates: ProfileUpdate = {};
  if (display_name !== undefined) updates.display_name = display_name.trim() || null;
  if (username !== undefined) updates.username = username;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
