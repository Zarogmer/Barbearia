"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { prismaAdmin } from "@/lib/db";
import { signupSchema } from "@/lib/validators/auth";

export type SignupActionResult = { error: string } | undefined;

export async function signupAction(
  _prev: SignupActionResult,
  formData: FormData,
): Promise<SignupActionResult> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { name, email, password, phone } = parsed.data;
  const emailLower = email.toLowerCase();

  const existing = await prismaAdmin.user.findUnique({
    where: { email: emailLower },
    select: { id: true },
  });
  if (existing) {
    return { error: "Já existe uma conta com esse email" };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prismaAdmin.user.create({
    data: {
      email: emailLower,
      name,
      phone,
      passwordHash,
      // emailVerifiedAt fica null até PBI-03 implementar Resend.
    },
  });

  redirect("/login?signup=ok");
}
