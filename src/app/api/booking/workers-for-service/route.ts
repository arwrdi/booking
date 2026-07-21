import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getWorkersForService } from "@/infrastructure/supabase/publicData";

export async function GET(request: NextRequest) {
  const serviceId = request.nextUrl.searchParams.get("serviceId") ?? "";

  if (!serviceId) {
    return NextResponse.json({ data: [], error: "serviceId required" }, { status: 400 });
  }

  const result = await getWorkersForService(serviceId);

  return NextResponse.json({ data: result.data, error: result.errorMessage });
}
