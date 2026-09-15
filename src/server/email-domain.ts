import freeEmailDomains from "free-email-domains";

const blockedDomains = new Set<string>([...freeEmailDomains, "hey.com"]);

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

export function isFreeOrDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (blockedDomains.has(domain)) return true;
  const labels = domain.split(".");
  for (let index = 1; index < labels.length - 1; index++) {
    if (blockedDomains.has(labels.slice(index).join("."))) return true;
  }
  return false;
}
