const CUSTOM_SAMPLE_SOUNDS = [
  'kick',
  'snare',
  'hat',
  'closed',
  'ride',
  'rim',
  'tom',
] as const;

const SYNTH_SOUNDS = [
  'sine',
  'sin',
  'triangle',
  'tri',
  'square',
  'squ',
  'sawtooth',
  'saw',
  'lead',
] as const;

const ALLOWED_SOUND_CODES = new Set<string>(CUSTOM_SAMPLE_SOUNDS);
const ALLOWED_SYNTHS = new Set<string>(SYNTH_SOUNDS);
const ALLOWED_NOTE_EFFECTS = new Set(['lpf', 'distort', 'gain', 'env', 'slide', 'room']);
const SYNTH_ALIAS_MAP: Record<string, string> = {
  tri: 'triangle',
  saw: 'sawtooth',
  sin: 'sine',
  squ: 'square',
  sqr: 'square',
  lead: 'sawtooth',
};

const FX_ALIAS_MAP: Record<string, string> = {
  reverb: '.room(0.4)',
  dist: '.distort(0.35)',
};

export function isCustomSampleSound(soundCode: string): boolean {
  return ALLOWED_SOUND_CODES.has(soundCode.trim());
}

export function isSupportedSynthName(synthName: string): boolean {
  return ALLOWED_SYNTHS.has(synthName.trim());
}

export function canonicalizeSoundCode(soundCode: string): string | null {
  const normalizedSoundCode = soundCode.trim();
  if (!normalizedSoundCode) {
    return null;
  }

  if (isCustomSampleSound(normalizedSoundCode)) {
    return normalizedSoundCode;
  }

  const melodicMatch = normalizedSoundCode.match(/^note\((['"])(.+?)\1\)\.s\((['"])(.+?)\3\)(.*)$/);
  if (!melodicMatch) {
    return null;
  }

  const noteLiteral = melodicMatch[2]?.trim() ?? '';
  const rawSynthName = melodicMatch[4]?.trim() ?? '';
  const rawSuffix = melodicMatch[5] ?? '';
  const synthName = SYNTH_ALIAS_MAP[rawSynthName] ?? rawSynthName;
  if (!isSupportedSynthName(synthName)) {
    return null;
  }

  const normalizedSuffix = rawSuffix.replace(/\.fx\((['"])(.+?)\1\)/g, (_match, _quote, fxName: string) => {
    return FX_ALIAS_MAP[fxName.trim()] ?? '__INVALID_FX__';
  });

  if (normalizedSuffix.includes('__INVALID_FX__')) {
    return null;
  }

  const effectMatches = Array.from(normalizedSuffix.matchAll(/\.([a-z]+)\(([^)]*)\)/g));
  const reconstructedSuffix = effectMatches.map(([, effectName, args]) => `.${effectName}(${args})`).join('');
  if (reconstructedSuffix !== normalizedSuffix) {
    return null;
  }

  if (!effectMatches.every(([, effectName]) => ALLOWED_NOTE_EFFECTS.has(effectName))) {
    return null;
  }

  return `note('${noteLiteral}').s('${synthName}')${normalizedSuffix}`;
}

export function isSupportedSoundCode(soundCode: string): boolean {
  return canonicalizeSoundCode(soundCode) !== null;
}

export function assertSupportedSoundCode(soundCode: unknown): string {
  const normalizedSoundCode = typeof soundCode === 'string' ? soundCode.trim() : '';
  if (!normalizedSoundCode) {
    throw new Error('soundCode is required.');
  }
  const canonicalSoundCode = canonicalizeSoundCode(normalizedSoundCode);
  if (!canonicalSoundCode) {
    throw new Error(`Unsupported soundCode: ${normalizedSoundCode}`);
  }
  return canonicalSoundCode;
}
