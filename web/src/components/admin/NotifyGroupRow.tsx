"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  colorId: string;
  colorLabel: string;
  emails: string[];
}

/** Botão "avisar todos" de uma cor que voltou ao estoque (9.5 AC3). */
export default function NotifyGroupRow({ colorId, colorLabel, emails }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleNotify() {
    setStatus("loading");
    try {
      const res = await fetch("/api/admin/avise-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colorId, colorLabel }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-potinho-fundo p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full ring-1 ring-potinho-cinza/40" style={{ backgroundColor: colorId }} />
          <p className="font-semibold lowercase text-potinho-texto">{colorLabel}</p>
        </div>
        <p className="truncate text-xs text-potinho-texto/60">{emails.join(", ")}</p>
      </div>
      <button
        type="button"
        onClick={handleNotify}
        disabled={status === "loading" || status === "done"}
        className="whitespace-nowrap rounded-full bg-potinho-chocolate px-5 py-2 text-xs font-semibold lowercase text-potinho-bege hover:bg-potinho-texto disabled:opacity-40"
      >
        {status === "done" ? "avisado ✓" : status === "loading" ? "avisando…" : `avisar ${emails.length}`}
      </button>
      {status === "error" && <p className="text-xs text-rose-500">falhou</p>}
    </li>
  );
}
