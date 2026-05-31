export type MessageTemplateState = {
  ok?: boolean;
  templateId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialMessageTemplateState: MessageTemplateState = {};

export type MessageTemplateResult = { ok?: boolean; error?: string };
