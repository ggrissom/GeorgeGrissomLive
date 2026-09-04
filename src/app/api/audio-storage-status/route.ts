import { NextResponse } from "next/server";
import {
  googleDriveAudioServiceAccountEmail,
  isGoogleDriveAudioConfigured
} from "@/lib/audio-storage";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    configured: isGoogleDriveAudioConfigured(),
    serviceAccountEmail: googleDriveAudioServiceAccountEmail()
  });
}
