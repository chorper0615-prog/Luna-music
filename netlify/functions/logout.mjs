import { jsonResponse } from './_shared.mjs';

export async function handler() {
  return jsonResponse(200, { code: 200, message: 'Logged out' });
}
