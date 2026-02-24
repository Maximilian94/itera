import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * Revalidação sob demanda. Chamado pelo backend quando um concurso é criado, atualizado ou publicado.
 *
 * POST /api/revalidate
 * Body: { secret: string, path?: string, slug?: string }
 *
 * - secret: REVALIDATE_SECRET (obrigatório)
 * - path: caminho para revalidar (ex: "/concursos")
 * - slug: slug do concurso — revalida /concursos e /concursos/[slug]
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const secret = body?.secret;
    const path = body?.path;
    const slug = body?.slug;

    const expectedSecret = process.env.REVALIDATE_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    if (slug && typeof slug === "string") {
      revalidatePath("/concursos");
      revalidatePath(`/concursos/${slug}`);
      return NextResponse.json({ revalidated: true, paths: ["/concursos", `/concursos/${slug}`] });
    }

    if (path && typeof path === "string") {
      revalidatePath(path);
      return NextResponse.json({ revalidated: true, paths: [path] });
    }

    revalidatePath("/concursos");
    return NextResponse.json({ revalidated: true, paths: ["/concursos"] });
  } catch (err) {
    console.error("[revalidate]", err);
    return NextResponse.json({ error: "Revalidation failed" }, { status: 500 });
  }
}
