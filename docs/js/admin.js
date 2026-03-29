(function () {
  if (typeof firebase === "undefined" || !firebase.apps?.length) {
    document.getElementById("firebase-warning").style.display = "block";
    return;
  }

  const db = firebase.database();
  const gameRef = db.ref("games/" + GAME_ID);
  const participantsRef = gameRef.child("participants");
  const wordsRef = gameRef.child("words");
  const gameStateRef = gameRef.child("gameState");

  const participantListEl = document.getElementById("participant-list");
  const participantEmptyEl = document.getElementById("participant-empty");
  const wordListEl = document.getElementById("word-list");
  const wordEmptyEl = document.getElementById("word-empty");
  const newWordInput = document.getElementById("new-word");
  const newDefinitionInput = document.getElementById("new-definition");
  const gameDurationInput = document.getElementById("game-duration");
  const revealIntervalInput = document.getElementById("reveal-interval");
  const addWordBtn = document.getElementById("add-word-btn");
  const startGameBtn = document.getElementById("start-game-btn");
  const resetGameBtn = document.getElementById("reset-game-btn");
  const gameStatusEl = document.getElementById("game-status");

  // Başlangıçta gameState yoksa oluştur
  gameStateRef.once("value", function (snap) {
    if (!snap.exists()) {
      gameStateRef.set({ status: "waiting" });
    }
  });

  // Katılımcıları dinle
  participantsRef.on("value", function (snap) {
    const data = snap.val() || {};
    const entries = Object.entries(data);
    participantListEl.innerHTML = "";
    participantEmptyEl.style.display = entries.length ? "none" : "block";
    entries.forEach(function ([id, p]) {
      const li = document.createElement("li");
      li.innerHTML =
        '<span class="name">' +
        escapeHtml(p.name || "İsimsiz") +
        "</span>" +
        (p.status === "approved"
          ? '<span class="badge badge-approved">Onaylı</span>'
          : '<span class="badge badge-pending">Beklemede</span>');
      const actions = document.createElement("span");
      actions.style.display = "flex";
      actions.style.gap = "0.5rem";
      if (p.status !== "approved") {
        const approveBtn = document.createElement("button");
        approveBtn.className = "btn btn-success";
        approveBtn.textContent = "Onayla";
        approveBtn.type = "button";
        approveBtn.style.padding = "0.35rem 0.75rem";
        approveBtn.style.fontSize = "0.85rem";
        approveBtn.onclick = function () {
          participantsRef.child(id).update({ status: "approved" });
        };
        actions.appendChild(approveBtn);
      }
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-danger";
      removeBtn.textContent = "Sil";
      removeBtn.type = "button";
      removeBtn.style.padding = "0.35rem 0.75rem";
      removeBtn.style.fontSize = "0.85rem";
      removeBtn.onclick = function () {
        participantsRef.child(id).remove();
      };
      actions.appendChild(removeBtn);
      li.appendChild(actions);
      participantListEl.appendChild(li);
    });
  });

  // Kelime listesini dinle
  wordsRef.on("value", function (snap) {
    const data = snap.val() || {};
    const entries = Object.entries(data);
    wordListEl.innerHTML = "";
    wordEmptyEl.style.display = entries.length ? "none" : "block";
    entries.forEach(function ([id, item]) {
      const li = document.createElement("li");
      let wordText = '';
      let defText = '';
      
      if (typeof item === 'string') {
        wordText = item;
      } else if (typeof item === 'object' && item !== null) {
        wordText = item.word || '';
        defText = item.definition || '';
      }
      
      let displayText = '<strong>' + escapeHtml(wordText) + '</strong>';
      if (defText) {
        displayText += ' - ' + escapeHtml(defText);
      }
      li.innerHTML = '<span class="name">' + displayText + '</span>';
      
      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-danger";
      delBtn.textContent = "Sil";
      delBtn.type = "button";
      delBtn.style.padding = "0.35rem 0.75rem";
      delBtn.style.fontSize = "0.85rem";
      delBtn.onclick = function () {
        wordsRef.child(id).remove();
      };
      li.appendChild(delBtn);
      wordListEl.appendChild(li);
    });
  });

  // Oyun durumunu dinle
  gameStateRef.on("value", function (snap) {
    const state = snap.val() || { status: "waiting" };
    gameStatusEl.textContent = "Durum: " + (state.status === "playing" ? "Oyun başladı" : "Beklemede");
    startGameBtn.disabled = state.status === "playing";
    resetGameBtn.style.visibility = state.status === "playing" ? "visible" : "hidden";
  });

  addWordBtn.addEventListener("click", function () {
    const word = (newWordInput.value || "").trim();
    const definition = (newDefinitionInput.value || "").trim();
    const duration = parseInt(gameDurationInput.value) || 60;
    const interval = parseInt(revealIntervalInput.value) || 10;
    
    if (!word || !definition) {
      alert("Lütfen kelime ve tanım girin.");
      return;
    }
    
    newWordInput.value = "";
    newDefinitionInput.value = "";
    wordsRef.push({
      word: word,
      definition: definition,
      duration: duration,
      revealInterval: interval
    });
  });

  newWordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") newDefinitionInput.focus();
  });
  
  newDefinitionInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") addWordBtn.click();
  });

  startGameBtn.addEventListener("click", function () {
    wordsRef.once("value", function (snap) {
      const wordsObj = snap.val() || {};
      const wordsArray = Object.values(wordsObj);
      if (wordsArray.length === 0) {
        alert("En az bir kelime ekleyin.");
        return;
      }
      // Rastgele bir kelime seç
      let selectedWord = wordsArray[Math.floor(Math.random() * wordsArray.length)];
      console.log("Seçilen kelime:", selectedWord);
      
      // String ise object'e çevir
      if (typeof selectedWord === 'string') {
        selectedWord = {
          word: selectedWord,
          definition: selectedWord,
          duration: 60,
          revealInterval: 10
        };
      }
      
      const gameData = {
        status: "playing",
        word: selectedWord.word || "",
        definition: selectedWord.definition || "",
        duration: selectedWord.duration || 60,
        revealInterval: selectedWord.revealInterval || 10,
        startedAt: Date.now(),
        revealedCount: 0
      };
      console.log("Firebase'e yazılacak veri:", gameData);
      gameStateRef.set(gameData);
    });
  });

  resetGameBtn.addEventListener("click", function () {
    if (!confirm("Oyunu sıfırlamak istediğinize emin misiniz? Yeni tur için katılımcılar tekrar bekleyecek.")) return;
    gameStateRef.set({ status: "waiting" });
  });

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
})();
