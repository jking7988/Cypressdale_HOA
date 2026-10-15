# Password Recovery and Email Delivery

The callback accepts both Supabase PKCE `code` callbacks and direct `token_hash`
links. GET renders a confirmation form without consuming either credential; only
a same-origin POST verifies the token or exchanges the code. The response is
private/no-store, disallows framing and external resources, and uses strict-origin
referrers so token-bearing paths/queries are not sent as referrers. Redirects are
restricted to the member-account allowlist. Neither tokens nor provider error
details are logged or exposed in error messages.

## Hosted Template Setup

Deploying this repository does NOT update the hosted Supabase email templates.
In the existing project's Authentication email templates, replace the Reset
Password body with `supabase/templates/recovery.html` and save it. Its link points
straight to `{{ .SiteURL }}/auth/confirm` with `token_hash`, `type=recovery` and
`next=/reset-password`, bypassing Supabase's GET-consuming verification endpoint.
Keep Site URL set to the real production origin with no trailing slash or path.
The site's existing apex-to-www redirect preserves these parameters.

Use a subject such as `Reset your Cypressdale HOA password`. The Supabase SMTP
sender must use an address on the domain verified in Resend. In Resend's domain
settings, disable both click tracking and open tracking for authentication emails.
Verify SPF/DKIM alignment and DMARC using the headers of an actual delivered email;
DNS record presence alone does not prove authentication passed for that message.
Inbox placement cannot be guaranteed by application code.

Request one NEW password reset after saving the template. Use only the newest
message, open its site-hosted link, select Continue to password reset and choose a
password. Older/redeemed messages cannot be repaired or reused. Do not paste the
full recovery URL, token, code, password or authentication cookies into chat.

Default Supabase-hosted links still consume their upstream token on GET before
they reach this application. PKCE support fixes their callback handling, but
scanner resistance requires the direct-to-site template. Default PKCE links also
require the browser that initiated recovery; direct token-hash links do not rely
on that browser's PKCE verifier cookie.

References:
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://resend.com/docs/knowledge-base/how-do-i-maximize-deliverability-for-supabase-auth-emails
