import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { claudeOutputSchema, type ClaudeOutput, type IdentifyRequest } from './schema';

/*
  One vision call per photo, shaped for the fewest tokens: the browser sends a ≤768px crop around
  the bird (~800 image tokens), the prompt carries no species list (names are resolved to eBird
  codes on our side), output is a small JSON object at low effort. The system prompt is below the
  model's minimum cacheable size, so it isn't cached — keeping it short is the saving instead.
*/

export const IDENTIFY_MODEL = 'claude-sonnet-5-5';

const SYSTEM = `You identify wild birds in a birder's photo and turn their note into a log entry.

candidates: up to 3 species, most likely first, with current eBird English and scientific names. Give fewer when one is clear; none when no bird is visible. If "exclude" is given, the birder wants alternatives: return up to 2 other closest species, never those listed. confidence "high" only when diagnostic field marks are clearly visible. fieldMarks: the visible marks behind the ID, under 12 words.

From the note, resolved against "now": date (YYYY-MM-DD) and time (HH:mm, 24h), each null if not stated. place.name: the place as the birder would write it. place.parkArea: only if in Central Park, NYC — the matching area, or "Central Park (general)". stateCode: subdivision code without country (e.g. NY); countryCode: ISO alpha-2. count: individuals stated in the note, else null. Use null for anything not given; never guess a place.`;

export class IdentifyRefusal extends Error {}

export async function identifyWithClaude(client: Anthropic, input: IdentifyRequest): Promise<ClaudeOutput> {
  const response = await client.beta.messages.parse({
    model: IDENTIFY_MODEL,
    max_tokens: 2000,
    // A safeguard decline is retried on another model inside the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: betaZodOutputFormat(claudeOutputSchema) },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: input.image } },
          { type: 'text', text: `now: ${input.now}\nnote: ${input.note.trim() || '(none)'}${input.exclude?.length ? `\nexclude: ${input.exclude.join('; ')}` : ''}` },
        ],
      },
    ],
  });
  if (response.stop_reason === 'refusal') throw new IdentifyRefusal('model declined');
  if (!response.parsed_output) throw new Error(`no parsed output (stop_reason ${response.stop_reason})`);
  return response.parsed_output;
}
