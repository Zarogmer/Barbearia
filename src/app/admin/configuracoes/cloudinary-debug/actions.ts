"use server";

import { auth } from "@/lib/auth";
import { isCloudinaryConfigured, signUpload } from "@/lib/server/cloudinary";

export type CloudinaryDebugResult = {
  ok: boolean;
  status?: number;
  signedString?: string;
  signature?: string;
  body?: string;
  message?: string;
};

// PNG 1x1 transparente (~67 bytes) — payload minimo pra testar upload.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/**
 * Faz um upload de teste com uma imagem 1x1 transparent pra validar
 * que CLOUDINARY_API_SECRET no env bate com o do dashboard. Retorna
 * detalhes do erro (status + body) pro admin diagnosticar sem precisar
 * de DevTools.
 *
 * So OWNER pode chamar — info de erro pode vazar metadata.
 */
export async function testCloudinaryUploadAction(): Promise<CloudinaryDebugResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { ok: false, message: "Sem permissão (OWNER apenas)." };

  if (!isCloudinaryConfigured()) {
    return {
      ok: false,
      message:
        "Cloudinary não configurado. Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no .env (ou Railway).",
    };
  }

  const folder = `lustro-debug/${owner.organizationId}`;
  const sig = signUpload(folder);
  const signedString = `folder=${folder}&timestamp=${sig.timestamp}`;

  const form = new FormData();
  const bin = Buffer.from(TINY_PNG_BASE64, "base64");
  form.append("file", new Blob([bin], { type: "image/png" }), "test.png");
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", folder);

  let res: Response;
  try {
    res = await fetch(
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
      { method: "POST", body: form },
    );
  } catch (e) {
    return {
      ok: false,
      message: `Falha de rede: ${e instanceof Error ? e.message : String(e)}`,
      signedString,
      signature: sig.signature,
    };
  }

  const body = await res.text();

  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      signedString,
      signature: sig.signature,
      message: "Upload OK — Cloudinary aceita esse secret.",
    };
  }

  let msg = `HTTP ${res.status}`;
  try {
    const json = JSON.parse(body) as { error?: { message?: string } };
    if (json.error?.message) msg = json.error.message;
  } catch {
    /* nao-JSON */
  }

  return {
    ok: false,
    status: res.status,
    signedString,
    signature: sig.signature,
    body,
    message: msg,
  };
}
