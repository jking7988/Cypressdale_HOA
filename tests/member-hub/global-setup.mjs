export default async function setup(configuration) {
  if (configuration?.projects?.some(project => project.use.baseURL !== 'http://localhost:3002')) {
    throw new Error('Browser tests require the isolated Docker server on port 3002. No test fixtures were run.');
  }
  const response = await fetch('http://localhost:3002/api/member-hub/test-environment', { signal: AbortSignal.timeout(15000) });
  const result = response.ok ? await response.json().catch(() => null) : null;
  if (result?.isolatedTesting !== true) throw new Error('Browser tests require the isolated Docker server on port 3002. Run npm run member-hub:dev:local; leave hosted-data development running on port 3001. No test fixtures were run.');
}
