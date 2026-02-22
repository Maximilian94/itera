import imageUrlBuilder, { type SanityImageSource } from "@sanity/image-url";
import { client } from "@/sanity/client";
import Link from "next/link";

const POSTS_QUERY = `*[_type == "post"] | order(publishedAt desc) {
  _id,
  title,
  slug,
  publishedAt,
  image,
  "excerpt": pt::text(body)[0...160]
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
    slug: { current: string };
    publishedAt: string;
    image?: SanityImageSource;
    excerpt?: string;
};

export default async function BlogsPage() {
    const posts = await client.fetch<Post[]>(POSTS_QUERY, {}, options);

    return (
        <main className="container mx-auto min-h-screen max-w-3xl p-8 flex flex-col gap-8">
            <div>
                <Link href="/" className="text-sky-600 hover:underline">
                    ← Voltar ao início
                </Link>
                <h1 className="text-4xl font-bold mt-4">Blog</h1>
                <p className="text-gray-600 mt-2">
                    Confira nossas últimas postagens
                </p>
            </div>

            <ul className="flex flex-col gap-8">
                {posts.map((post) => {
                    const postImageUrl = post.image
                        ? urlFor(post.image)?.width(550).height(310).url()
                        : null;

                    return (
                        <li key={post._id}>
                            <Link
                                href={`/blogs/${post.slug.current}`}
                                className="block group"
                            >
                                <article className="border rounded-xl p-6 hover:border-sky-200 transition-colors">
                                    {postImageUrl && (
                                        <img
                                            src={postImageUrl}
                                            alt={post.title}
                                            className="aspect-video rounded-lg object-cover w-full mb-4"
                                            width={550}
                                            height={310}
                                        />
                                    )}
                                    <h2 className="text-2xl font-semibold group-hover:text-sky-600 transition-colors">
                                        {post.title}
                                    </h2>
                                    <time
                                        dateTime={post.publishedAt}
                                        className="text-sm text-gray-500 block mt-2"
                                    >
                                        {new Date(post.publishedAt).toLocaleDateString("pt-BR")}
                                    </time>
                                    {post.excerpt && (
                                        <p className="mt-3 text-gray-600 line-clamp-2">
                                            {post.excerpt}...
                                        </p>
                                    )}
                                </article>
                            </Link>
                        </li>
                    );
                })}
            </ul>

            {posts.length === 0 && (
                <p className="text-gray-500">Nenhuma postagem publicada ainda.</p>
            )}
        </main>
    );
}
