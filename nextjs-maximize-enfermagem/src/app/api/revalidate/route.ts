import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const path = body.path as string | undefined;

  if (!path || typeof path !== "string") {
    return Response.json({ error: "Missing path" }, { status: 400 });
  }

  revalidatePath(path);
  return Response.json({ revalidated: true, path });
}
