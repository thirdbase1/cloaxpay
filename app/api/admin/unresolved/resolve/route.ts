import { NextResponse } from "next/server";
import { resolveUnresolvedTransaction } from "@/lib/unresolved-handler";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { unresolvedId, resolution, notes } = body;

    if (!unresolvedId || !resolution) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    await resolveUnresolvedTransaction(unresolvedId, resolution, notes);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[v0] Failed to resolve transaction:", error);
    return NextResponse.json(
      { error: "Failed to resolve transaction" },
      { status: 500 }
    );
  }
}
