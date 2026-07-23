"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/money";
import type { CouponRow } from "@/db/schema";
import type { CouponDiscountType } from "@/db/types";

type DiscountTypeDraft = "" | CouponDiscountType;

interface CouponDraft {
  code: string;
  active: boolean;
  productDiscountType: DiscountTypeDraft;
  productDiscountValue: string;
  shippingDiscountType: DiscountTypeDraft;
  shippingDiscountValue: string;
  cumulative: boolean;
  /** vazio = ilimitado */
  usageLimit: string;
  /** vazio = sem validade. Formato yyyy-mm-dd (input type=date). */
  expiresAt: string;
}

const EMPTY_DRAFT: CouponDraft = {
  code: "",
  active: true,
  productDiscountType: "",
  productDiscountValue: "",
  shippingDiscountType: "",
  shippingDiscountValue: "",
  cumulative: false,
  usageLimit: "",
  expiresAt: "",
};

const FIELD_INPUT_CLASS = "rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm dark:border-potinho-cinza/30 dark:bg-potinho-noite dark:text-potinho-bege";
const FIELD_LABEL_CLASS = "flex flex-col gap-1 text-xs text-potinho-texto/60 dark:text-potinho-bege/60";

function draftFromCoupon(c: CouponRow): CouponDraft {
  return {
    code: c.code,
    active: c.active,
    productDiscountType: c.productDiscountType ?? "",
    productDiscountValue:
      c.productDiscountValue === null
        ? ""
        : String(c.productDiscountType === "percent" ? c.productDiscountValue : c.productDiscountValue / 100),
    shippingDiscountType: c.shippingDiscountType ?? "",
    shippingDiscountValue:
      c.shippingDiscountValue === null
        ? ""
        : String(c.shippingDiscountType === "percent" ? c.shippingDiscountValue : c.shippingDiscountValue / 100),
    cumulative: c.cumulative,
    usageLimit: c.usageLimit === null ? "" : String(c.usageLimit),
    expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "",
  };
}

function draftToPayload(d: CouponDraft) {
  const toValue = (type: DiscountTypeDraft, raw: string) =>
    !type || raw === "" ? null : type === "percent" ? Math.round(parseFloat(raw)) : Math.round(parseFloat(raw) * 100);
  return {
    code: d.code.trim().toUpperCase(),
    active: d.active,
    productDiscountType: d.productDiscountType || null,
    productDiscountValue: toValue(d.productDiscountType, d.productDiscountValue),
    shippingDiscountType: d.shippingDiscountType || null,
    shippingDiscountValue: toValue(d.shippingDiscountType, d.shippingDiscountValue),
    cumulative: d.cumulative,
    usageLimit: d.usageLimit === "" ? null : Math.max(1, Math.round(parseFloat(d.usageLimit))),
    // fim do dia escolhido — "válido até 10/08" deve cobrir o dia 10/08 inteiro
    expiresAt: d.expiresAt === "" ? null : `${d.expiresAt}T23:59:59`,
  };
}

function summarizeDiscount(type: CouponDiscountType | null, value: number | null): string {
  if (!type || value === null) return "—";
  return type === "percent" ? `${value}%` : formatBRL(value);
}

function summarizeUsage(usageCount: number, usageLimit: number | null): string {
  return usageLimit === null ? `${usageCount} (ilimitado)` : `${usageCount}/${usageLimit}`;
}

function summarizeExpiry(expiresAt: Date | string | null): string {
  if (!expiresAt) return "—";
  return new Date(expiresAt).toLocaleDateString("pt-BR");
}

interface DiscountFieldsProps {
  label: string;
  type: DiscountTypeDraft;
  value: string;
  onTypeChange: (t: DiscountTypeDraft) => void;
  onValueChange: (v: string) => void;
}

function DiscountFields({ label, type, value, onTypeChange, onValueChange }: DiscountFieldsProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className={FIELD_LABEL_CLASS}>
        {label}
        <select
          value={type}
          onChange={(e) => onTypeChange(e.target.value as DiscountTypeDraft)}
          className={FIELD_INPUT_CLASS}
        >
          <option value="">sem desconto</option>
          <option value="percent">porcentagem</option>
          <option value="flat">valor fixo (R$)</option>
        </select>
      </label>
      {type && (
        <label className={FIELD_LABEL_CLASS}>
          {type === "percent" ? "% de desconto" : "desconto (R$)"}
          <input
            type="number"
            min={0}
            max={type === "percent" ? 100 : undefined}
            step={type === "percent" ? "1" : "0.01"}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            className={`w-32 ${FIELD_INPUT_CLASS}`}
          />
        </label>
      )}
    </div>
  );
}

