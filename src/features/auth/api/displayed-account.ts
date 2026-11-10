// The account the current page was rendered for. Set by the signed-in workspace shell, sent with every
// BFF request, and compared server side with the account of the session cookie.
let displayedAccountId: string | undefined;

export function setDisplayedAccount(accountId: string | undefined): void {
  displayedAccountId = accountId;
}

export function readDisplayedAccount(): string | undefined {
  return displayedAccountId;
}
