"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/toast-context";
import { submitContact } from "@/app/actions/contact";

type ContactAdminFormProps = {
  className?: string;
};

/**
 * Public contact form that e-mails the platform admin (ADMIN_EMAIL)
 * with Reply-To set to the visitor so admin can answer directly.
 */
export function ContactAdminForm({ className }: ContactAdminFormProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      showToast("Vyplň všetky polia formulára.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitContact({
        name,
        email,
        subject,
        message,
      });
      if (!result.ok) {
        showToast(result.error ?? "Správu sa nepodarilo odoslať.", "error");
        return;
      }
      showToast("Správa bola odoslaná, čoskoro sa ozveme.", "success");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      showToast("Správu sa nepodarilo odoslať. Skús to znova.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className ?? "space-y-4"}>
      <div className="space-y-2">
        <Label htmlFor="kontakt-name">Meno</Label>
        <Input
          id="kontakt-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tvoje meno"
          required
          className="h-11 rounded-xl border-white/10 bg-white/[0.03]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="kontakt-email">Email</Label>
        <Input
          id="kontakt-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="h-11 rounded-xl border-white/10 bg-white/[0.03]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="kontakt-subject">Predmet správy</Label>
        <Input
          id="kontakt-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="O čom nám píšeš?"
          required
          className="h-11 rounded-xl border-white/10 bg-white/[0.03]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="kontakt-message">Správa</Label>
        <Textarea
          id="kontakt-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Napíš nám, čo máš na mysli…"
          rows={5}
          required
          className="rounded-xl border-white/10 bg-white/[0.03]"
        />
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="mt-2 h-12 w-full gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-sm font-semibold text-white shadow-[0_16px_40px_-12px_oklch(0.6_0.26_295)] transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Odosielam…
          </>
        ) : (
          <>
            <Send className="size-4" />
            Odoslať správu
          </>
        )}
      </Button>
    </form>
  );
}
