export const passwordPolicy = Object.freeze({
  minimumLength: 8,
  requiresDigit: true,
  requiresLetter: true,
});

export type PasswordRuleState = Readonly<{
  hasDigit: boolean;
  hasLetter: boolean;
  hasMinimumLength: boolean;
}>;

const letterPattern = /\p{L}/u;
const digitPattern = /[0-9]/;

export function getPasswordRuleState(password: string): PasswordRuleState {
  return {
    hasDigit: digitPattern.test(password),
    hasLetter: letterPattern.test(password),
    hasMinimumLength:
      Array.from(password).length >= passwordPolicy.minimumLength,
  };
}

export function satisfiesPasswordPolicy(password: string): boolean {
  const rules = getPasswordRuleState(password);

  return rules.hasDigit && rules.hasLetter && rules.hasMinimumLength;
}
