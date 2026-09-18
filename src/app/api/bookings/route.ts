import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const admin = searchParams.get("admin") === "1" && await isAdminRequest();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const inquiries = await prisma.bookingInquiry.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(inquiries);
}

export async function POST(request: Request) {
  const body = await request.json();

  const details = [
    body.message || "",
    "",
    `Location: ${body.location || "Not provided"}`,
    `Event type: ${body.eventType || "Not provided"}`,
    `Estimated audience: ${body.audience || "Not provided"}`,
    `Budget / fee range: ${body.budget || "Not provided"}`
  ].join("\n");

  const inquiry = await prisma.bookingInquiry.create({
    data: {
      name: body.name || "Unknown",
      email: body.email || null,
      phone: body.phone || null,
      date: body.date || null,
      venue: body.venue || null,
      message: details
    }
  });

  let notificationStatus = "not_sent";
  try {
    const recipient = process.env.BOOKING_NOTIFICATION_EMAIL || "georgegrissom@gmail.com";
    const notify = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        _subject: "IMPORTANT — New GeorgeGrissom.com Booking Inquiry",
        _template: "table",
        _captcha: "false",
        _replyto: body.email || "",
        important: "YES",
        submitted_at: new Date().toISOString(),
        name: body.name || "Unknown",
        email: body.email || "Not provided",
        phone: body.phone || "Not provided",
        requested_date: body.date || "Not provided",
        venue_event: body.venue || "Not provided",
        city_location: body.location || "Not provided",
        event_type: body.eventType || "Not provided",
        estimated_audience: body.audience || "Not provided",
        budget_fee_range: body.budget || "Not provided",
        message: body.message || "Not provided"
      })
    });
    notificationStatus = notify.ok ? "sent" : `email_service_${notify.status}`;
  } catch {
    notificationStatus = "email_service_error";
  }

  return NextResponse.json({ ...inquiry, notificationStatus });
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.bookingInquiry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
