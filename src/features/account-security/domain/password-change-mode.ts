export const passwordChangeModes = ["standard", "forced"] as const;

export type PasswordChangeMode = (typeof passwordChangeModes)[number];
