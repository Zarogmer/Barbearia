import "server-only";

import crypto from "node:crypto";

/**
 * Assinatura de upload pra Cloudinary (frontend faz POST direto, sem
 * a imagem passar pelo nosso server). Server só assina os parâmetros.
 *
 * Setup: Cloudinary → Settings → Security → desabilita unsigned uploads
 * + cria API key. Env vars no Railway:
 *   CLOUDINARY_CLOUD_NAME = nome da conta
 *   CLOUDINARY_API_KEY = key publica
 *   CLOUDINARY_API_SECRET = secret (server-only)
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = mesmo nome (client usa pra URLs)
 *
 * Free tier: 25GB storage + 25GB bandwidth/mês.
 */

export type UploadSignature = {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
};

export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Assina um upload pra um folder específico (geralmente "org-{slug}").
 * Cloudinary valida que o folder/timestamp não foram alterados.
 */
export function signUpload(folder: string): UploadSignature {
  // .trim() defende contra copy-paste de env var com espaço/newline acidental.
  // Cloudinary retorna "Invalid Signature" 401 se houver whitespace no secret.
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary não configurado (ver .env)");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary: SHA-1 dos params ordenados alfabeticamente + secret
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  return { signature, timestamp, apiKey, cloudName, folder };
}
