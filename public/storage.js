const STORAGE_KEY = "quibly.studySets.v1";

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
