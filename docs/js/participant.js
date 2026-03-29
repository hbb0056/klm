(function () {
  console.log("participant.js yüklendi");
  
  if (typeof firebase === "undefined" || !firebase.apps?.length) {
    document.getElementById("firebase-warning").style.display = "block";
    document.getElementById("join-screen").style.display = "block";
    return;
  }

  const db = firebase.database();
  const gameRef = db.ref("games/" + GAME_ID);
  const participantsRef = gameRef.child("participants");
  const gameStateRef = gameRef.child("gameState");

  const joinScreen = document.getElementById("join-screen");
  const waitApprovalScreen = document.getElementById("wait-approval-screen");
  const notApprovedScreen = document.getElementById("not-approved-screen");
  const waitGameScreen = document.getElementById("wait-game-screen");
  const gameScreen = document.getElementById("game-screen");
  const playerNameInput = document.getElementById("player-name");
  const joinBtn = document.getElementById("join-btn");
  const definitionDisplay = document.getElementById("definition-display");
  const hiddenWordDisplay = document.getElementById("hidden-word-display");
  const timerDisplay = document.getElementById("timer-display");
  const guessInput = document.getElementById("guess-input");
  const guessBtn = document.getElementById("guess-btn");
  const resultMessage = document.getElementById("result-message");

  let myParticipantId = null;
  let currentWord = null;
  let currentDefinition = null;
  let gameDuration = 0;
  let revealInterval = 0;
  let gameStartTime = null;
  let timerInterval = null;
  let revealInterval_id = null;
  let revealedLetters = [];

  joinScreen.style.display = "block";

  joinBtn.addEventListener("click", function () {
    const name = (playerNameInput.value || "").trim();
    if (!name) {
      alert("Lütfen bir isim girin.");
      return;
    }
    const ref = participantsRef.push({
      name: name,
      status: "pending",
      joinedAt: Date.now()
    });
    myParticipantId = ref.key;
    localStorage.setItem("kelimeavi_participant_id", myParticipantId);
    localStorage.setItem("kelimeavi_player_name", name);
    showScreen("wait-approval");
  });

  // Sayfa yüklendiğinde daha önce katılmış mı kontrol et
  (function checkStoredParticipant() {
    const storedId = localStorage.getItem("kelimeavi_participant_id");
    if (!storedId) return;
    participantsRef.child(storedId).once("value", function (snap) {
      if (!snap.exists()) {
        localStorage.removeItem("kelimeavi_participant_id");
        localStorage.removeItem("kelimeavi_player_name");
        return;
      }
      myParticipantId = storedId;
      const p = snap.val();
      if (p.status === "approved") {
        joinScreen.style.display = "none";
        waitApprovalScreen.style.display = "none";
        notApprovedScreen.style.display = "none";
        showScreen("wait-game");
        listenGameState();
        return;
      }
      showScreen("wait-approval");
    });
  })();

  if (!myParticipantId) {
    participantsRef.on("value", function (snap) {
      if (myParticipantId === null) return;
      const p = (snap.val() || {})[myParticipantId];
      if (!p) {
        showScreen("not-approved");
        return;
      }
      if (p.status === "approved") {
        showScreen("wait-game");
        listenGameState();
      } else {
        showScreen("wait-approval");
      }
    });
  }

  function showScreen(which) {
    joinScreen.style.display = "none";
    waitApprovalScreen.style.display = "none";
    notApprovedScreen.style.display = "none";
    waitGameScreen.style.display = "none";
    gameScreen.style.display = "none";
    if (which === "join") joinScreen.style.display = "block";
    else if (which === "wait-approval") waitApprovalScreen.style.display = "block";
    else if (which === "not-approved") notApprovedScreen.style.display = "block";
    else if (which === "wait-game") waitGameScreen.style.display = "block";
    else if (which === "game") gameScreen.style.display = "block";
  }

  function listenGameState() {
    gameStateRef.on("value", function (snap) {
      const state = snap.val() || {};
      if (state.status === "playing" && state.word) {
        currentWord = state.word;
        currentDefinition = state.definition;
        gameDuration = state.duration || 60;
        revealInterval = state.revealInterval || 10;
        gameStartTime = state.startedAt;
        startGame();
        showScreen("game");
      } else {
        stopGame();
        showScreen("wait-game");
      }
    });
  }

  function startGame() {
    revealedLetters = [];
    guessInput.value = "";
    resultMessage.style.display = "none";
    guessInput.disabled = false;
    guessBtn.disabled = false;
    definitionDisplay.textContent = currentDefinition;
    updateHiddenWordDisplay();
    
    // Timer'ı başlat
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 100);
    
    // Harfleri açma intervalini başlat
    if (revealInterval_id) clearInterval(revealInterval_id);
    revealInterval_id = setInterval(revealNextLetter, revealInterval * 1000);
  }

  function updateTimer() {
    const elapsed = (Date.now() - gameStartTime) / 1000;
    const remaining = Math.max(0, gameDuration - elapsed);
    timerDisplay.textContent = Math.ceil(remaining) + "s";
    
    if (remaining <= 0) {
      clearInterval(timerInterval);
      stopGame();
      resultMessage.textContent = "⏰ Süre bitti! Doğru kelime: " + currentWord;
      resultMessage.style.background = "#ffb6b6";
      resultMessage.style.color = "#d00";
      resultMessage.style.display = "block";
      guessInput.disabled = true;
      guessBtn.disabled = true;
    }
  }

  function revealNextLetter() {
    if (!currentWord || currentWord.length === 0) {
      if (revealInterval_id) clearInterval(revealInterval_id);
      return;
    }
    
    // Tüm harfler açıldı mı kontrol et
    let closedCount = 0;
    for (let i = 0; i < currentWord.length; i++) {
      if (!revealedLetters[i]) closedCount++;
    }
    
    if (closedCount === 0) {
      if (revealInterval_id) clearInterval(revealInterval_id);
      return;
    }
    
    // Rastgele bir harfi aç (eğer zaten açılmamışsa)
    const unrevealed = [];
    for (let i = 0; i < currentWord.length; i++) {
      if (!revealedLetters[i]) {
        unrevealed.push(i);
      }
    }
    
    if (unrevealed.length > 0) {
      const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      revealedLetters[randomIdx] = true;
      updateHiddenWordDisplay();
    }
  }

  function updateHiddenWordDisplay() {
    let display = "";
    for (let i = 0; i < currentWord.length; i++) {
      if (revealedLetters[i]) {
        display += currentWord[i].toUpperCase();
      } else {
        display += "_";
      }
      if (i < currentWord.length - 1) display += " ";
    }
    hiddenWordDisplay.textContent = display;
  }

  function stopGame() {
    if (timerInterval) clearInterval(timerInterval);
    if (revealInterval_id) clearInterval(revealInterval_id);
  }

  guessBtn.addEventListener("click", function () {
    const guess = (guessInput.value || "").trim().toUpperCase();
    const answer = (currentWord || "").toUpperCase();
    
    if (!guess) return;
    
    guessInput.value = "";
    
    if (guess === answer) {
      resultMessage.textContent = "✅ Doğru! Kelime: " + currentWord;
      resultMessage.style.background = "#b6ffb6";
      resultMessage.style.color = "#0a0";
      resultMessage.style.display = "block";
      guessInput.disabled = true;
      guessBtn.disabled = true;
      stopGame();
    } else {
      resultMessage.textContent = "❌ Yanlış! Tekrar deneyiniz.";
      resultMessage.style.background = "#ffddaa";
      resultMessage.style.color = "#a60";
      resultMessage.style.display = "block";
      setTimeout(() => {
        resultMessage.style.display = "none";
      }, 2000);
    }
  });

  guessInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") guessBtn.click();
  });
})();
