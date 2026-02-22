import type { Metadata } from "next";
import imageUrlBuilder, { type SanityImageSource } from "@sanity/image-url";
import { client } from "@/sanity/client";
import Link from "next/link";
import { ClockIcon } from "@heroicons/react/20/solid";

export const metadata: Metadata = {
    title: "Blog | Maximize Enfermagem",
    description:
        "Dicas, estratégias e informações sobre concursos de enfermagem para te ajudar a conquistar sua vaga.",
};

const POSTS_QUERY = `*[_type == "post"] | order(publishedAt desc) {
  _id,
  title,
  subtitle,
  slug,
  publishedAt,
  image,
  "excerpt": pt::text(body)[0...180],
  "readingTime": round(length(pt::text(body)) / 5 / 200)
}`;

const { projectId, dataset } = client.config();
const urlFor = (source: SanityImageSource) =>
    projectId && dataset
        ? imageUrlBuilder({ projectId, dataset }).image(source)
        : null;

const options = { next: { revalidate: 30 } };

type Post = {
    _id: string;
    title: string;
    subtitle?: string;
    slug: { current: string };
    publishedAt: string;
    image?: SanityImageSource;
    excerpt?: string;
    readingTime?: number;
};

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function ImagePlaceholder() {
    return (
        <div className="absolute inset-0 size-full rounded-2xl bg-linear-to-br from-blue-50 to-slate-100 flex items-center justify-center">
            <svg
                className="w-12 h-12 text-blue-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
            </svg>
        </div>
    );
}

export default async function BlogsPage() {
    const posts = await client.fetch<Post[]>(POSTS_QUERY, {}, options);

    return (
        <div className="bg-slate-50 py-4">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:max-w-4xl">
                    <h2 className="mt-6 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                        Blog
                    </h2>
                    <p className="mt-2 text-lg/8 text-gray-600">
                        Dicas, estratégias e informações para você conquistar
                        sua vaga em concursos de enfermagem.
                    </p>

                    {posts.length === 0 ? (
                        <div className="mt-16 text-center py-24">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg
                                    className="w-8 h-8 text-blue-300"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                Nenhuma postagem ainda
                            </h2>
                            <p className="text-gray-500">
                                Em breve publicaremos conteúdo incrível para
                                você!
                            </p>
                        </div>
                    ) : (
                        <div className="mt-16 space-y-20 lg:mt-20">
                            {posts.map((post) => {
                                const imgUrl = post.image
                                    ? urlFor(post.image)
                                          ?.width(600)
                                          .height(600)
                                          .url()
                                    : null;
                                const mins =
                                    !post.readingTime || post.readingTime < 1
                                        ? 1
                                        : post.readingTime;

                                return (
                                    <article
                                        key={post._id}
                                        className="relative isolate flex flex-col gap-8 lg:flex-row"
                                    >
                                        {/* Image */}
                                        <div className="relative aspect-video sm:aspect-2/1 lg:aspect-square lg:w-48 lg:shrink-0">
                                            {imgUrl ? (
                                                <img
                                                    alt={post.title}
                                                    src={imgUrl}
                                                    className="absolute inset-0 size-full rounded-2xl bg-gray-50 object-cover"
                                                />
                                            ) : (
                                                <ImagePlaceholder />
                                            )}
                                            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-900/10" />
                                        </div>

                                        {/* Content */}
                                        <div>
                                            <div className="flex items-center gap-x-4 text-xs">
                                                <time
                                                    dateTime={post.publishedAt}
                                                    className="text-gray-500"
                                                >
                                                    {formatDate(
                                                        post.publishedAt
                                                    )}
                                                </time>
                                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1.5 font-medium text-gray-600">
                                                    <ClockIcon className="w-3 h-3" />
                                                    {mins} min de leitura
                                                </span>
                                            </div>

                                            <div className="group relative max-w-xl">
                                                <h3 className="mt-3 text-lg/6 font-semibold text-gray-900 group-hover:text-gray-600">
                                                    <Link
                                                        href={`/blogs/${post.slug.current}`}
                                                    >
                                                        <span className="absolute inset-0" />
                                                        {post.title}
                                                    </Link>
                                                </h3>
                                                {post.subtitle && (
                                                    <p className="mt-1 text-sm font-medium text-gray-500">
                                                        {post.subtitle}
                                                    </p>
                                                )}
                                                {post.excerpt && (
                                                    <p className="mt-5 text-sm/6 text-gray-600">
                                                        {post.excerpt}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
