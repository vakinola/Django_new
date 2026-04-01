// static/js/final.js
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  document.querySelectorAll(".flash").forEach((flash) => {
    setTimeout(() => {
      flash.style.opacity = "0";
      setTimeout(() => flash.remove(), 400); // match CSS transition
    }, 6000);
  });

  // --- Small helpers ---
  const $ = (id) => document.getElementById(id);
  const getCsrf = () => {
    const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  };
  const statusEl = $("opStatus");
  console.log("final.js loaded ✅");
  console.log("delete button found:", !!document.getElementById("deleteDocBtn"));

  // showAlert now reuses the existing flash styles instead of Bootstrap alerts
  function showAlert(message, type = "success", timeout = 4000) {
    // map Bootstrap-style "danger" to our "error" class
    const flashType = type === "danger" ? "error" : type;
    const container = document.querySelector(".flash-container");
    if (!container) return;

    const flash = document.createElement("div");
    flash.className = `flash flash-${flashType}`;
    flash.innerHTML = `
      <span class="flash-message">${message}</span>
      <button class="flash-close" onclick="this.parentElement.remove()" aria-label="Dismiss">×</button>
    `;
    container.appendChild(flash);

    if (timeout) {
      setTimeout(() => {
        flash.classList.add("fade-out");
        setTimeout(() => flash.remove(), 400);
      }, timeout);
    }
  }

  async function postJSON(url, bodyObj) {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: bodyObj ? JSON.stringify(bodyObj) : null,
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.ok === false) {
      throw new Error(data.error || `Request failed: ${resp.status}`);
    }
    return data;
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }
  /*
  // Smoothly animate the progress bar width (helps fast uploads not "jump")
  function smoothTo(targetPct, bar, label, phaseText) {
    if (!bar) return;

    const current = parseFloat(bar.style.width) || 0;
    const start = performance.now();
    const duration = 350; // ms

    function step(t) {
      const p = Math.min(1, (t - start) / duration);
      const val = current + (targetPct - current) * p;

      bar.style.width = val.toFixed(1) + "%";
      if (label) label.textContent = `${phaseText}… ${Math.round(val)}%`;

      if (p < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function animateUploadTo40(bar, label) {
    if (!bar) return;

    const start = performance.now();
    const duration = 450; // ms
    const from = parseFloat(bar.style.width) || 0; // <-- current!
    const to = 40;

    function step(t) {
      const p = Math.min(1, (t - start) / duration);
      const v = from + (to - from) * p;

      bar.style.width = v.toFixed(1) + "%";
      if (label) label.textContent = `Uploading… ${Math.round(v)}%`;

      if (p < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  } */



  // --- Elements ---
  const quizRange = $("quizRange");
  const rangeValue = $("rangeValue");
  const browseBtn = $("browseBtn");
  const fileInput = $("fileInput");
  const fileStatus = $("fileStatus");
  const filePreview = $("filePreview");
  const generateBtn = $("generateBtn");
  const questionInp = $("questionInput");
  const askBtn = $("askBtn");
  const exportDiv = $("export-options");
  const quizBox = $("quizBox");
  const quizList = $("quizList");
  const quizStatus = $("quizStatus");
  const quizResults = $("quizResults");
  const submitQuizBtn = $("submitQuizBtn");

  // Sidebar / mobile controls
  const fileList = $("fileList");
  const deleteDocBtn = $("deleteDocBtn");
  const questionWarning = $("questionWarning");
  const quizWarning = $("quizWarning");
  const toggleBtn = $("toggleBtn");
  const sidebar = $("sidebar");
  const mobileToggle = $("mobileToggle");
  const navBackdrop = document.querySelector(".sa-backdrop");

  function setUploadSidebarOpen(isOpen) {
    if (!sidebar) return;
    sidebar.classList.toggle("open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
    navBackdrop?.classList.toggle("active", isOpen);
  }

  function syncMobileToggleIcon(isOpen) {
    const icon = mobileToggle?.querySelector("i");
    if (!icon) return;
    icon.classList.toggle("fa-bars", !isOpen);
    icon.classList.toggle("fa-times", isOpen);
  }

  // ==============================
  // 1️⃣ Range slider update
  // ==============================
  function updateRangeValue() {
    if (!quizRange || !rangeValue) return;

    const value = parseInt(quizRange.value);
    const min = parseInt(quizRange.min);
    const max = parseInt(quizRange.max);
    const percent = (value - min) / (max - min);

    rangeValue.textContent = value;
    quizRange.style.setProperty("--range-progress", `${percent * 100}%`);

    const trackWidth = quizRange.offsetWidth;
    const leftPosition = percent * trackWidth;
    rangeValue.style.left = `${leftPosition}px`;
  }

  quizRange?.addEventListener("input", updateRangeValue);
  window.addEventListener("load", () => {
    updateRangeValue();
    setTimeout(updateRangeValue, 10);
  });

  // ==============================
  // 2️⃣ File handling + preview + list
  // ==============================
  //let uploadedFiles = [];

  const uploadBox = document.getElementById("uploadBox");
  const selectedFileName = document.getElementById("selectedFileName");

  // === Browse button click ===
  browseBtn?.addEventListener("click", () => {
    fileInput?.click();
  });

  // === File input change handler ===
  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0] || null;

    // Update selected file name
    if (selectedFileName) {
      selectedFileName.textContent = file ? `Selected file: ${file.name}` : "";
    }

    // Optional: update status
    if (fileStatus) {
      fileStatus.textContent = file ? `Selected: ${file.name}` : "";
    }
  });

  // === Drag & drop handling ===
  if (uploadBox && fileInput) {
    // Prevent default behavior for drag events
    ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
      uploadBox.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Add hover style when dragging files over
    ["dragenter", "dragover"].forEach(eventName => {
      uploadBox.addEventListener(eventName, () => uploadBox.classList.add("dragover"));
    });

    // Remove hover style when leaving or dropping
    ["dragleave", "drop"].forEach(eventName => {
      uploadBox.addEventListener(eventName, () => uploadBox.classList.remove("dragover"));
    });

    // Handle dropped files
    uploadBox.addEventListener("drop", (e) => {
      const files = e.dataTransfer?.files;
      if (!files || !files.length) return;

      // Set dropped file to input
      const dt = new DataTransfer();
      dt.items.add(files[0]);
      fileInput.files = dt.files;

      // Update UI
      if (selectedFileName) selectedFileName.textContent = `Selected file: ${files[0].name}`;

      // Trigger change event for the same handling as browse button
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  // ==============================
  // 3️⃣ Ask question handler
  // ==============================

  // ---- 3) Ask a question (server) ----
  function ensureAnswerBox() {
    let box = $("answerBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "answerBox";
      box.className = "mt-3";
      box.innerHTML = `
        <div class="border rounded p-3 bg-light" id="answerText" style="white-space: pre-wrap;"></div>
      `;
      questionInp?.parentNode?.insertBefore(box, questionInp.nextSibling);
    }
    return box;
  }

  async function askQuestion() {
    const q = (questionInp?.value || "").trim();
    if (!q) { questionInp?.focus(); return; }

    const filename = getSelectedDocName();
    if (!filename) {
      alert("Please select a document from 'Uploaded files' first.");
      return;
    }

    if (askBtn) askBtn.disabled = true;
    setStatus("Answering...");
    try {
      const data = await postJSON("/ask", { question: q, filename });
      ensureAnswerBox();
      const answerText = $("answerText");
      if (answerText) answerText.textContent = data.answer || "(no answer)";
      setStatus("✅ Answer ready.");
    } catch (err) {
      setStatus(`⚠️ ${err.message}`);
    } finally {
      if (askBtn) askBtn.disabled = false;
    }
  }

  if (askBtn) askBtn.addEventListener("click", askQuestion);
  if (questionInp) {
    questionInp.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        askQuestion();
        return;
      } //else if (ev.key === "Enter" && ev.shiftKey) {
      // Shift+Enter → submit

      //}
    });
  }


  //################################################################
  //handler for delete document
  //################################################################
  deleteDocBtn?.addEventListener("click", async () => {
    const filename = getSelectedDocName();

    if (!filename) {
      showModal("Please select a document to delete.");
      return;
    }

    const confirmed = await showConfirmModal(
      `Delete "${filename}" and its database?`
    );

    if (!confirmed) return;

    try {
      const resp = await fetch("/delete_doc", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ filename })
      });
      const data = await resp.json();
      if (!resp.ok || data.ok === false) {
        throw new Error(data.error || "Delete failed");
      }

      // no client-side alert; page will reload and server flash will appear
      setTimeout(() => location.reload(), 1200);

    } catch (e) {
      // still show error immediately since reload won't help
      showAlert(e.message, "danger");
    }
  });

  function showConfirmModal(message) {
    return new Promise((resolve) => {
      const modal = $("customModal");
      const modalMsg = $("customModalMsg");
      const modalBtn = $("customModalBtn");      // OK / Confirm
      const modalClose = $("customModalClose");  // X / Cancel

      if (!modal || !modalMsg || !modalBtn || !modalClose) {
        resolve(false);
        return;
      }

      modalMsg.textContent = message;
      modal.classList.add("show");

      function cleanup() {
        modal.classList.remove("show");
        modalBtn.removeEventListener("click", onConfirm);
        modalClose.removeEventListener("click", onCancel);
        modal.removeEventListener("click", onOutside);
        window.removeEventListener("keydown", onEsc);
      }

      function onConfirm() {
        cleanup();
        resolve(true);
      }

      function onCancel() {
        cleanup();
        resolve(false);
      }

      function onOutside(e) {
        if (e.target === modal) onCancel();
      }

      function onEsc(e) {
        if (e.key === "Escape") onCancel();
      }

      modalBtn.addEventListener("click", onConfirm);
      modalClose.addEventListener("click", onCancel);
      modal.addEventListener("click", onOutside);
      window.addEventListener("keydown", onEsc);
    });
  }


  function showModal(message) {
    const modal = $("customModal");
    const modalMsg = $("customModalMsg");
    const modalBtn = $("customModalBtn");
    const modalClose = $("customModalClose");
    if (!modal || !modalMsg || !modalBtn || !modalClose) return;

    modalMsg.textContent = message;
    modal.classList.add("show");

    function closeModal() {
      modal.classList.remove("show");
      modalBtn.removeEventListener("click", closeModal);
      modalClose.removeEventListener("click", closeModal);
      modal.removeEventListener("click", outsideClick);
      window.removeEventListener("keydown", escClose);
    }

    function escClose(e) {
      if (e.key === "Escape") closeModal();
    }

    function outsideClick(e) {
      if (e.target === modal) closeModal();
    }

    modalBtn.addEventListener("click", closeModal);
    modalClose.addEventListener("click", closeModal);
    window.addEventListener("keydown", escClose);
    modal.addEventListener("click", outsideClick);
  }



  // ------------------------------------
  // Handle upload with real progress (0–40%)
  // ------------------------------------
  let __clientUploadPct = 0;        // 0..40 from xhr.upload
  let __clientUploading = false;    // true while XHR upload is in progress

  const uploadForm = document.getElementById("uploadForm");
  if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      // Abort any previous upload XHR
      window.__currentUploadXhr?.abort();
      window.__currentUploadXhr = null;

      // Stop any previous poller before starting a new upload
      if (window.__progressPoller) {
        clearInterval(window.__progressPoller);
        window.__progressPoller = null;
      }

      const fileInput = document.getElementById("fileInput");
      const file = fileInput?.files?.[0];
      //if (!file) { alert("Please choose a file first!"); return; }

      if (!file) {
        showModal("Please choose a file first!");
        return;
      }
      //Disable submit button during upload
      uploadForm
        .querySelector("button[type=submit]")
        ?.setAttribute("disabled", "true");


      // 1) Create job_id before uploading
      const j = await fetch("/init_upload", { method: "POST", headers: { "X-CSRFToken": getCsrf() } }).then(r => r.json());
      if (!j.ok) { showModal("Could not start job"); return; }
      const jobId = j.job_id;

      // 2) Show progress bar UI
      const wrap = document.getElementById("buildProgress");
      const bar = document.getElementById("buildBar");
      const label = document.getElementById("buildLabel");

      if (wrap) wrap.style.display = "block";
      if (bar) {
        bar.classList.remove("bg-danger");
        bar.classList.add("processing");
        bar.style.width = "0%";
      }
      if (label) label.textContent = "Uploading… 0%";

      // 3) Start polling AFTER a short delay to let XHR get ahead
      setTimeout(() => startProgressPoller(jobId), 800);

      // 4) Upload via XHR (WITH client-side progress)
      const formData = new FormData();
      formData.append("file", file);

      __clientUploadPct = 0;
      __clientUploading = true;

      const xhr = new XMLHttpRequest();
      window.__currentUploadXhr = xhr;


      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;

        const frac = e.loaded / e.total;                 // 0..1
        const pct = Math.max(1, Math.floor(frac * 40));  // 1..40
        __clientUploadPct = pct;

        // IMPORTANT: update UI directly here for buttery smooth upload
        if (bar) bar.style.width = pct + "%";
        if (label) label.textContent = `Uploading… ${pct}%`;
      };

      xhr.addEventListener("load", () => {
        __clientUploading = false;
        window.__uploadFloor = 45;

        animateToTarget(bar, label, 45, "Processing", 400);

        let bridgePct = 45;
        window.__bridgeInterval = setInterval(() => {
          bridgePct += 1;
          if (bridgePct >= 65) {
            clearInterval(window.__bridgeInterval);
            window.__bridgeInterval = null;
            return;
          }
          const currentBar = parseFloat(bar.style.width) || 0;
          if (currentBar < bridgePct) {
            bar.style.width = bridgePct + "%";
            if (label) label.textContent = `Processing… ${bridgePct}%`;
            window.__uploadFloor = bridgePct;
          } else {
            clearInterval(window.__bridgeInterval);
            window.__bridgeInterval = null;
          }
        }, 800);
      });

      xhr.addEventListener("error", () => {
        __clientUploading = false;
        // 🔓 Re-enable submit button
        uploadForm
          ?.querySelector("button[type=submit]")
          ?.removeAttribute("disabled");

        if (label) label.textContent = "Upload error!";
        if (bar) bar.classList.add("bg-danger");
      });

      xhr.open("POST", uploadForm.action, true);
      xhr.setRequestHeader("X-Job-Id", jobId);
      xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      xhr.setRequestHeader("X-CSRFToken", getCsrf());
      xhr.send(formData);

    });
  }

  // ==============================
  // Poller handles progress updates
  // ==============================
  function animateToTarget(bar, label, targetPct, phaseText, durationMs = 800) {
    if (!bar) return;
    if (window.__animFrame) cancelAnimationFrame(window.__animFrame);

    const from = parseFloat(bar.style.width) || 0;
    if (from >= targetPct) return;

    const start = performance.now();

    function step(now) {
      const p = Math.min(1, (now - start) / durationMs);
      const val = from + (targetPct - from) * p;
      bar.style.width = val.toFixed(1) + "%";
      if (label) label.textContent = `${phaseText}… ${Math.round(val)}%`;
      if (p < 1) window.__animFrame = requestAnimationFrame(step);
      else window.__animFrame = null;
    }

    window.__animFrame = requestAnimationFrame(step);
  }


  function startProgressPoller(jobId) {
    let lastPct = window.__uploadFloor || 0;
    window.__uploadFloor = 0;

    // If we already have a floor from the upload, set the bar immediately
    if (lastPct > 0) {
      const buildBar2 = document.getElementById("buildBar");
      const buildLabel2 = document.getElementById("buildLabel");
      if (buildBar2) buildBar2.style.width = lastPct + "%";
      if (buildLabel2) buildLabel2.textContent = `Processing… ${lastPct}%`;
    }
    let lastPhase = "";
    const buildProgress = document.getElementById("buildProgress");
    const buildBar = document.getElementById("buildBar");
    const buildLabel = document.getElementById("buildLabel");
    if (!jobId || !buildProgress || !buildBar || !buildLabel || window.__progressPoller) return;

    buildProgress.style.display = "block";
    buildBar.classList.remove("bg-danger");

    const stop = () => {
      clearInterval(window.__progressPoller);
      window.__progressPoller = null;
    };

    window.__progressPoller = setInterval(async () => {
      try {
        const resp = await fetch(`/progress/${jobId}`, { cache: "no-store" });
        if (!resp.ok) {
          stop();
          buildLabel.textContent = "Progress unavailable.";
          buildBar.classList.add("bg-danger");
          // 🔓 Re-enable submit button
          uploadForm?.querySelector('button[type="submit"]')?.removeAttribute("disabled");
          return;
        }

        const data = await resp.json();
        const phaseRaw = data.phase || "queued";
        const phase = phaseRaw.toLowerCase();
        let pct = Math.max(0, Math.min(100, Number(data.pct || 0)));

        // Ignore fake "queued 0%" after progress already started
        if (lastPct > 0 && phase === "queued" && pct === 0) {
          return;
        }

        // Never allow progress to move backwards
        if (pct < lastPct) {
          pct = lastPct;
        } else {
          lastPct = pct;
        }

        lastPhase = phase;

        // While client upload is active, ignore server upload < 40
        if (__clientUploading && pct < 40) {
          return;
        }

        // Cancel any running animation before updating
        if (window.__animFrame) {
          cancelAnimationFrame(window.__animFrame);
          window.__animFrame = null;
        }
        animateToTarget(buildBar, buildLabel, pct, data.phase || "Working", 400);
        if (phase !== "completed" && phase !== "error") {
          buildBar.classList.add("processing");
        } else {
          buildBar.classList.remove("processing");
        }

        if (phase === "completed") {
          stop();
          buildBar.classList.remove("processing");
          buildLabel.textContent = "Completed 100%";

          // ✅ Show uploaded files container
          const uploadedContainer = document.getElementById("uploadedFilesContainer");
          if (uploadedContainer) uploadedContainer.style.display = "block";

          // Re-enable submit button
          uploadForm?.querySelector('button[type="submit"]')?.removeAttribute("disabled");

          setTimeout(() => location.reload(), 400);
          return;
        }

        if (phase === "error") {
          stop();
          buildBar.classList.remove("processing");
          buildLabel.textContent = `Error: ${data.error || "Unknown error"}`;
          buildBar.classList.add("bg-danger");

          // 🔓 Re-enable submit button
          uploadForm?.querySelector('button[type="submit"]')?.removeAttribute("disabled");
          return;
        }
      } catch (e) {
        stop();
        buildLabel.textContent = "Could not fetch progress.";
        buildBar.classList.add("bg-danger");
        // 🔓 Re-enable submit button
        uploadForm?.querySelector('button[type="submit"]')?.removeAttribute("disabled");
      }
    }, 500);

    window.addEventListener("beforeunload", stop, { once: true });
  }


  // Auto-start when page already has a job id (e.g., /generate)
  const initialJobId = document.body?.dataset?.jobId || "";
  const wrap = document.getElementById("buildProgress");
  if (initialJobId && wrap && getComputedStyle(wrap).display !== "none" && !window.__progressPoller) {
    startProgressPoller(initialJobId);
  }






  // ---- 4) Generate Quiz (server) + render + export ----
  let lastQuiz = [];
  let quizSubmitted = false;

  function renderQuiz(quiz) {
    console.log("QUIZ DATA:", JSON.stringify(quiz, null, 2));
    if (!quizList) return;
    quizList.innerHTML = '';
    quiz.forEach((q, idx) => {
      const correct = (q.correct || '').trim().replace(/[^A-E]/ig, '').toUpperCase(); // "A"–"E"
      const item = document.createElement('div');
      item.className = 'list-group-item';
      item.dataset.correct = correct;

      const choicesHtml = ['A', 'B', 'C', 'D', 'E'].map((L, i) => {
        const raw = (q.choices?.[i] || '').trim();
        const labelText = raw.replace(/^[A-E]\)\s*/i, '');
        const id = `q${idx}-${L}`;
        return `
          <div class="form-check ms-2">
            <input class="form-check-input" type="radio" name="q${idx}" id="${id}" value="${L}">
            <label class="form-check-label" for="${id}">
              <span class="badge bg-light text-dark me-2">${L}.</span> ${labelText || raw}
            </label>
          </div>
        `;
      }).join('');

      // Do not render inline explanation toggle before grading (only show after grading)
      item.innerHTML = `
          <div class="fw-semibold mb-1">${q.question || ('Question ' + (idx + 1))}</div>
          ${choicesHtml}
          <div class="mt-2" id="feedback-${idx}"></div>
        `;

      quizList.appendChild(item);
    });

    if (quizResults) quizResults.innerHTML = '';   // clear prior summary
    if (quizStatus) quizStatus.textContent = '';  // clear status line
    if (quizBox) quizBox.style.display = 'block';
  }

  function gradeQuiz() {
    if (!quizList) return;
    const items = [...quizList.querySelectorAll('.list-group-item')];
    const total = items.length;

    const answers = items.map((item, idx) => {
      const selected = item.querySelector('input[type="radio"]:checked');
      return {
        idx,
        selected: selected ? selected.value.toUpperCase() : null,
        correct: (item.dataset.correct || '').toUpperCase()
      };
    });

    // NEW: grab warning div
    const quizWarning = document.getElementById('quizWarning');
    // Require all answered
    const unanswered = answers.filter(a => !a.selected).map(a => a.idx + 1);
    if (unanswered.length) {
      if (quizWarning) quizWarning.textContent = "⛔Please answer all Questions before submitting";
      if (quizResults) quizResults.innerHTML = '';
      if (quizStatus) quizStatus.textContent = "";
      return; // ⛔ do not reveal anything yet
    }

    // if we get here, everything is answered → clear warning
    if (quizWarning) quizWarning.textContent = "";
    quizSubmitted = true;

    let correctCount = 0;

    answers.forEach(a => {
      const item = items[a.idx];
      const feedbackDiv = item.querySelector(`#feedback-${a.idx}`);
      const options = [...item.querySelectorAll('input[type="radio"]')];

      options.forEach(opt => {
        const label = item.querySelector(`label[for="${opt.id}"]`);
        label.classList.remove('text-success', 'text-danger');

        // Highlight correct answer green
        if (opt.value.toUpperCase() === a.correct) {
          label.classList.add('text-success', 'fw-bold');
        }

        // Highlight user's wrong choice red
        if (opt.checked && opt.value.toUpperCase() !== a.correct) {
          label.classList.add('text-danger', 'fw-bold');
        }
      });

      const ok = a.selected === a.correct;
      if (ok) correctCount++;

      if (feedbackDiv) {
        const resultHtml = ok
          ? `<span class="text-success fw-bold answer-correct d-inline-block">✅  Correct!</span>`
          : `<span class="text-danger fw-bold answer-wrong d-inline-block">❌  Wrong. Correct answer: ${a.correct}</span>`;

        const explanation = lastQuiz[a.idx]?.explanation;
        const authAllowFeedback = typeof window.__userAuthenticated !== 'undefined' ? window.__userAuthenticated : false;
        const explanationHtml = (authAllowFeedback && explanation)
          ? `
          <div>
            <button class="explanation-toggle" type="button" onclick="showExplanation(${a.idx})" id="exp-btn-${a.idx}">
              ▶ Show explanation
            </button>
            <div id="explanation-${a.idx}" class="explanation-panel">
              ${explanation}
            </div>
          </div>`
          : '';

        feedbackDiv.innerHTML = resultHtml + explanationHtml;
      }
    });


    // Calculate score
    const pct = Math.round((correctCount / total) * 100);
    // Save result to server
    const filename = getSelectedDocName();
    if (filename) {
      fetch("/save_result", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({
          filename: filename,
          correct: correctCount,
          total: total,
          percent: pct
        })
      }).catch(() => {
        // fail silently – quiz UI still works
      });
    }


    // Show overall score
    if (quizResults) {
      quizResults.innerHTML = `
        <div style="
          border: 1px solid;
          padding: 10px;
          border-radius: 5px;
          margin: 10px 0 0 0;
          font-size: 14px;
          font-weight: 700;
        ">
          Your Score: <strong>${correctCount}/${total}</strong> (${pct}%)
        </div>
      `;

      // Show the "View Scores" button
      const viewBtn = document.getElementById("viewScoresBtn");
      if (viewBtn) {
        viewBtn.classList.remove("result-hidden");
      }
    }
    if (quizStatus) quizStatus.textContent = '✅ Graded.';


  }

  // Attach once
  if (submitQuizBtn) submitQuizBtn.addEventListener('click', gradeQuiz);

  // Toggle explanation panel for a quiz question (only visible after grading)
  window.showExplanation = function(idx) {
    const el = document.getElementById(`explanation-${idx}`);
    const btn = document.getElementById(`exp-btn-${idx}`);
    if (!el) return;
    const isOpen = el.style.display === "block";
    el.style.display = isOpen ? "none" : "block";
    if (btn) btn.textContent = isOpen ? "▶ Show explanation" : "▼ Hide explanation";
  };

  function attachExportButtons() {
    if (!exportDiv) return;

    exportDiv.innerHTML = `
    <button id="exportPdfBtn" class="btn btn-outline-secondary exportpdf">
      Export PDF
    </button>
  `;

    const exportPdfBtn = $("exportPdfBtn");
    if (!exportPdfBtn) return;

    exportPdfBtn.addEventListener("click", () => {
      if (!lastQuiz.length || !window.jspdf) {
        showAlert("PDF export not available.", "warning");
        return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "mm", format: "a4" });

      const hasAnswers = quizSubmitted;

      const pageBottom = 280;
      let yPos = 22;

      let filename = getSelectedDocName() || "quiz";
      const displayTitle = filename.replace(/\.pdf$/i, "");

      // ================= Header =================
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`Title: ${displayTitle}`, 10, 15);

      if (hasAnswers && quizResults?.innerHTML.includes("Your Score")) {
        const m = quizResults.innerHTML.match(/(\d+)\/(\d+).*?(\d+)%/);
        if (m) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          doc.text(`Score: ${m[1]}/${m[2]} (${m[3]}%)`, 10, 22);
          yPos = 30;
        }
      }

      // ================= Questions =================
      lastQuiz.forEach((q, qIndex) => {
        const cleanQuestion = (q.question || "").replace(
          /^\s*(question\s*\d+[:.)-]?\s*)/i,
          ""
        );

        const item = quizList?.querySelector(
          `.list-group-item:nth-child(${qIndex + 1})`
        );
        const selected = hasAnswers
          ? item?.querySelector("input:checked")?.value?.toUpperCase()
          : null;
        const correct = (
          item?.dataset.correct ||
          q.correct ||
          ""
        ).replace(/[^A-D]/gi, "").toUpperCase();

        const isCorrect = selected && selected === correct;

        // ---- Estimate space needed ----
        let estimatedHeight = 10 + (q.choices?.length || 0) * 7;
        if (hasAnswers && selected) estimatedHeight += 10;
        if (hasAnswers && q.explanation) estimatedHeight += 8;

        if (yPos + estimatedHeight > pageBottom) {
          doc.addPage();
          yPos = 15;
        }

        // ---- Question ----
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        const qLines = doc.splitTextToSize(
          `Question ${qIndex + 1}: ${cleanQuestion}`,
          180
        );
        doc.text(qLines, 10, yPos);
        yPos += qLines.length * 5 + 3;

        // ---- Choices ----
        q.choices.forEach((choice, i) => {
          const letter = String.fromCharCode(65 + i);
          //const text = choice.replace(/^[A-D]\)\s*/i, "");
          const text = choice.replace(/^[A-E][\)\.\:-]\s*/i, ""); // strips A) A. A: A- ... through E

          let color = [0, 0, 0];
          let weight = "normal";

          if (hasAnswers) {
            if (letter === correct) {
              color = [34, 197, 94];
              weight = "bold";
            }
            if (selected === letter && !isCorrect) {
              color = [239, 68, 68];
              weight = "bold";
            }
          }

          doc.setFont("helvetica", weight);
          doc.setTextColor(...color);

          const lines = doc.splitTextToSize(`${letter}. ${text}`, 165);
          doc.text(lines, 15, yPos);
          yPos += lines.length * 4 + 2;

          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
        });

        // ---- Feedback ----
        if (hasAnswers && selected) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(
            isCorrect ? 34 : 239,
            isCorrect ? 197 : 68,
            isCorrect ? 94 : 68
          );
          doc.text(
            `Your answer: ${selected}    Correct answer: ${correct}`,
            15,
            yPos
          );
          yPos += 6;
          doc.setTextColor(0, 0, 0);
        }

        // ---- Explanation ----
        if (hasAnswers && q.explanation) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(90, 90, 90);
          const exp = doc.splitTextToSize(
            `Explanation: ${q.explanation}`,
            165
          );
          doc.text(exp, 15, yPos);
          yPos += exp.length * 4 + 3;
          doc.setTextColor(0, 0, 0);
        }

        yPos += 5;
      });

      // ================= Answer Key =================
      if (!hasAnswers) {
        doc.addPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Answer Key", 10, 15);

        let y = 25;
        lastQuiz.forEach((q, i) => {
          const correct = (q.correct || "")
            .replace(/[^A-E]/gi, "")
            .toUpperCase();
          doc.setFontSize(11);
          doc.setFont("helvetica", "normal");
          doc.text(`Question ${i + 1}: ${correct}`, 10, y);
          y += 6;
          if (y > pageBottom) {
            doc.addPage();
            y = 15;
          }
        });
      }

      // ================= Page Numbers (minimal) =================
      const pageCount = doc.getNumberOfPages();

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(String(i), 200, 290, { align: "right" });
      }
      doc.save(`${displayTitle}_quiz.pdf`);
    });
  }






  function clearPreviousQuiz() {
    lastQuiz = [];
    quizSubmitted = false;

    if (quizList) quizList.innerHTML = "";
    if (quizResults) quizResults.innerHTML = "";
    if (quizStatus) quizStatus.textContent = "";
    if (quizWarning) quizWarning.textContent = "";
    if (exportDiv) exportDiv.innerHTML = "";
    if (quizBox) quizBox.style.display = "none";
  }

  if (generateBtn && quizRange) {
    generateBtn.addEventListener("click", async () => {
      const num = parseInt(quizRange.value || "5", 10);
      const filename = getSelectedDocName();

      // Mobile UX: If no file selected, open sidebar and show notification
      if (!filename) {
        if (window.innerWidth <= 768) { // mobile breakpoint
          setUploadSidebarOpen(true);
          syncMobileToggleIcon(true);
          showModal("Please select a document from 'Uploaded files' first.");
        } else {
          showModal("Please select a document from 'Uploaded files' first.");
        }
        return;
      }

      // CLEAR OLD QUIZ BEFORE GENERATING A NEW ONE
      clearPreviousQuiz();

      generateBtn.disabled = true;
      if (quizStatus) quizStatus.textContent = `Generating ${num} questions...`;
      try {
        const data = await postJSON("/generate_quiz", { num_questions: num, filename, });
        lastQuiz = data.quiz || [];
        renderQuiz(lastQuiz);
        attachExportButtons();
        if (quizStatus) quizStatus.textContent = '✅ Quiz ready.';
      } catch (err) {
        if (quizStatus) quizStatus.textContent = `⚠️ ${err.message}`;
      } finally {
        generateBtn.disabled = false;
      }
    });
  }

  // =======================================
  // 5️⃣a. Helper to get selected document
  // ======================================
  function getSelectedDocName() {
    const selected = document.querySelector(".doc-select:checked");
    return selected ? selected.value : null;
  }

  // Only allow one document checked at a time
  document.addEventListener("change", (e) => {
    if (e.target.classList && e.target.classList.contains("doc-select")) {
      if (e.target.checked) {
        // Ensure only one is checked
        document.querySelectorAll(".doc-select").forEach((cb) => {
          if (cb !== e.target) cb.checked = false;
        });

        // Clear previous answer
        const answerBox = document.getElementById("answerBox");
        const answerText = document.getElementById("answerText");
        const questionInput = document.getElementById("questionInput");
        if (answerText) answerText.textContent = "";
        if (answerBox) answerBox.remove();
        if (questionInput) questionInput.value = "";

        // Clear previous quiz
        const quizBox = document.getElementById("quizBox");
        const quizList = document.getElementById("quizList");
        const quizResults = document.getElementById("quizResults");
        const quizStatus = document.getElementById("quizStatus");
        const quizWarning = document.getElementById("quizWarning");
        const exportDiv = document.getElementById("export-options");

        if (quizList) quizList.innerHTML = "";
        if (quizResults) quizResults.innerHTML = "";
        if (quizStatus) quizStatus.textContent = "";
        if (quizWarning) quizWarning.textContent = "";
        if (quizBox) quizBox.style.display = "none";
        if (exportDiv) exportDiv.innerHTML = "";

        // When user selects a doc, load its summary
        const filename = e.target.value;
        loadSummaryFor(filename);
      } else {
        // If user unchecks, you could also hide the summary if you want
        // const sumSec = document.getElementById("summarySection");
        // const sumTxt = document.getElementById("summaryText");
        // if (sumSec && sumTxt) { sumTxt.textContent = ""; sumSec.style.display = "none"; }
      }
    }
  });


  if (fileList) {
    const checkboxes = fileList.querySelectorAll(".doc-select");
    if (checkboxes.length === 1) {
      checkboxes[0].checked = true;
      // Trigger change event to run existing logic (load summary, clear old quiz, etc.)
      const event = new Event("change", { bubbles: true });
      checkboxes[0].dispatchEvent(event);
    }
  }

  syncDeleteButtonVisibility();


  async function loadSummaryFor(filename) {
    const sumSec = document.getElementById("summarySection");
    const sumTxt = document.getElementById("summaryText");
    if (!sumSec || !sumTxt) return;
    sumTxt.textContent = "Loading summary…";
    sumSec.style.display = "block";

    try {
      const resp = await fetch(`/summary?filename=${encodeURIComponent(filename)}`, {
        cache: "no-store",
      });
      const data = await resp.json();

      // Apply same formatting as server: **bold** + newlines
      let html = (data.summary || "(No summary stored yet for this document.)")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
      sumTxt.innerHTML = html;
    } catch (e) {
      sumTxt.textContent = "Could not load summary.";
    }
  }

  // ==============================
  // 5️⃣ Sidebar toggles
  // ==============================
  toggleBtn?.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    const icon = toggleBtn.querySelector("i");
    icon.classList.toggle("fa-angle-double-right");
    icon.classList.toggle("fa-angle-double-left");
  });

  mobileToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpening = !sidebar.classList.contains("open");
    setUploadSidebarOpen(isOpening);
    syncMobileToggleIcon(isOpening);
  });

  navBackdrop?.addEventListener("click", () => {
    if (!document.body.classList.contains("upload-page")) return;
    setUploadSidebarOpen(false);
    syncMobileToggleIcon(false);
  });



  // Feedback modal submit/open handling is centralized in static/js/modal.js.
  // Avoid duplicate listeners on upload pages.
  if (!window.__feedbackModalWired) {
    console.warn("Expected modal feedback wiring was not found.");
  }

  // ============================================================
  // Mobile — Tap-to-Upload (auto-upload on file selection)
  // ============================================================
  const mobileUploadBox = document.getElementById("mobileUploadBox");
  const mobileFileInput = document.getElementById("mobileFileInput");
  const mobileSelectedFileName = document.getElementById("mobileSelectedFileName");
  const mobileUploadForm = document.getElementById("mobileUploadForm");

  if (mobileUploadBox && mobileFileInput) {
    mobileUploadBox.addEventListener("click", () => mobileFileInput.click());
    mobileUploadBox.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); mobileFileInput.click(); }
    });
  }

  if (mobileFileInput) {
    mobileFileInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (mobileSelectedFileName) mobileSelectedFileName.textContent = `Selected: ${file.name}`;
      await mobileDoUpload(file);
    });
  }

  async function mobileDoUpload(file) {
    if (!mobileUploadForm) return;

    window.__currentUploadXhr?.abort();
    window.__currentUploadXhr = null;
    if (window.__progressPoller) { clearInterval(window.__progressPoller); window.__progressPoller = null; }

    const mWrap  = document.getElementById("mobileBuildProgress");
    const mBar   = document.getElementById("mobileBuildBar");
    const mLabel = document.getElementById("mobileBuildLabel");

    if (mWrap)  mWrap.style.display = "block";
    if (mBar)   { mBar.classList.remove("bg-danger"); mBar.classList.add("processing"); mBar.style.width = "0%"; }
    if (mLabel) mLabel.textContent = "Uploading… 0%";
    if (mobileUploadBox) mobileUploadBox.style.pointerEvents = "none";

    const j = await fetch("/init_upload", {
      method: "POST",
      headers: { "X-CSRFToken": getCsrf() },
      credentials: "same-origin"
    }).then(r => r.json()).catch(() => ({}));

    if (!j.ok) {
      showModal("Could not start upload.");
      if (mobileUploadBox) mobileUploadBox.style.pointerEvents = "";
      return;
    }
    const jobId = j.job_id;

    startMobileProgressPoller(jobId, mBar, mLabel, mWrap);

    const formData = new FormData();
    formData.append("file", file);
    __clientUploadPct = 0;
    __clientUploading = true;

    const xhr = new XMLHttpRequest();
    window.__currentUploadXhr = xhr;

    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return;
      const pct = Math.max(1, Math.floor((ev.loaded / ev.total) * 40));
      __clientUploadPct = pct;
      if (mBar)   mBar.style.width = pct + "%";
      if (mLabel) mLabel.textContent = `Uploading… ${pct}%`;
    };

    xhr.addEventListener("load", () => {
      __clientUploading = false;
      if (mBar   && __clientUploadPct < 40) mBar.style.width = "40%";
      if (mLabel && __clientUploadPct < 40) mLabel.textContent = "Uploading… 40%";
    });

    xhr.addEventListener("error", () => {
      __clientUploading = false;
      if (mobileUploadBox) mobileUploadBox.style.pointerEvents = "";
      if (mLabel) mLabel.textContent = "Upload error!";
      if (mBar)   mBar.classList.add("bg-danger");
    });

    xhr.open("POST", mobileUploadForm.action, true);
    xhr.setRequestHeader("X-Job-Id", jobId);
    xhr.setRequestHeader("X-CSRFToken", getCsrf());
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.send(formData);
  }

  function startMobileProgressPoller(jobId, bar, label, wrap) {
    let lastPct = 0;
    if (!jobId || !wrap || !bar || !label || window.__progressPoller) return;
    wrap.style.display = "block";
    bar.classList.remove("bg-danger");

    const stop = () => { clearInterval(window.__progressPoller); window.__progressPoller = null; };

    window.__progressPoller = setInterval(async () => {
      try {
        const resp = await fetch(`/progress/${jobId}`, { cache: "no-store" });
        if (!resp.ok) { stop(); label.textContent = "Progress unavailable."; return; }
        const data = await resp.json();
        const phase = (data.phase || "queued").toLowerCase();
        let pct = Math.max(0, Math.min(100, Number(data.pct || 0)));
        if (lastPct > 0 && phase === "queued" && pct === 0) return;
        if (pct < lastPct && phase !== "error") pct = lastPct;
        lastPct = pct;
        if (__clientUploading && phase === "uploading" && pct < 40) return;
        bar.style.width = pct + "%";
        label.textContent = `${data.phase || "Working"}… ${pct}%`;
        if (["processing", "summarizing", "queued"].includes(phase)) bar.classList.add("processing");
        else bar.classList.remove("processing");
        if (phase === "completed") {
          stop();
          bar.classList.remove("processing");
          label.textContent = "Completed 100%";
          if (mobileUploadBox) mobileUploadBox.style.pointerEvents = "";
          setTimeout(() => location.reload(), 400);
        } else if (phase === "error") {
          stop();
          label.textContent = `Error: ${data.error || "Unknown error"}`;
          bar.classList.add("bg-danger");
          if (mobileUploadBox) mobileUploadBox.style.pointerEvents = "";
        }
      } catch (err) {
        stop();
        label.textContent = "Could not fetch progress.";
        bar.classList.add("bg-danger");
        if (mobileUploadBox) mobileUploadBox.style.pointerEvents = "";
      }
    }, 500);

    window.addEventListener("beforeunload", stop);
    window.addEventListener("unload", function cleanup() {
      stop();
      window.removeEventListener("unload", cleanup);
    });
  }

  // ============================================================
  // Mobile — "Uploaded Files" collapsible toggle
  // ============================================================
  const mobileUploadedToggle = document.getElementById("mobileUploadedToggle");
  const mobileUploadedPanel  = document.getElementById("mobileUploadedPanel");

  if (mobileUploadedToggle && mobileUploadedPanel) {
    mobileUploadedToggle.addEventListener("click", () => {
      const expanded = mobileUploadedToggle.getAttribute("aria-expanded") === "true";
      mobileUploadedToggle.setAttribute("aria-expanded", String(!expanded));
      mobileUploadedPanel.classList.toggle("open");
      mobileUploadedPanel.setAttribute("aria-hidden", String(expanded));
    });
  }

  // Mobile delete
  const mobileDeleteDocBtn = document.getElementById("mobileDeleteDocBtn");
  if (mobileDeleteDocBtn) {
    mobileDeleteDocBtn.addEventListener("click", async () => {
      const checked = document.querySelector("#mobileUploadedPanel .doc-select:checked");
      const filename = checked?.value;
      if (!filename) { showModal("Please select a file to delete."); return; }

      const confirmed = await showConfirmModal(`Delete "${filename}" and its database?`);
      if (!confirmed) return;

      try {
        const resp = await fetch("/delete_doc", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
          credentials: "same-origin",
          body: JSON.stringify({ filename })
        });
        const data = await resp.json();
        if (!resp.ok || data.ok === false) throw new Error(data.error || "Delete failed");
        setTimeout(() => location.reload(), 1200);
      } catch (err) {
        showAlert(err.message, "danger");
      }
    });
  }

  // ============================================================
  // Bug fix: these must live inside DOMContentLoaded to access
  // fileList and deleteDocBtn (const-scoped to this callback)
  // ============================================================
  function hasUploadedDocs() {
    if (!fileList) return false;
    return fileList.querySelectorAll(".doc-item .doc-select").length > 0;
  }

  function syncDeleteButtonVisibility() {
    if (!deleteDocBtn) return;
    deleteDocBtn.style.display = hasUploadedDocs() ? "block" : "none";
  }

});
