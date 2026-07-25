/** Dígito verificador oficial (Receita Federal) — mesmo algoritmo pra CPF e CNPJ, só muda o peso. */
function checkDigit(digits: number[], weights: number[]): number {
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const nums = cpf.split("").map(Number);
  const d1 = checkDigit(nums.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = checkDigit(nums.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === nums[9] && d2 === nums[10];
}

export function isValidCNPJ(raw: string): boolean {
  const cnpj = raw.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const nums = cnpj.split("").map(Number);
  const d1 = checkDigit(nums.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = checkDigit(nums.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === nums[12] && d2 === nums[13];
}

/** Detecta CPF (11 dígitos) ou CNPJ (14) pelo tamanho e valida o dígito verificador. */
export function isValidDocument(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
}
