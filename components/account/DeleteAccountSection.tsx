"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { deleteOwnAccount } from "@/app/actions/account";
import { DELETE_ACCOUNT_CONFIRM_WORD } from "@/lib/account";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteAccountSectionProps = {
  variant?: "dj" | "client";
};

export function DeleteAccountSection({
  variant = "client",
}: DeleteAccountSectionProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmWord, setConfirmWord] = useState("");
  const [busy, setBusy] = useState(false);

  const canConfirm = confirmWord.trim() === DELETE_ACCOUNT_CONFIRM_WORD;

  async function handleDelete() {
    if (!canConfirm || busy) return;
    setBusy(true);
    const result = await deleteOwnAccount({ confirmWord });
    if (!result.ok) {
      setBusy(false);
      showToast(result.error, "error");
      return;
    }

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Account is already gone — ignore sign-out failures.
    }

    showToast("Účet bol natrvalo zmazaný.", "success");
    router.replace("/login?deleted=1");
    router.refresh();
  }

  return (
    <>
      <Card className="rounded-3xl border-red-500/25 bg-red-500/[0.04] backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-red-200">
            <AlertTriangle className="size-4" />
            Nebezpečná zóna
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Zmazanie účtu je trvalé. Stratíš profil
            {variant === "dj"
              ? ", rezervácie, dokumenty a dáta v katalógu"
              : ", rezervácie a dokumenty"}
            . Túto akciu nejde vrátiť späť.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setConfirmWord("");
              setOpen(true);
            }}
            className="gap-1.5 rounded-full border-red-500/35 text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="size-3.5" />
            Zmazať účet
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (busy) return;
          setOpen(next);
          if (!next) setConfirmWord("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Naozaj zmazať účet?</DialogTitle>
            <DialogDescription>
              Táto akcia je nezvratná. Všetky dáta spojené s účtom budú
              odstránené. Ak si istý/á, napíš{" "}
              <span className="font-semibold text-red-300">
                {DELETE_ACCOUNT_CONFIRM_WORD}
              </span>{" "}
              do poľa nižšie.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              Potvrdenie ({DELETE_ACCOUNT_CONFIRM_WORD})
            </Label>
            <Input
              id="delete-confirm"
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
              placeholder={DELETE_ACCOUNT_CONFIRM_WORD}
              autoComplete="off"
              disabled={busy}
              className="rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="rounded-full"
            >
              Zrušiť
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!canConfirm || busy}
              onClick={() => void handleDelete()}
              className="gap-1.5 rounded-full"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Áno, zmazať natrvalo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
