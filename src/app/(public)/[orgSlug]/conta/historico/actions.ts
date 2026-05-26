"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { ReviewError, createReview } from "@/lib/server/reviews";
import { getOrgBySlug } from "@/lib/server/orgs";
import { createReviewSchema } from "@/lib/validators/review";

import type { ReviewActionState } from "./state";

export async function createReviewAction(
  orgSlug: string,
  appointmentId: string,
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Faça login pra avaliar." };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Barbearia não encontrada." };

  const ratingRaw = formData.get("rating");
  const rating = typeof ratingRaw === "string" ? Number(ratingRaw) : NaN;
  const parsed = createReviewSchema.safeParse({
    appointmentId,
    rating,
    comment: formData.get("comment"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Confira os campos.", fieldErrors };
  }

  try {
    await createReview(org.id, session.user.id, parsed.data);
  } catch (e) {
    if (e instanceof ReviewError) return { error: e.message };
    console.error("createReview failed:", e);
    return { error: "Não foi possível salvar a avaliação." };
  }

  revalidatePath(`/${orgSlug}/conta/historico`);
  return { ok: true };
}
