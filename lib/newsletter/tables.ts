export function newsletterTables(environment: NodeJS.ProcessEnv = process.env) {
  const existingProject = environment.MEMBER_HUB_ENVIRONMENT === 'production';
  return {
    runs: existingProject ? 'hoa_newsletter_runs' : 'newsletter_runs',
    deliveries: existingProject ? 'hoa_newsletter_deliveries' : 'newsletter_deliveries',
  } as const;
}
