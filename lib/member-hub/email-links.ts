const validSecret = (value: string | null) => !!value && value.length >= 16 && value.length <= 2048 && /^[A-Za-z0-9_.-]+$/.test(value);
type OtpType = 'signup' | 'recovery' | 'invite' | 'email';
type EmailLink = { mode: 'code'; code: string } | { mode: 'otp'; tokenHash: string; type: OtpType };

export function parseEmailLink(parameters: URLSearchParams): EmailLink | null {
  const code = parameters.get('code');
  const tokenHash = parameters.get('token_hash');
  const type = parameters.get('type');
  if (parameters.has('error') || (parameters.has('code') && parameters.has('token_hash'))
    || ['code', 'token_hash', 'type', 'next'].some(name => parameters.getAll(name).length > 1)) return null;
  if (code && validSecret(code)) return { mode: 'code', code };
  if (tokenHash && validSecret(tokenHash) && type && ['signup', 'recovery', 'invite', 'email'].includes(type)) {
    return { mode: 'otp', tokenHash, type: type as OtpType };
  }
  return null;
}
