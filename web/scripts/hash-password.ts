/**
 * Gera o hash bcrypt da senha do admin para o .env:
 *   npx tsx scripts/hash-password.ts "minha-senha-forte"
 */
import { hash } from "bcryptjs";

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error("Uso: npx tsx scripts/hash-password.ts <senha com 8+ caracteres>");
  process.exit(1);
}

hash(password, 12).then((h) => {
  // $ escapado — o @next/env expande $var em arquivos .env
  console.log(`ADMIN_PASSWORD_HASH=${h.replace(/\$/g, "\\$")}`);
});
