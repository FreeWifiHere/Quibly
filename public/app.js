import { getSampleSets, getStudySets, saveStudySet } from "./storage.js";

const form = document.querySelector("#builder-form");
const notesInput = document.querySelector("#notes");
const notesFileInput = document.querySelector("#notes-file");
const uploadZone = document.querySelector("#upload-zone");
const fileStatus = document.querySelector("#file-status");
const styleInput = document.querySelector("#game-style");
const generateButton = document.querySelector("#generate-button");
const thinkingState = document.querySelector("#thinking-state");
const formMessage = document.querySelector("#form-message");
const resultsPanel = document.querySelector("#results-panel");
const gameTitle = document.querySelector("#game-title");
const gameTagline = document.querySelector("#game-tagline");
const questionsList = document.querySelector("#questions-list");
const scorePill = document.querySelector("#score-pill");
const progressBar = document.querySelector("#progress-bar");
const libraryList = document.querySelector("#library-list");
const newGameButton = document.querySelector("#new-game-button");

let currentScore = 0;
let answeredCount = 0;
let totalQuestions = 0;

function setMessage(message = "") {
  formMessage.textContent = message;
}

function renderLibrary() {
  const sets = getStudySets();
  libraryList.innerHTML = "";
  sets.slice(0, 4).forEach((set, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-item";
    button.dataset.setId = set.id;
    button.innerHTML = `
      <span class="item-icon">${index % 2 ? "✦" : "↗"}</span>
      <span class="library-item-text"><strong>${escapeHtml(set.title || "Study game")}</strong><small>${escapeHtml(set.goal || "Saved notes")}</small></span>
    `;
    libraryList.appendChild(button);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fillSample(sampleId) {
  const sample = getSampleSets().find((item) => item.id === sampleId);
  if (!sample) return;
  notesInput.value = sample.notes;
  styleInput.value = sample.gameStyle;
  fileStatus.textContent = "Sample notes loaded";
  notesInput.focus();
  setMessage("Sample loaded — edit it or build the game as-is.");
}

async function loadNotesFile(file) {
  if (!file) return;
  const fileName = file.name.toLowerCase();
  const supported = fileName.endsWith(".txt") || fileName.endsWith(".md") || fileName.endsWith(".text") || file.type === "text/plain" || file.type === "text/markdown";
  if (!supported) {
    fileStatus.textContent = "Please choose a TXT or MD file.";
    setMessage("Quibly can read TXT and MD notes files for now.");
    return;
  }

  try {
    const text = (await file.text()).trim();
    if (!text) {
      fileStatus.textContent = "That file is empty.";
      setMessage("Choose a notes file with a little text in it.");
      return;
    }
    if (text.length > 24000) {
      fileStatus.textContent = "That file is too large for Version 1.";
      setMessage("Please choose a notes file under 24,000 characters.");
      return;
    }
    notesInput.value = text;
    fileStatus.textContent = `Loaded ${file.name}`;
    setMessage("Notes loaded — press Build my game to make the quiz.");
    notesInput.focus();
  } catch {
    fileStatus.textContent = "Could not read that file.";
    setMessage("Quibly could not read the file. Try a TXT or MD file.");
  }
}

function updateScore() {
  scorePill.textContent = `${currentScore} / ${totalQuestions * 10} XP`;
  const progress = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0;
  progressBar.style.width = `${progress}%`;
}

function renderGame(game) {
  currentScore = 0;
  answeredCount = 0;
  totalQuestions = Array.isArray(game.questions) ? game.questions.length : 0;
  gameTitle.textContent = game.title || "Your study game";
  gameTagline.textContent = game.tagline || "A quick round made from your notes.";
  questionsList.innerHTML = "";

  if (!totalQuestions) {
    const raw = document.createElement("div");
    raw.className = "raw-game";
    raw.textContent = game.raw || "The AI made a game, but it needs another look. Try again.";
    questionsList.appendChild(raw);
    updateScore();
    resultsPanel.hidden = false;
    resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  game.questions.forEach((question, index) => {
    const card = document.createElement("article");
    card.className = "question-card";
    const options = Array.isArray(question.options) ? question.options : [];
    card.innerHTML = `
      <span class="question-number">Round ${String(index + 1).padStart(2, "0")}</span>
      <h3>${escapeHtml(question.question || "What do you remember?")}</h3>
      <div class="options"></div>
      <p class="question-feedback" aria-live="polite"></p>
      <p class="challenge-line"><strong>Bonus:</strong> ${escapeHtml(question.challenge || "Say the answer in your own words.")}</p>
    `;
    const optionsBox = card.querySelector(".options");
    const feedback = card.querySelector(".question-feedback");
    const answer = String(question.answer || "").trim();
    options.forEach((option) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "option-button";
      optionButton.textContent = option;
      optionButton.addEventListener("click", () => {
        if (card.dataset.answered) return;
        card.dataset.answered = "true";
        answeredCount += 1;
        const isCorrect = option.trim().toLowerCase() === answer.toLowerCase();
        if (isCorrect) {
          currentScore += 10;
          optionButton.classList.add("correct");
          feedback.textContent = `Correct! ${question.explanation || "That matches your notes."}`;
        } else {
          optionButton.classList.add("incorrect");
          feedback.textContent = `Good try. The answer is ${answer}. ${question.explanation || "Check your notes and keep going."}`;
          [...optionsBox.children].find((button) => button.textContent.trim().toLowerCase() === answer.toLowerCase())?.classList.add("correct");
        }
        [...optionsBox.children].forEach((button) => { button.disabled = true; });
        updateScore();
      });
      optionsBox.appendChild(optionButton);
    });
    questionsList.appendChild(card);
  });

  updateScore();
  resultsPanel.hidden = false;
  resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function createGame(event) {
  event.preventDefault();
  setMessage("");
  const notes = notesInput.value.trim();
  if (notes.length < 12) {
    setMessage("Add a few lines of notes first so Quibly can build a game.");
    notesInput.focus();
    return;
  }

  generateButton.disabled = true;
  generateButton.hidden = true;
  thinkingState.hidden = false;
  resultsPanel.hidden = true;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, gameStyle: styleInput.value }),
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "The game could not be made.");
    renderGame(data.game);
    saveStudySet({
      id: `game-${Date.now()}`,
      title: data.game.title || "Your study game",
      goal: "Saved notes",
      notes,
      gameStyle: styleInput.value,
      game: data.game,
    });
    renderLibrary();
    setMessage("Saved in this browser.");
  } catch (error) {
    setMessage(error.message || "Please check the OpenAI key in .env and try again.");
  } finally {
    generateButton.disabled = false;
    generateButton.hidden = false;
    thinkingState.hidden = true;
  }
}

function loadSavedGame(setId) {
  const saved = getStudySets().find((item) => item.id === setId);
  if (!saved) return;
  notesInput.value = saved.notes || "";
  styleInput.value = saved.gameStyle || "Quick quiz";
  if (saved.game) {
    renderGame(saved.game);
    setMessage("Loaded from this browser.");
  } else {
    setMessage("Notes loaded — press Build my game when you are ready.");
    notesInput.focus();
  }
}

document.querySelectorAll("[data-sample]").forEach((button) => {
  button.addEventListener("click", () => fillSample(button.dataset.sample));
});

notesFileInput.addEventListener("change", () => loadNotesFile(notesFileInput.files?.[0]));
uploadZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadZone.classList.add("is-dragging");
});
uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("is-dragging"));
uploadZone.addEventListener("drop", (event) => {
  event.preventDefault();
  uploadZone.classList.remove("is-dragging");
  loadNotesFile(event.dataTransfer.files?.[0]);
});

libraryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-set-id]");
  if (button) loadSavedGame(button.dataset.setId);
});

newGameButton.addEventListener("click", () => {
  resultsPanel.hidden = true;
  notesInput.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

form.addEventListener("submit", createGame);
renderLibrary();
