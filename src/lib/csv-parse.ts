/**
 * Mini CSV parser (PBI-30). Client-safe.
 *
 * Suporta:
 * - Delimitador vírgula OU ponto-vírgula (auto-detecta pelo header)
 * - Aspas em valor com vírgula: "Silva, João"
 * - Header obrigatório na primeira linha
 * - Encoding UTF-8 (browser File API já entrega)
 *
 * NÃO suporta:
 * - Aspas escapadas dentro de aspas ("" → ")
 * - Newlines dentro de campo
 * - Headers vazios
 *
 * Pra MVP de importação de barbearia (poucas centenas de linhas,
 * exportadas do Excel/Sheets) cobre 99%.
 */

export type CsvRow = Record<string, string>;
export type CsvParseResult = {
  headers: string[];
  rows: CsvRow[];
  delimiter: "," | ";";
  errors: Array<{ line: number; message: string }>;
};

export function parseCsv(text: string): CsvParseResult {
  const errors: Array<{ line: number; message: string }> = [];
  const cleaned = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const lines = cleaned.split("\n").filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], delimiter: ",", errors: [{ line: 0, message: "CSV vazio" }] };
  }

  const headerLine = lines[0]!;
  const delimiter: "," | ";" =
    (headerLine.match(/;/g)?.length ?? 0) > (headerLine.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";

  const headers = splitCsvLine(headerLine, delimiter).map((h) =>
    h.trim().toLowerCase(),
  );

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!, delimiter);
    if (cells.length !== headers.length) {
      errors.push({
        line: i + 1,
        message: `${cells.length} colunas, esperava ${headers.length}`,
      });
      continue;
    }
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx]!.trim();
    });
    rows.push(row);
  }

  return { headers, rows, delimiter, errors };
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let buf = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === delimiter && !inQuotes) {
      cells.push(buf);
      buf = "";
      continue;
    }
    buf += c;
  }
  cells.push(buf);
  return cells;
}

/**
 * Detecta colunas-chave do CSV pra mapear automaticamente.
 * Aceita variações comuns (Nome / nome / Name / Cliente / etc).
 */
export function detectColumns(headers: string[]): {
  name: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
} {
  return {
    name: pickHeader(headers, ["nome", "name", "cliente", "customer"]),
    email: pickHeader(headers, ["email", "e-mail", "mail"]),
    phone: pickHeader(headers, ["telefone", "phone", "celular", "fone", "whatsapp"]),
    birthDate: pickHeader(headers, ["aniversario", "aniversário", "nascimento", "birth", "birthday", "data_nascimento"]),
  };
}

function pickHeader(headers: string[], candidates: string[]): string | null {
  for (const c of candidates) {
    if (headers.includes(c)) return c;
  }
  return null;
}