interface CouponFormProps {
  draft: CouponDraft;
  onChange: (d: CouponDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  saveLabel: string;
}

function CouponForm({ draft, onChange, onSave, onCancel, saving, error, saveLabel }: CouponFormProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-potinho-bege p-4 dark:border-potinho-cinza/30">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          required
          type="text"
          placeholder="código (ex.: BEMVINDO10)"
          value={draft.code}
          onChange={(e) => onChange({ ...draft, code: e.target.value.toUpperCase() })}
          className={`${FIELD_INPUT_CLASS} uppercase tracking-wider`}
        />
        <label className="flex items-center gap-2 self-center rounded-2xl bg-potinho-fundo px-4 py-2 text-xs font-semibold lowercase text-potinho-texto/70 dark:bg-potinho-noite dark:text-potinho-bege/70">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => onChange({ ...draft, active: e.target.checked })}
          />
          ativo
        </label>
      </div>

      <DiscountFields
        label="desconto no produto"
        type={draft.productDiscountType}
        value={draft.productDiscountValue}
        onTypeChange={(t) => onChange({ ...draft, productDiscountType: t, productDiscountValue: "" })}
        onValueChange={(v) => onChange({ ...draft, productDiscountValue: v })}
      />
      <DiscountFields
        label="desconto no frete"
        type={draft.shippingDiscountType}
        value={draft.shippingDiscountValue}
        onTypeChange={(t) => onChange({ ...draft, shippingDiscountType: t, shippingDiscountValue: "" })}
        onValueChange={(v) => onChange({ ...draft, shippingDiscountValue: v })}
      />

      <label className="flex items-start gap-3 rounded-2xl bg-potinho-fundo px-4 py-3 text-xs leading-relaxed text-potinho-texto/70 dark:bg-potinho-noite dark:text-potinho-bege/70">
        <input
          type="checkbox"
          checked={draft.cumulative}
          onChange={(e) => onChange({ ...draft, cumulative: e.target.checked })}
          className="mt-0.5"
        />
        <span>
          cumulativo — pode ser usado junto com itens que já estão em promoção (desconto de tamanho no cadastro
          do produto). desmarcado: o cupom é recusado se o carrinho tiver algum item já promocional.
        </span>
      </label>

      <div className="flex flex-wrap gap-3">
        <label className={FIELD_LABEL_CLASS}>
          limite de uso
          <input
            type="number"
            min={1}
            step="1"
            placeholder="ilimitado"
            value={draft.usageLimit}
            onChange={(e) => onChange({ ...draft, usageLimit: e.target.value })}
            className={`w-32 ${FIELD_INPUT_CLASS}`}
          />
        </label>
        <label className={FIELD_LABEL_CLASS}>
          válido até
          <input
            type="date"
            placeholder="sem validade"
            value={draft.expiresAt}
            onChange={(e) => onChange({ ...draft, expiresAt: e.target.value })}
            className={FIELD_INPUT_CLASS}
          />
        </label>
      </div>

