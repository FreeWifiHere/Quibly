const STORAGE_KEY = "quibly.studySets.v1";
const PROGRESS_STORAGE_KEY = "quibly.progress.v1";
const PROGRESS_VERSION = 1;
export const XP_PER_CORRECT_ANSWER = 10;
export const XP_PER_LEVEL = 100;

const DEFAULT_PROGRESS = {
  version: PROGRESS_VERSION,
  level: 1,
  totalXp: 0,
  gamesPlayed: 0,
  correctAnswers: 0,
};

const SAMPLE_SETS = [
  {
    id: "sample-water-cycle",
    title: "Water Cycle Warm-up",
    goal: "Review the water cycle",
    notes: "Evaporation changes liquid water into water vapor. Condensation happens when water vapor cools into tiny liquid droplets. Precipitation is water that falls from clouds as rain, snow, sleet, or hail. Collection is when water gathers in rivers, lakes, and oceans.",
    gameStyle: "Quick quiz",
    sample: true,
  },
  {
    id: "sample-fractions",
    title: "Fraction Quest",
    goal: "Practice fraction basics",
    notes: "A fraction shows parts of a whole. The numerator is the top number and tells how many parts we have. The denominator is the bottom number and tells how many equal parts make the whole. Equivalent fractions have the same value.",
    gameStyle: "Challenge mode",
    sample: true,
  },
  {
    id: "sample-ecosystems",
    title: "Ecosystem Explorer",
    goal: "Remember ecosystem vocabulary",
    notes: "An ecosystem includes living and nonliving parts that interact. Producers make their own food, usually using sunlight. Consumers get energy by eating other organisms. Decomposers break down dead material and return nutrients to the environment.",
    gameStyle: "Flashcard sprint",
    sample: true,
  },
];

function readStoredSets() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return Array.isArray(saved) && saved.length ? saved : [...SAMPLE_SETS];
  } catch {
    return [...SAMPLE_SETS];
  }
}

function writeStoredSets(sets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sets.slice(0, 12)));
}

export function getStudySets() {
  const sets = readStoredSets();
  writeStoredSets(sets);
  return sets;
}

export function saveStudySet(studySet) {
  const sets = readStoredSets().filter((item) => item.id !== studySet.id);
  const nextSet = { ...studySet, savedAt: new Date().toISOString() };
  writeStoredSets([nextSet, ...sets]);
  return nextSet;
}

export function getSampleSets() {
  return [...SAMPLE_SETS];
}

function toNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
}

function levelForXp(totalXp) {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1;
}

function normalizeProgress(value) {
  if (!value || typeof value !== "object") return null;

  const hasProgressField = ["totalXp", "xp", "level", "gamesPlayed", "correctAnswers"].some((key) => key in value);
  if (!hasProgressField) return null;

  const totalXp = toNonNegativeInteger(value.totalXp ?? value.xp, 0);
  const progress = {
    version: PROGRESS_VERSION,
    level: levelForXp(totalXp),
    totalXp,
    gamesPlayed: toNonNegativeInteger(value.gamesPlayed),
    correctAnswers: toNonNegativeInteger(value.correctAnswers),
  };
  return progress;
}

function writeProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // The UI can still use in-memory progress if storage is unavailable.
  }
  return progress;
}

export function getProgress() {
  let serialized = null;
  let stored = null;
  try {
    serialized = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (serialized) stored = JSON.parse(serialized);
  } catch {
    stored = null;
  }

  const progress = normalizeProgress(stored) || { ...DEFAULT_PROGRESS };
  const normalized = JSON.stringify(progress);
  if (serialized !== normalized) writeProgress(progress);
  return progress;
}

export function saveProgress(progress) {
  const normalized = normalizeProgress(progress) || { ...DEFAULT_PROGRESS };
  return writeProgress(normalized);
}

export function recordGamePlayed() {
  const current = getProgress();
  return saveProgress({ ...current, gamesPlayed: current.gamesPlayed + 1 });
}

export function recordCorrectAnswer() {
  const current = getProgress();
  const nextTotalXp = current.totalXp + XP_PER_CORRECT_ANSWER;
  const next = saveProgress({
    ...current,
    totalXp: nextTotalXp,
    correctAnswers: current.correctAnswers + 1,
  });
  return { progress: next, leveledUp: next.level > current.level };
}
