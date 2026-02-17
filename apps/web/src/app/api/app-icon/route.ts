import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const SHARED_ICON_PATH = path.join(
  process.cwd(),
  "..",
  "mobile",
  "assets",
  "icon.png"
);

export async function GET() {
  try {
    const iconBuffer = await fs.readFile(SHARED_ICON_PATH);
    return new NextResponse(iconBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Icon file not found" },
      { status: 404 }
    );
  }
}
