import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import {
  PERFORMANCE_CALENDAR_ID,
  deleteGoogleCalendarEvent,
  googleCalendarErrorMessage,
  syncEventToGoogleCalendar
} from "@/lib/google-calendar";
import { publicEventsFromPerformanceCalendar } from "@/lib/public-events";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const admin = searchParams.get("admin") === "1" && await isAdminRequest();

  if (!admin) {
    const events = await publicEventsFromPerformanceCalendar(50);
    return NextResponse.json(events);
  }

  const events = await prisma.event.findMany({
    orderBy: { startsAt: "asc" },
    include: { setlists: { orderBy: { createdAt: "desc" } } }
  });
  return NextResponse.json(events);
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();

  let event = await prisma.event.create({
    data: {
      title: body.title || "Live Show",
      venueName: body.venueName || "Venue TBA",
      city: body.city || null,
      state: body.state || null,
      notes: body.notes || null,
      startsAt: new Date(body.startsAt),
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      isPublic: body.isPublic !== false,
      googleCalendarId: PERFORMANCE_CALENDAR_ID,
      googleSyncStatus: "local_only"
    }
  });

  event = await syncAndSaveStatus(event);
  return NextResponse.json(event);
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let event = await prisma.event.update({
    where: { id: body.id },
    data: {
      title: body.title,
      venueName: body.venueName,
      city: body.city,
      state: body.state,
      notes: body.notes,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: Object.prototype.hasOwnProperty.call(body, "endsAt") ? (body.endsAt ? new Date(body.endsAt) : null) : undefined,
      isPublic: body.isPublic
    }
  });

  event = await syncAndSaveStatus(event);
  return NextResponse.json(event);
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { id } });
  if (event?.googleEventId) {
    await deleteGoogleCalendarEvent(event.googleEventId).catch(error => {
      console.error("Google Calendar delete failed", error);
    });
  }

  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

async function syncAndSaveStatus(event: any) {
  try {
    const sync = await syncEventToGoogleCalendar(event);
    if (sync.status === "skipped") {
      return await prisma.event.update({
        where: { id: event.id },
        data: {
          googleCalendarId: PERFORMANCE_CALENDAR_ID,
          googleSyncStatus: "local_only",
          googleSyncError: sync.reason
        }
      });
    }

    return await prisma.event.update({
      where: { id: event.id },
      data: {
        googleCalendarId: sync.googleCalendarId,
        googleEventId: sync.googleEventId,
        googleSyncStatus: "google_synced",
        googleLastSyncedAt: new Date(),
        googleSyncError: null
      }
    });
  } catch (error) {
    return await prisma.event.update({
      where: { id: event.id },
      data: {
        googleCalendarId: PERFORMANCE_CALENDAR_ID,
        googleSyncStatus: "google_error",
        googleSyncError: googleCalendarErrorMessage(error)
      }
    });
  }
}
