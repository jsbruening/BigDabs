import { db } from "~/server/db";

export async function GET() {
  try {
    const result = await db.$runCommandRaw({ ping: 1 });
    return new Response(
      JSON.stringify({ ok: true, result }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}



