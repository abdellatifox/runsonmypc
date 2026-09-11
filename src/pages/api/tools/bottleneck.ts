export const prerender = false;
import type { APIRoute } from 'astro';
import { getGpu, getCpu } from '../../../lib/db';

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: APIRoute = () => new Response(null, { status: 204, headers });

/**
 * How much processor a graphics card needs to stay fed, as a ratio of the two
 * performance indices. Added pixels are work for the GPU alone, so the
 * processor requirement drops as resolution rises — the reason the same pair
 * can be CPU-bound at 1080p and GPU-bound at 4K.
 */
const BALANCE: Record<string, number> = { '1080p': 1.0, '1440p': 0.8, '4k': 0.6 };

const esc = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export const POST: APIRoute = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const resolution = ['1080p', '1440p', '4k'].includes(body.resolution) ? body.resolution : '1440p';

    const [cpu, gpu] = await Promise.all([
      getCpu(context.locals, String(body.cpu ?? '')),
      getGpu(context.locals, String(body.gpu ?? ''))
    ]);
    if (!cpu || !gpu) {
      return new Response(JSON.stringify({ error: 'Pick both parts from the suggestions.' }), { status: 400, headers });
    }

    const cpuPerf = cpu.perf ?? cpu.score;
    const gpuPerf = gpu.perf ?? gpu.score;

    // The processor level this card wants at this resolution.
    const needed = gpuPerf * BALANCE[resolution];

    /**
     * The two directions are not symmetrical and must not share a formula.
     *
     * Short of `needed`, the processor cannot feed the card and a measurable
     * share of the card's capability goes unused — that share is the number
     * worth reporting, and it is bounded by construction.
     *
     * Above `needed`, nothing is being wasted: the card is fully used, which is
     * the healthy state for gaming. Reporting that as a large "GPU bottleneck"
     * percentage (an earlier version did, calling a perfectly good pairing
     * "73% GPU-limited") is alarming and wrong. We report spare CPU headroom
     * instead, normalised against the processor so it stays sane.
     */
    let limiter: 'cpu' | 'gpu' | 'balanced';
    let severity: 'ok' | 'mild' | 'bad';
    let headline: string;
    let pct: number;

    if (cpuPerf < needed) {
      pct = Math.round(((needed - cpuPerf) / needed) * 100);
      if (pct < 10) {
        limiter = 'balanced'; severity = 'ok'; headline = 'Well balanced';
      } else {
        limiter = 'cpu';
        severity = pct >= 25 ? 'bad' : 'mild';
        headline = `${pct}% CPU-limited at ${resolution}`;
      }
    } else {
      pct = Math.round(((cpuPerf - needed) / Math.max(cpuPerf, 1)) * 100);
      if (pct < 10) {
        limiter = 'balanced'; severity = 'ok'; headline = 'Well balanced';
      } else {
        limiter = 'gpu';
        severity = 'ok';                       // GPU-bound is where you want to be
        headline = `GPU-bound — ${pct}% CPU headroom`;
      }
    }

    const cpuName = esc(cpu.name), gpuName = esc(gpu.name);

    let detail: string;
    if (limiter === 'balanced') {
      detail = `The <b>${cpuName}</b> and <b>${gpuName}</b> are well matched at ${resolution}. Neither part is holding the other back by enough to worry about.`;
    } else if (limiter === 'cpu') {
      detail = `At ${resolution} the <b>${cpuName}</b> cannot quite keep the <b>${gpuName}</b> fed, so the card will sit partly idle in CPU-heavy scenes. This is the kind of imbalance worth fixing — lowering graphics settings will not recover it.`;
    } else {
      detail = `At ${resolution} the <b>${gpuName}</b> is the limiting part, with the <b>${cpuName}</b> having roughly ${pct}% headroom to spare. For gaming this is the healthy direction to be unbalanced in — the card is fully used and your frame rate responds to settings. Nothing is being wasted here.`;
    }

    const advice: string[] = [];
    if (limiter === 'cpu') {
      advice.push(`Moving to a higher resolution shifts load onto the graphics card and reduces this gap — the same pair is better matched at ${resolution === '1080p' ? '1440p' : '4K'}.`);
      advice.push(`If you upgrade, target a processor scoring around <b>${Math.min(100, Math.round(needed))}</b> or better. See the <a href="/cpu-tier-list">CPU tier list</a>.`);
      if (cpu.cores < 6) advice.push(`At <b>${cpu.cores} cores</b> you are under the 6-core baseline most 2024-onward titles assume.`);
    } else if (limiter === 'gpu') {
      advice.push(`Your processor has room for a faster card: something scoring around <b>${Math.min(100, Math.round(cpuPerf / BALANCE[resolution]))}</b> would still be fed properly.`);
      advice.push('Enabling upscaling (DLSS or FSR) reclaims most of a GPU deficit — see <a href="/dlss-fsr">DLSS vs FSR</a>.');
    } else {
      advice.push('No upgrade is obviously overdue. If you want more frames, put the money toward a faster graphics card and keep the pairing roughly where it is.');
    }
    advice.push('Check a specific title with the <a href="/can-it-run">requirements checker</a> before buying.');

    // Bars are drawn relative to whichever part is further ahead.
    const peak = Math.max(cpuPerf, needed, 1);
    return new Response(JSON.stringify({
      headline, severity, limiter, percent: pct, resolution, detail, advice,
      cpu: { name: cpu.name, slug: cpu.slug, score: cpu.score },
      gpu: { name: gpu.name, slug: gpu.slug, score: gpu.score },
      cpuBar: Math.round(Math.min(100, (cpuPerf / peak) * 100)),
      gpuBar: Math.round(Math.min(100, (needed / peak) * 100)),
      note: 'Modelled from each part’s relative performance index at the chosen resolution. Real bottlenecking is per-game — strategy and simulation titles lean on the processor far harder than a corridor shooter does.'
    }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: 'Something went wrong.' }), { status: 500, headers });
  }
};