      {error && <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-full bg-potinho-chocolate px-5 py-2 text-sm font-semibold lowercase text-potinho-bege hover:bg-potinho-texto disabled:opacity-40"
        >
          {saving ? "salvando…" : saveLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border-2 border-potinho-bege px-5 py-2 text-sm font-semibold lowercase text-potinho-chocolate hover:bg-white disabled:opacity-40 dark:border-potinho-cinza/30 dark:text-potinho-caramelo dark:hover:bg-white/5"
        >
          cancelar
        </button>
      </div>
    </div>
  );
}

/** CRUD de cupons (campo de checkout + admin) — desconto no produto e/ou no frete, cumulativo ou não. */
export default function CuponsManager({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState<CouponDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CouponDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftToPayload(newDraft)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível salvar");
      setNewDraft(EMPTY_DRAFT);
      setCreating(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftToPayload(editDraft)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível salvar");
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(coupon: CouponRow) {
    setBusyId(coupon.id);
    try {
      const res = await fetch(`/api/admin/cupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftToPayload({ ...draftFromCoupon(coupon), active: !coupon.active })),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      // ponytail: toggle rápido sem feedback de erro dedicado — a lista simplesmente não muda
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(coupon: CouponRow) {
    if (!confirm(`remover o cupom "${coupon.code}"? essa ação não pode ser desfeita.`)) return;
    setBusyId(coupon.id);
    try {
      const res = await fetch(`/api/admin/cupons/${coupon.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Não foi possível remover o cupom");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-potinho-card dark:bg-potinho-carvao">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-potinho-bege text-xs uppercase tracking-widest text-potinho-texto/50 dark:border-potinho-cinza/20 dark:text-potinho-bege/50">
              <th className="px-3 py-3">código</th>
              <th className="px-3 py-3">produto</th>
              <th className="px-3 py-3">frete</th>
              <th className="px-3 py-3">cumulativo</th>
              <th className="px-3 py-3">usos</th>
              <th className="px-3 py-3">validade</th>
              <th className="px-3 py-3">status</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) =>
              editingId === coupon.id ? (
                <tr key={coupon.id}>
                  <td colSpan={8} className="px-3 py-3">
                    <CouponForm
                      draft={editDraft}
                      onChange={setEditDraft}
                      onSave={() => handleUpdate(coupon.id)}
                      onCancel={() => setEditingId(null)}
                      saving={saving}
                      error={error}
                      saveLabel="salvar alterações"
                    />
                  </td>
                </tr>
              ) : (
                <tr
                  key={coupon.id}
                  className="border-b border-potinho-bege/50 last:border-0 hover:bg-potinho-fundo dark:border-potinho-cinza/10 dark:hover:bg-white/5"
                >
                  <td className="px-3 py-3 font-semibold uppercase tracking-wider text-potinho-texto dark:text-potinho-bege">
                    {coupon.code}
                  </td>
                  <td className="px-3 py-3">{summarizeDiscount(coupon.productDiscountType, coupon.productDiscountValue)}</td>
                  <td className="px-3 py-3">{summarizeDiscount(coupon.shippingDiscountType, coupon.shippingDiscountValue)}</td>
                  <td className="px-3 py-3 lowercase">{coupon.cumulative ? "sim" : "não"}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{summarizeUsage(coupon.usageCount, coupon.usageLimit)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{summarizeExpiry(coupon.expiresAt)}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(coupon)}
                      disabled={busyId === coupon.id}
                      aria-pressed={coupon.active}
                      className={`rounded-full px-3 py-1 text-xs font-semibold lowercase transition-colors disabled:opacity-40 ${
                        coupon.active
                          ? "bg-potinho-bege text-potinho-chocolate"
                          : "bg-potinho-fundo text-potinho-texto/50 ring-1 ring-potinho-cinza/40 dark:bg-potinho-noite dark:text-potinho-bege/50"
                      }`}
                    >
                      {coupon.active ? "ativo" : "inativo"}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(coupon.id);
                        setEditDraft(draftFromCoupon(coupon));
                        setError(null);
                      }}
                      className="mr-3 text-xs text-potinho-chocolate hover:underline dark:text-potinho-caramelo"
                    >
                      editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(coupon)}
                      disabled={busyId === coupon.id}
                      className="text-xs text-rose-500 hover:underline disabled:opacity-40 dark:text-rose-400"
                    >
                      remover
                    </button>
                  </td>
                </tr>
              ),
            )}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-potinho-texto/50 dark:text-potinho-bege/50">
                  nenhum cupom cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* erro de remover/toggle (fora do form de criar/editar, que já mostra o seu próprio) */}
      {error && !creating && editingId === null && <p className="text-sm text-rose-500 dark:text-rose-400">{error}</p>}

      {creating ? (
        <CouponForm
          draft={newDraft}
          onChange={setNewDraft}
          onSave={handleCreate}
          onCancel={() => {
            setCreating(false);
            setError(null);
          }}
          saving={saving}
          error={error}
          saveLabel="salvar cupom"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setNewDraft(EMPTY_DRAFT);
            setCreating(true);
            setError(null);
          }}
          className="self-start rounded-full border-2 border-potinho-bege px-5 py-2 text-sm font-semibold lowercase text-potinho-chocolate hover:bg-potinho-fundo dark:border-potinho-cinza/30 dark:text-potinho-caramelo dark:hover:bg-white/5"
        >
          + criar cupom
        </button>
      )}
    </div>
  );
}
