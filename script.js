

document.addEventListener("DOMContentLoaded", () => {
  // Interface buttons
  const hideButton = document.getElementById("toggle-ui");
  const showButton = document.getElementById("show-ui");

  if (hideButton) {
    hideButton.addEventListener("click", () => {
      document.body.classList.add("hide-ui");
    });
  }

  if (showButton) {
    showButton.addEventListener("click", () => {
      document.body.classList.remove("hide-ui");
    });
  }
// Drawing slate
const canvas = document.getElementById("slate");
const drawOpen = document.getElementById("draw-open");

if (canvas && drawOpen) {
  const ctx = canvas.getContext("2d");
  const colorInput = document.getElementById("draw-color");
  const sizeInput = document.getElementById("draw-size");
  const eraserBtn = document.getElementById("draw-eraser");
  const undoBtn = document.getElementById("draw-undo");
  const clearBtn = document.getElementById("draw-clear");
  const saveBtn = document.getElementById("draw-save");
  const closeBtn = document.getElementById("draw-close");

  let drawing = false;
  let erasing = false;
  let last = null;
  const history = [];

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const snapshot = document.createElement("canvas");
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    snapshot.getContext("2d").drawImage(canvas, 0, 0);

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (snapshot.width && snapshot.height) {
      ctx.drawImage(snapshot, 0, 0, window.innerWidth, window.innerHeight);
    }
    history.length = 0; // old undo states no longer match the canvas size
  }

  function stroke(a, b) {
    ctx.globalCompositeOperation = erasing ? "destination-out" : "source-over";
    ctx.strokeStyle = colorInput.value;
    ctx.lineWidth = Number(sizeInput.value) * (erasing ? 3 : 1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  canvas.addEventListener("pointerdown", (e) => {
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.length > 20) history.shift();
    last = { x: e.clientX, y: e.clientY };
    stroke(last, last); // draws a dot on a simple click
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const p = { x: e.clientX, y: e.clientY };
    stroke(last, p);
    last = p;
  });

  ["pointerup", "pointercancel"].forEach((type) =>
    canvas.addEventListener(type, () => { drawing = false; })
  );

  eraserBtn.addEventListener("click", () => {
    erasing = !erasing;
    eraserBtn.setAttribute("aria-pressed", String(erasing));
    eraserBtn.classList.toggle("is-active", erasing);
  });

  undoBtn.addEventListener("click", () => {
    const prev = history.pop();
    if (prev) ctx.putImageData(prev, 0, 0);
  });

  clearBtn.addEventListener("click", () => {
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  });

  saveBtn.addEventListener("click", () => {
    canvas.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "late-night-sketch.png";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  });

  const openDraw = () => document.body.classList.add("draw-mode");
  const closeDraw = () => document.body.classList.remove("draw-mode");

  drawOpen.addEventListener("click", openDraw);
  closeBtn.addEventListener("click", closeDraw);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDraw();
  });

  window.addEventListener("resize", resize);
  resize();
}
// Background scenes
const bg = document.getElementById("background-video");
const sceneBtn = document.getElementById("scene-toggle");
const scenePanel = document.getElementById("scene-panel");

if (bg && sceneBtn && scenePanel) {
  // Add more scenes here: { name: "label", src: "file.mp4" }
 const scenes = [
  { name: "tokyo", src: "background.mp4" },
  { name: "seoul", src: "seoul.mp4" },
  { name: "yeouido", src: "yeouido.mp4" },
];
  let index = 0;
  let switchId = 0;
  try {
    const saved = Number(localStorage.getItem("scene"));
    if (Number.isInteger(saved) && saved >= 0 && saved < scenes.length) index = saved;
  } catch (e) {}

  // Build a thumbnail card for each scene
  const cards = scenes.map((scene, i) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "scene-card";
    card.setAttribute("aria-label", "Switch to " + scene.name);

    const thumb = document.createElement("video");
    thumb.src = scene.src + "#t=1"; // show a frame from 1 second in
    thumb.muted = true;
    thumb.playsInline = true;
    thumb.preload = "metadata";

    const label = document.createElement("span");
    label.textContent = scene.name;

    card.append(thumb, label);
    card.addEventListener("click", () => selectScene(i));
    scenePanel.appendChild(card);
    return card;
  });

  function markActive() {
    cards.forEach((c, i) => c.classList.toggle("is-active", i === index));
  }

  function loadScene(animate) {
    const id = ++switchId;
    const apply = () => {
      if (id !== switchId) return; // a newer click replaced this one
      bg.src = scenes[index].src;
      bg.load();
      bg.play().catch(() => {});
      bg.addEventListener("loadeddata", () => bg.classList.remove("is-switching"), { once: true });
    };

    if (animate) {
      bg.classList.add("is-switching");
      setTimeout(apply, 400); // wait for the fade-out
    } else {
      apply();
    }
    markActive();
  }

  function selectScene(i) {
    if (i === index) { closePanel(); return; }
    index = i;
    try { localStorage.setItem("scene", String(index)); } catch (e) {}
    loadScene(true);
    closePanel();
  }

  function openPanel() {
    scenePanel.hidden = false;
    sceneBtn.setAttribute("aria-expanded", "true");
  }
  function closePanel() {
    scenePanel.hidden = true;
    sceneBtn.setAttribute("aria-expanded", "false");
  }

  sceneBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    scenePanel.hidden ? openPanel() : closePanel();
  });

  // close when clicking elsewhere or pressing Escape
  document.addEventListener("click", (e) => {
    if (!scenePanel.hidden && !scenePanel.contains(e.target)) closePanel();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });

    if (index !== 0) loadScene(false); // restore the saved scene on page load
  markActive();
}
// Clock
const clock = document.getElementById("clock");

