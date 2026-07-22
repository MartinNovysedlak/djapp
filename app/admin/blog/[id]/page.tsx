"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2, Save, Trash2, X } from "lucide-react";
import {
  deleteBlogPost,
  getAdminBlogPost,
  saveBlogPost,
  type BlogStatus,
} from "@/app/actions/blog";
import { BlogRichEditor } from "@/components/blog/BlogRichEditor";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast-context";

function toIsoDate(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function AdminBlogEditPage() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const router = useRouter();
  const { showToast } = useToast();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentHtml, setContentHtml] = useState("<p></p>");
  const [coverUrl, setCoverUrl] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [status, setStatus] = useState<BlogStatus>("draft");
  const [publishedDate, setPublishedDate] = useState("");
  const [postId, setPostId] = useState<string | undefined>(
    isNew ? undefined : params.id
  );

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    void (async () => {
      const result = await getAdminBlogPost(params.id);
      if (cancelled) return;
      if (!result.ok) {
        showToast(result.error, "error");
        setLoading(false);
        return;
      }
      const p = result.post;
      setPostId(p.id);
      setTitle(p.title);
      setSlug(p.slug);
      setExcerpt(p.excerpt);
      setContentHtml(p.content_html || "<p></p>");
      setCoverUrl(p.cover_url || "");
      setSeoTitle(p.seo_title || "");
      setSeoDescription(p.seo_description || "");
      setStatus(p.status);
      setPublishedDate(toIsoDate(p.published_at));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, params.id, showToast]);

  async function uploadCover(file: File) {
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-blog-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload zlyhal");
      setCoverUrl(data.url);
      showToast("Cover fotka nahraná.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload zlyhal", "error");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    const publishedAt = publishedDate
      ? new Date(`${publishedDate}T12:00:00`).toISOString()
      : null;
    const result = await saveBlogPost({
      id: postId,
      title,
      excerpt,
      contentHtml,
      coverUrl: coverUrl || null,
      seoTitle,
      seoDescription,
      status,
      publishedAt,
    });
    setSaving(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Článok uložený.", "success");
    if (result.slug) setSlug(result.slug);
    if (isNew && result.id) {
      router.replace(`/admin/blog/${result.id}`);
      setPostId(result.id);
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!postId || !window.confirm("Naozaj zmazať článok?")) return;
    setSaving(true);
    const result = await deleteBlogPost(postId);
    setSaving(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Článok zmazaný.", "success");
    router.push("/admin/blog");
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin" />
        Načítavam článok…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/blog"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Späť na blog
        </Link>
        <div className="flex flex-wrap gap-2">
          {!isNew ? (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={handleDelete}
              className="rounded-full border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
            >
              <Trash2 className="size-4" />
              Zmazať
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-full"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Uložiť
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Názov</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Názov článku"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Perex (krátky popis)</Label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
              placeholder="1–2 vety pre zoznam článkov"
            />
          </div>
          <div className="space-y-2">
            <Label>Obsah</Label>
            <p className="text-xs text-zinc-500">
              Fotku do textu pridáš tlačidlom s ikonou obrázka v toolbare editora.
            </p>
            <BlogRichEditor
              key={postId ?? "new"}
              value={contentHtml}
              onChange={setContentHtml}
            />
          </div>
        </div>

        <aside className="h-fit space-y-4 rounded-3xl border border-white/10 bg-card/60 p-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BlogStatus)}
              className="h-10 w-full rounded-xl border border-input bg-black/30 px-3 text-sm text-white"
            >
              <option value="draft">Koncept</option>
              <option value="published">Publikované</option>
            </select>
          </div>

          <DatePicker
            label="Dátum publikovania"
            value={publishedDate}
            onChange={setPublishedDate}
            allowPastDates
            placeholder="Vyber dátum"
          />

          <div className="space-y-2">
            <Label>Cover fotka</Label>
            {coverUrl ? (
              <div className="relative overflow-hidden rounded-2xl border border-white/10">
                <div className="relative aspect-[16/10] w-full">
                  <Image
                    src={coverUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCoverUrl("")}
                  className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-zinc-200 hover:bg-black/90"
                  title="Odstrániť cover"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploadingCover}
                onClick={() => coverInputRef.current?.click()}
                className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-sm text-zinc-400 transition-colors hover:border-violet-500/40 hover:text-zinc-200"
              >
                {uploadingCover ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <ImagePlus className="size-5 text-violet-300" />
                )}
                Nahrať cover
              </button>
            )}
            {coverUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingCover}
                onClick={() => coverInputRef.current?.click()}
                className="w-full rounded-full"
              >
                {uploadingCover ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="size-3.5" />
                )}
                Zmeniť fotku
              </Button>
            ) : null}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadCover(file);
              }}
            />
          </div>

          <div className="space-y-3 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              SEO
            </p>
            <div className="space-y-2">
              <Label>SEO názov</Label>
              <Input
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={title || "Ak prázdne = názov článku"}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>SEO popis</Label>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
                placeholder={excerpt || "Ak prázdne = perex"}
              />
              <p className="text-[11px] text-zinc-500">
                Ideálne 140–160 znakov. Teraz: {seoDescription.length || excerpt.length}
              </p>
            </div>
          </div>

          {slug ? (
            <Link
              href={`/blog/${slug}`}
              target="_blank"
              className="block text-xs text-violet-300 hover:underline"
            >
              Náhľad článku
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
