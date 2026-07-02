"use client";

import { useEffect, useState } from "react";
import type { Font } from "opentype.js";
import type { Param } from "@/db/types";
import { validateCustomText } from "@/lib/text-validation";
import { fontSupportsChar, loadFont } from "@/components/viewer/textGeometry";
import { usePersonalization } from "@/store/personalization";
import { formatBRL } from "@/lib/money";

/**
 * Formulário 100% gerado do param_schema (C-02) — nenhum campo hardcoded.
 * Um segundo produto com schema diferente renderiza sem alteração de código (PRD §12).
 */

function TextField({ param, fontUrl }: { param: Extract<Param, { type: "text" }>; fontUrl?: string }) {
  const value = usePersonalization((s) => s.values[param.key] ?? "");
  const error = usePersonalization((s) => s.errors[param.key]);
  const { setValue, setError } = usePersonalization.getState();
  const [font, setFont] = useState<Font | null>(null);

  useEffect(() => {
    if (!fontUrl) return;
    let alive = true;
    loadFont(fontUrl).then((f) => alive && setFont(f)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [fontUrl]);

  function handleChange(raw: string) {
    setValue(param.key, raw);
    if (raw.trim() === "") {
      setError(param.key, undefined);
      return;
    }
    const result = validateCustomText(raw, param, font ? (c) => fontSupportsChar(font, c) : undefined);
    setError(param.key, result.ok ? undefined : result.error);
  }

  return (
    <div>
      <label htmlFor={param.key} className="mb-1 block text-sm font-medium text-zinc-800">
        {param.label}
      </label>
      <input
        id={param.key}
        type="text"
        inputMode="text"
        autoComplete="off"
        maxLength={param.max + 4}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={`${param.min}–${param.max} caracteres`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${param.key}-error` : undefined}
        className={`w-full rounded-xl border px-4 py-3 text-base uppercase tracking-wide text-zinc-900 placeholder:normal-case placeholder:text-zinc-400 outline-none transition-colors ${
          error
            ? "border-red-400 bg-red-50 focus:border-red-500"
            : "border-zinc-300 bg-white focus:border-zinc-900"
        }`}
      />
      {error ? (
        <p id={`${param.key}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      ) : (
        <p className="mt-1 text-xs text-zinc-500">
          Aparece gravado no produto — representação aproximada na tela
        </p>
      )}
    </div>
  );
}

function ColorField({ param }: { param: Extract<Param, { type: "color" }> }) {
  const value = usePersonalization((s) => s.values[param.key]);
  const { setValue } = usePersonalization.getState();

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-800">{param.label}</legend>
      <div className="flex flex-wrap gap-2">
        {param.options.map((opt) => {
          const selected = value?.toUpperCase() === opt.hex.toUpperCase();
          return (
            <button
              key={opt.hex}
              type="button"
              title={opt.label}
              aria-label={`${param.label}: ${opt.label}`}
              aria-pressed={selected}
              onClick={() => setValue(param.key, opt.hex)}
              className={`h-10 w-10 rounded-full border-2 transition-transform ${
                selected ? "scale-110 border-zinc-900 ring-2 ring-zinc-900/20" : "border-zinc-200"
              }`}
              style={{ backgroundColor: opt.hex }}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

function SelectField({ param }: { param: Extract<Param, { type: "select" }> }) {
  const value = usePersonalization((s) => s.values[param.key]);
  const { setValue } = usePersonalization.getState();

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-800">{param.label}</legend>
      <div className="flex flex-wrap gap-2">
        {param.options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              onClick={() => setValue(param.key, opt.value)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                selected
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500"
              }`}
            >
              {opt.label}
              {opt.priceDelta !== 0 && (
                <span className="ml-1 text-xs opacity-70">
                  {opt.priceDelta > 0 ? "+" : ""}
                  {formatBRL(opt.priceDelta)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function PersonalizationForm({ fontUrl }: { fontUrl?: string }) {
  const schema = usePersonalization((s) => s.product?.paramSchema);
  if (!schema) return null;

  return (
    <div className="flex flex-col gap-5">
      {schema.map((param) => {
        switch (param.type) {
          case "text":
            return <TextField key={param.key} param={param} fontUrl={fontUrl} />;
          case "color":
            return <ColorField key={param.key} param={param} />;
          case "select":
            return <SelectField key={param.key} param={param} />;
        }
      })}
    </div>
  );
}
