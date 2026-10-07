/** Provider response bodies and credential configurations never enter errors. */
export async function api(url, options = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), ...options });
  if (!response.ok) throw new Error(`Connection request failed (HTTP ${response.status}).`);
  const body = await response.text();
  return body ? JSON.parse(body) : {};
}
