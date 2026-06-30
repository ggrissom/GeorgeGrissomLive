const songs = [
  { id: "song-1", title: "Whiskey & Neon", src: "", playsLeft: 2 },
  { id: "song-2", title: "From the Setlist", src: "", playsLeft: 2 },
  { id: "song-3", title: "Last Call Lullaby", src: "", playsLeft: 2 },
  { id: "song-4", title: "Sunday at the Winery", src: "", playsLeft: 2 }
];

const state = {
  currentSongId: null,
  currentTheme: localStorage.getItem("gg-theme") || "auto",
  paywallTimerId: null
};

const songList = document.getElementById("songList");
const audioPlayer = document.getElementById("audioPlayer");
const vinyl = document.getElementById("vinyl");
const recordDrop = document.getElementById("recordDrop");
const creditStatus = document.getElementById("creditStatus");
const paywall = document.getElementById("paywall");
const themeToggle = document.getElementById("themeToggle");
const stopButton = document.getElementById("stopButton");
const closePaywall = document.getElementById("closePaywall");
const uploadForm = document.getElementById("uploadForm");
const uploadInput = document.getElementById("uploadInput");
const uploadFeedback = document.getElementById("uploadFeedback");
const promoteForm = document.getElementById("promoteForm");

function systemPrefersLight() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
}

function applyTheme(theme) {
  const resolved = theme === "auto" ? (systemPrefersLight() ? "light" : "dark") : theme;
  document.documentElement.setAttribute("data-theme", resolved);
  localStorage.setItem("gg-theme", theme);
  state.currentTheme = theme;
}

function renderSongs() {
  if (!songList) return;

  songList.innerHTML = songs.map((song) => `
    <li>
      <button type="button" data-song-id="${song.id}" aria-pressed="${state.currentSongId === song.id}">
        ${song.title} · ${song.playsLeft} free ${song.playsLeft === 1 ? "play" : "plays"} left
      </button>
    </li>
  `).join("");
}

function updateCreditStatus() {
  if (!creditStatus) return;

  const totalCredits = songs.reduce((sum, song) => sum + song.playsLeft, 0);
  creditStatus.textContent = totalCredits > 0
    ? `${totalCredits} free plays left across all songs`
    : "No free plays left";
}

function clearPaywallTimer() {
  if (state.paywallTimerId) {
    window.clearTimeout(state.paywallTimerId);
    state.paywallTimerId = null;
  }
}

function showPaywall() {
  if (!paywall) return;
  clearPaywallTimer();
  paywall.hidden = false;
  paywall.setAttribute("aria-hidden", "false");
}

function hidePaywall() {
  if (!paywall) return;
  clearPaywallTimer();
  paywall.hidden = true;
  paywall.setAttribute("aria-hidden", "true");
}

function schedulePaywall(delayMs = 1800) {
  clearPaywallTimer();
  state.paywallTimerId = window.setTimeout(showPaywall, delayMs);
}

function resetRecordAnimation() {
  if (!recordDrop) return;

  recordDrop.classList.remove("drop");
  void recordDrop.offsetWidth;
  recordDrop.classList.add("drop");
}

function stopPlayback() {
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  }

  if (vinyl) {
    vinyl.classList.remove("spin");
  }
}

function startPlayback(songId) {
  const song = songs.find((item) => item.id === songId);
  if (!song) return;

  if (song.playsLeft <= 0) {
    showPaywall();
    return;
  }

  hidePaywall();
  state.currentSongId = songId;
  song.playsLeft -= 1;

  renderSongs();
  updateCreditStatus();
  resetRecordAnimation();

  if (vinyl) {
    vinyl.classList.add("spin");
  }

  if (audioPlayer && song.src) {
    audioPlayer.src = song.src;
    audioPlayer.play().catch(() => {});
  } else {
    stopPlayback();

    if (vinyl) {
      vinyl.classList.add("spin");
      window.setTimeout(() => vinyl.classList.remove("spin"), 8000);
    }
  }

  if (song.playsLeft <= 0) {
    schedulePaywall();
  }
}

if (songList) {
  songList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-song-id]");
    if (!button) return;
    startPlayback(button.dataset.songId);
  });
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const cycle = { auto: "dark", dark: "light", light: "auto" };
    applyTheme(cycle[state.currentTheme] || "auto");
  });
}

if (stopButton) {
  stopButton.addEventListener("click", stopPlayback);
}

if (closePaywall) {
  closePaywall.addEventListener("click", hidePaywall);
}

if (paywall) {
  paywall.addEventListener("click", (event) => {
    if (event.target === paywall) {
      hidePaywall();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && paywall && !paywall.hidden) {
    hidePaywall();
  }
});

if (uploadForm) {
  uploadForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const count = uploadInput && uploadInput.files ? uploadInput.files.length : 0;
    uploadFeedback.textContent = count
      ? `${count} file(s) selected. Production build should upload to cloud storage with moderation.`
      : "No files selected yet.";
  });
}

if (promoteForm) {
  promoteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("Promotion form demo captured. Production build can grant a free credit or request reward.");
  });
}

if (audioPlayer) {
  audioPlayer.addEventListener("ended", () => {
    if (vinyl) {
      vinyl.classList.remove("spin");
    }
  });
}

applyTheme(state.currentTheme);
renderSongs();
updateCreditStatus();
hidePaywall();
