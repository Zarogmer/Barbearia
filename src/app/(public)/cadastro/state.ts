export type SignupState =
  | {
      step: "request";
      error?: string;
      fieldErrors?: Record<string, string>;
      values?: { name?: string; email?: string; phone?: string };
    }
  | {
      step: "verify";
      name: string;
      email: string;
      phone: string;
      passwordHash: string;
      error?: string;
      fieldErrors?: Record<string, string>;
      attemptsRemaining?: number;
    }
  | {
      step: "org";
      name: string;
      email: string;
      phone: string;
      passwordHash: string;
      error?: string;
      fieldErrors?: Record<string, string>;
      values?: { orgName?: string; slug?: string };
    };

export const initialSignupState: SignupState = { step: "request" };
