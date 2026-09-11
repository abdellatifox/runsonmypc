/**
 * Shared performance model.
 *
 * One model behind every tool, so /benchmarks, /fps-estimator, /upgrade-advisor
 * and the can-it-run matchup pages can never disagree with each other about the
 * same hardware pairing.
 */
import type { Cpu, Game, Gpu } from './db';

export const RES_FACTOR: Record<string, number> = {
  '1080p': 1.0,
  '1440p': 0.62,
  '4k': 0.36
};

export const PRESET_FACTOR: Record<string, number> = {
  low: 1.75,
  medium: 1.32,
  high: 1.0,
  ultra: 0.78,
  ultra_rt: 0.52
};

/** Rough average FPS for a GPU/CPU pair on a given game. */
export function estimateFps(
  game: Pick<Game, 'rec_gpu_score' | 'rec_cpu_score' | 'gpu_intensive' | 'cpu_intensive'>,
  gpuScore: number,
  cpuScore: number,
  res: string = '1080p',
  preset: string = 'high'
): number {
  const resF = RES_FACTOR[res] ?? 1;
  const preF = PRESET_FACTOR[preset] ?? 1;

  // 60fps at the recommended spec is the anchor point of the model.
  const gpuRatio = gpuScore / Math.max(1, game.rec_gpu_score);
  const cpuRatio = cpuScore / Math.max(1, game.rec_cpu_score);

  const gpuFps = 60 * Math.pow(gpuRatio, 1.05) * resF * preF;

  // The CPU sets a ceiling that barely moves with resolution — that is exactly
  // why CPU bottlenecks show up hardest at 1080p.
  const cpuCeiling = 60 * Math.pow(cpuRatio, 0.9) * (game.cpu_intensive ? 1.25 : 1.9) * preF;

  const fps = Math.min(gpuFps, cpuCeiling);
  return Math.max(5, Math.round(fps));
}

/** Which component limits this pairing, and by how much. */
export function bottleneck(gpuScore: number, cpuScore: number) {
  const diff = cpuScore - gpuScore;
  const pct = Math.round((Math.abs(diff) / Math.max(gpuScore, cpuScore)) * 100);
  if (pct < 8) return { component: 'balanced' as const, percent: pct };
  return { component: (diff > 0 ? 'gpu' : 'cpu') as 'gpu' | 'cpu', percent: pct };
}

export type Verdict = 'ultra' | 'recommended' | 'minimum' | 'below';

export function verdictFor(game: Game, gpu: Gpu | null, cpu: Cpu | null, ramGb: number): Verdict {
  const g = gpu?.score ?? 0;
  const c = cpu?.score ?? 0;
  const vram = gpu?.vram_gb ?? 0;

  const meetsMin = g >= game.min_gpu_score && c >= game.min_cpu_score
    && ramGb >= game.min_ram_gb && vram >= game.min_vram_gb;
  const meetsRec = g >= game.rec_gpu_score && c >= game.rec_cpu_score
    && ramGb >= game.rec_ram_gb && vram >= game.rec_vram_gb;

  if (!meetsMin) return 'below';
  if (!meetsRec) return 'minimum';
  if (g >= game.rec_gpu_score * 1.3 && c >= game.rec_cpu_score * 1.15) return 'ultra';
  return 'recommended';
}

export const VERDICT_COPY: Record<Verdict, { label: string; tone: string; blurb: string }> = {
  ultra:       { label: 'Runs great',      tone: 'pass', blurb: 'Comfortably above the recommended spec — expect high settings with headroom to spare.' },
  recommended: { label: 'Runs well',       tone: 'pass', blurb: 'Meets the recommended requirements. Expect a smooth experience at high settings.' },
  minimum:     { label: 'Playable',        tone: 'warn', blurb: 'Meets the minimum but not the recommended spec. Expect to drop settings or resolution.' },
  below:       { label: 'Below minimum',   tone: 'fail', blurb: 'Falls short of the minimum requirements. The game may not launch or will run poorly.' }
};

/** Suggested preset for a target frame rate. */
export function targetPreset(fpsAtHigh: number, target = 60): string {
  if (fpsAtHigh >= target * 1.4) return 'ultra';
  if (fpsAtHigh >= target) return 'high';
  if (fpsAtHigh * 1.32 >= target) return 'medium';
  return 'low';
}
