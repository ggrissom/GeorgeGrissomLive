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
  const inquiry = await prisma.bookingInquiry.create({
    data: {
      name: body.name || "Unknown",
      email: body.email || null,
      phone: body.phone || null,
      date: body.date || null,
      venue: body.venue || null,
      message: body.message || null
    }
  });
  return NextResponse.json(inquiry);
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const inquiry = await prisma.bookingInquiry.update({
    where: { id: body.id },
    data: { status: body.status }
  });
  return NextResponse.json(inquiry);
}
