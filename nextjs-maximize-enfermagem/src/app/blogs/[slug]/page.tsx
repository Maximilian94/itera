import { PortableText, type SanityDocument } from "next-sanity";
import imageUrlBuilder, { type SanityImageSource } from "@sanity/image-url";
import { client } from "@/sanity/client";
import Link from "next/link";
import { notFound } from "next/navigation";

const POST_QUERY = `*[_type == "post" && slug.current == $slug][0]`;

const { projectId, dataset } = client.config();
const urlFor = (source: SanityImageSource) =>
    projectId && dataset
        ? imageUrlBuilder({ projectId, dataset }).image(source)
        : null;

const options = { next: { revalidate: 30 } };

export default async function PostPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const post = await client.fetch<SanityDocument | null>(
        POST_QUERY,
        { slug },
        options
    );

    if (!post) {
        notFound();
    }

    const postImageUrl = post.image
        ? urlFor(post.image)?.width(1200).height(675).url()
        : null;

    return (
        <main className="container mx-auto min-h-screen max-w-4xl p-8 flex flex-col gap-4">
            <Link href="/blogs" className="text-sky-600 hover:underline">
                ← Voltar ao blog
            </Link>
            {postImageUrl && (
                <img
                    src={postImageUrl}
                    alt={post.title}
                    className="aspect-video w-full rounded-xl object-cover"
                    width={1200}
                    height={675}
                />
            )}
            <h1 className="text-4xl font-bold mb-8">{post.title}</h1>
            <div className="prose blog-post-prose w-full">
                <p>
                    Publicado em:{" "}
                    {new Date(post.publishedAt).toLocaleDateString("pt-BR")}
                </p>
                {Array.isArray(post.body) && <PortableText value={post.body} />}
            </div>
        </main>
    );
}
