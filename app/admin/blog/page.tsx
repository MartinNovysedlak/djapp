"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FilePlus2, Loader2, Newspaper, Pencil } from "lucide-react";
import { listAdminBlogPosts, type BlogPost } from "@/app/actions/blog";
export default function AdminBlogListPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BlogPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listAdminBlogPosts();
      if (cancelled) return;
      if (!result.ok) setError(result.error);
      else setItems(result.items);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Newspaper className="size-6 text-violet-300" />
            Blog
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Vytváraj a upravuj články pre verejnú sekciu Blog.
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          <FilePlus2 className="size-4" />
          Nový článok
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" />
          Načítavam…
        </div>
      ) : error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : items.length === 0 ? (
        <p className="rounded-3xl border border-white/10 bg-card/50 px-5 py-8 text-sm text-zinc-500">
          Zatiaľ žiadne články.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((post) => (
            <Link
              key={post.id}
              href={`/admin/blog/${post.id}`}
              className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-card/60 px-5 py-4 transition-colors hover:border-violet-500/30 hover:bg-violet-500/5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{post.title}</p>
                <p className="truncate text-xs text-zinc-500">
                  /blog/{post.slug}
                  {post.published_at
                    ? ` · ${new Date(post.published_at).toLocaleDateString("sk-SK")}`
                    : ""}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                  post.status === "published"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-white/5 text-zinc-400"
                }`}
              >
                <Pencil className="size-3" />
                {post.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
