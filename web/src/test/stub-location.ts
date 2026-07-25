/**
 * Substitui `window.location` em teste (jsdom não faz navegação real, então testes que
 * verificam redirect precisam de um objeto gravável).
 *
 * Usa `Object.defineProperty` em vez de `delete window.location` + atribuição porque o DOM
 * tipa `window.location` como `string & Location` (dá pra atribuir string pra navegar) — o
 * `delete` cai em TS2704 (propriedade readonly) e a atribuição em TS2322.
 *
 * Guarde o valor original antes de chamar e devolva no cleanup:
 *
 *     const original = window.location;
 *     stubLocation({ ...original, href: "" });
 *     // ...
 *     stubLocation(original);
 */
export function stubLocation(value: Location): void {
  Object.defineProperty(window, "location", { configurable: true, writable: true, value });
}
