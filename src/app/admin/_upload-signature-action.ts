"use server";

import { auth } from "@/lib/auth";
import {
  isCloudinaryConfigured,
  signUpload,
  type UploadSignature,
} from "@/lib/server/cloudinary";

/**
 * Gera assinatura de upload pra Cloudinary. Gate de membership: só
 * usuário com membership ativa pode pedir. Folder é amarrado ao orgId
 * pra agrupar uploads por tenant.
 */
export async function getUploadSignatureAction(): Promise<
  { ok: true; data: UploadSignature } | { ok: false; error: string }
> {
  if (!isCloudinaryConfigured()) {
    return {
      ok: false,
      error:
        "Upload não configurado nesta instalação. Cole uma URL de imagem direto.",
    };
  }
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Sessão expirada." };
  const membership = session.user.memberships[0];
  if (!membership) {
    return { ok: false, error: "Sem permissão." };
  }
  const folder = `lustro/org-${membership.organizationId}`;
  try {
    const sig = signUpload(folder);
    return { ok: true, data: sig };
  } catch (e) {
    console.error("getUploadSignature failed:", e);
    return { ok: false, error: "Não foi possível assinar o upload." };
  }
}
