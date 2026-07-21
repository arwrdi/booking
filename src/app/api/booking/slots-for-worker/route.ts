import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSlotsForWorkerByDate } from "@/infrastructure/supabase/publicData";

export async function GET(request: NextRequest) {
  const workerId = request.nextUrl.searchParams.get("workerId") ?? "";
  const date = request.nextUrl.searchParams.get("date") ?? "";

  if (!workerId || !date) {
    return NextResponse.json({ data: [], error: "workerId and date required" }, { status: 400 });
  }

  const result = await getSlotsForWorkerByDate(workerId, date);

  return NextResponse.json({ data: result.data, error: result.errorMessage });
}