if (clock) {
  function updateClock() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  updateClock();
  setInterval(updateClock, 1000);
}// Notes + to-do list
const notesBtn = document.getElementById("notes-toggle");
const notesPanel = document.getElementById("notes-panel");

if (notesBtn && notesPanel) {
  const tabNotes = document.getElementById("tab-notes");
  const tabTodo = document.getElementById("tab-todo");
  const notesView = document.getElementById("notes-view");
  const todoView = document.getElementById("todo-view");
  const notesText = document.getElementById("notes-text");
  const toTodoBtn = document.getElementById("notes-to-todo");
  const todoForm = document.getElementById("todo-form");
  const todoInput = document.getElementById("todo-input");
  const todoList = document.getElementById("todo-list");
  const clearDoneBtn = document.getElementById("todo-clear-done");
  const todoCount = document.getElementById("todo-count");

  let todos = [];
  try {
    notesText.value = localStorage.getItem("notes") || "";
    const saved = JSON.parse(localStorage.getItem("todos"));
    if (Array.isArray(saved)) todos = saved;
  } catch (e) {}

  function saveNotes() {
    try { localStorage.setItem("notes", notesText.value); } catch (e) {}
  }
  function saveTodos() {
    try { localStorage.setItem("todos", JSON.stringify(todos)); } catch (e) {}
  }

  function renderTodos() {
    todoList.innerHTML = "";
    todos.forEach((todo, i) => {
      const li = document.createElement("li");
      li.className = "todo-item" + (todo.done ? " is-done" : "");

      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = todo.done;
      check.setAttribute("aria-label", "Mark done: " + todo.text);
      check.addEventListener("change", () => {
        todos[i].done = check.checked;
        saveTodos();
        renderTodos();
      });

      const text = document.createElement("span");
      text.textContent = todo.text;

      const del = document.createElement("button");
      del.type = "button";
      del.className = "todo-delete";
      del.textContent = "×";
      del.setAttribute("aria-label", "Delete task");
      del.addEventListener("click", () => {
        todos.splice(i, 1);
        saveTodos();
        renderTodos();
      });

      li.append(check, text, del);
      todoList.appendChild(li);
    });

    const remaining = todos.filter((t) => !t.done).length;
    todoCount.textContent = todos.length ? "(" + remaining + ")" : "";
  }

  function showTab(name) {
    const isNotes = name === "notes";
    notesView.hidden = !isNotes;
    todoView.hidden = isNotes;
    tabNotes.classList.toggle("is-active", isNotes);
    tabTodo.classList.toggle("is-active", !isNotes);
    if (isNotes) notesText.focus(); else todoInput.focus();
  }

  function openPanel() {
    notesPanel.hidden = false;
    notesBtn.setAttribute("aria-expanded", "true");
    notesText.focus();
  }
  function closePanel() {
    notesPanel.hidden = true;
    notesBtn.setAttribute("aria-expanded", "false");
  }

  notesBtn.addEventListener("click", () => {
    notesPanel.hidden ? openPanel() : closePanel();
  });

  tabNotes.addEventListener("click", () => showTab("notes"));
  tabTodo.addEventListener("click", () => showTab("todo"));

  notesText.addEventListener("input", saveNotes);

  // Turn each line of the note into a task (strips "-", "*", "1." and "[ ]" prefixes)
  toTodoBtn.addEventListener("click", () => {
    const lines = notesText.value
      .split("\n")
      .map((line) => line.replace(/^\s*(?:[-*•]|\[[ xX]?\]|\d+[.)])\s*/, "").trim())
      .filter(Boolean);

    if (!lines.length) return;
    lines.forEach((text) => todos.push({ text, done: false }));
    notesText.value = "";
    saveNotes();
    saveTodos();
    renderTodos();
    showTab("todo");
  });

  todoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = todoInput.value.trim();
    if (!text) return;
    todos.push({ text, done: false });
    todoInput.value = "";
    saveTodos();
    renderTodos();
  });

  clearDoneBtn.addEventListener("click", () => {
    todos = todos.filter((t) => !t.done);
    saveTodos();
    renderTodos();
  });

  // opening the scene picker or drawing mode closes the notes panel
  document.addEventListener("click", (e) => {
    if (e.target.closest("#scene-toggle, #draw-open, #toggle-ui")) closePanel();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });
  // Sticker picker: add your own files here, { name: "label", src: "path.png" }
  const stickers = [
    { name: "none", src: "" },
    { name: "paperclip", src: "paperclip.png" },
    { name: "star", src: "star.png" },
    { name: "kiss", src: "kiss.png" },
    { name: "guitar", src: "guitar.png" },
    { name: "bow", src: "bow.png" },
  ];

  const stickerSelect = document.getElementById("sticker-select");
  const stickerImg = document.getElementById("note-sticker");

  stickers.forEach((s, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = s.name;
    stickerSelect.appendChild(opt);
  });

  function applySticker(i) {
    const s = stickers[i] || stickers[0];
    if (s.src) {
      stickerImg.src = s.src;
      stickerImg.hidden = false;
    } else {
      stickerImg.hidden = true;
    }
  }

  stickerImg.addEventListener("error", () => {
  console.error("Sticker not found:", stickerImg.src);
  stickerImg.hidden = true;
});

  let stickerIndex = 1;
  try {
    const saved = localStorage.getItem("sticker");
    if (saved !== null && Number(saved) >= 0 && Number(saved) < stickers.length) {
      stickerIndex = Number(saved);
    }
  } catch (e) {}
  stickerSelect.value = String(stickerIndex);
  applySticker(stickerIndex);

  stickerSelect.addEventListener("change", () => {
    stickerIndex = Number(stickerSelect.value);
    try { localStorage.setItem("sticker", String(stickerIndex)); } catch (e) {}
    applySticker(stickerIndex);
  });
  renderTodos();
}
  // Ambient audio
  const audio = document.getElementById("ambient-audio");
  const ambientButton = document.getElementById("ambient-toggle");
  const volume = document.getElementById("ambient-volume");
  const volumePanel = document.getElementById("ambient-volume-panel");

  if (!audio || !ambientButton) {
    console.error("Missing ambient audio or ambient button in index.html.");
    return;
  }

   audio.volume = volume ? Number(volume.value) / 100 : 0.2;

  ambientButton.addEventListener("click", async () => {
    if (audio.paused) {
      try {
        await audio.play();
        ambientButton.classList.add("is-playing");
        ambientButton.setAttribute("aria-pressed", "true");
        ambientButton.setAttribute("aria-label", "Pause ambient sounds");
        if (volumePanel) volumePanel.classList.add("is-visible");
      } catch (error) {
        console.error("Audio could not play:", error);
        alert("Audio couldn't play. Check that rain.mp3 is in your project folder.");
      }
    } else {
      audio.pause();
      ambientButton.classList.remove("is-playing");
      ambientButton.setAttribute("aria-pressed", "false");
      ambientButton.setAttribute("aria-label", "Play ambient sounds");
      if (volumePanel) volumePanel.classList.remove("is-visible");
    }
  });

      if (volume) {
    volume.addEventListener("input", () => {
      audio.volume = Number(volume.value) / 100;
    });
  }

  // Ambience picker: add more sounds here, { name: "label", src: "file.mp3" }
  const ambientSelect = document.getElementById("ambient-select");

  if (ambientSelect) {
    const sounds = [
      { name: "rain", src: "rain.mp3" },
      { name: "city skyline", src: "skyline.mp3" },
    ];

    sounds.forEach((s, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = s.name;
      ambientSelect.appendChild(opt);
    });

    let soundIndex = 0;
    try {
      const saved = Number(localStorage.getItem("ambient"));
      if (Number.isInteger(saved) && saved >= 0 && saved < sounds.length) soundIndex = saved;
    } catch (e) {}

    audio.src = sounds[soundIndex].src;
    ambientSelect.value = String(soundIndex);

    ambientSelect.addEventListener("change", async () => {
      const wasPlaying = !audio.paused;
      soundIndex = Number(ambientSelect.value);
      try { localStorage.setItem("ambient", String(soundIndex)); } catch (e) {}

      audio.src = sounds[soundIndex].src;
      audio.load();

      if (wasPlaying) {
        try {
          await audio.play();
        } catch (error) {
          console.error("Audio could not play:", error);
        }
      }
    });
  }
});