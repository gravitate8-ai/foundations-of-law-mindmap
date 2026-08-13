import { NextResponse } from "next/server";

// Required for `output: "export"` — emitted as a static JSON file.
export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({ message: "Hello, world!" });
}