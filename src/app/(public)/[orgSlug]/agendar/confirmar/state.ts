/**
 * Estado/tipos compartilhados com o ConfirmForm (client).
 * Mantido FORA de actions.ts porque Next 15.5+ exige que arquivos
 * "use server" exportem apenas async functions.
 *
 * PBI-23: fluxo agora tem 2 etapas — request OTP, verify OTP.
 */
export type ConfirmBookingState =
  | {
      step: "request";
      error?: string;
      fieldErrors?: Record<string, string>;
    }
  | {
      step: "verify";
      phone: string; // E.164 normalizado, exibido na UI
      customerName: string; // mantido pra carry-over
      error?: string;
      fieldErrors?: Record<string, string>;
      attemptsRemaining?: number;
    };

export const initialConfirmBookingState: ConfirmBookingState = { step: "request" };
