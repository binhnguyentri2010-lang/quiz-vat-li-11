/* ==========================================================================
   BIOSPHERE — CORE DATA, GRADING, STORAGE & BOTANICAL ANATOMY PLATES
   ========================================================================== */
(function () {
  "use strict";

  var STORAGE_PREFIX = "physics_state_v1_";
  var WN_PREFIX = "PHYSICS_WN_V1:";
  var memoryFallback = {};
  var storageWarnShown = false;

  var IMAGE_DIMS = {
    "media/image1.png": { width: 326, height: 287 },
    "media/image2.png": { width: 396, height: 200 },
    "media/image3.png": { width: 999, height: 215 }
  };

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getData() {
    var d = window.BIOSPHERE_DATA;
    if (!d || !Array.isArray(d.lessons)) {
      return { doc_title: "", school_year: "", lessons: [], images_b64: {} };
    }
    return d;
  }

  function getLesson(lessonId) {
    var lessons = getData().lessons;
    for (var i = 0; i < lessons.length; i++) {
      if (lessons[i].id === lessonId) return lessons[i];
    }
    return null;
  }

  /* --------------------------------------------------------------------------
     3-Tier Resilient Storage (localStorage -> sessionStorage -> window.name)
     Survives MPA navigation even when Safari Private / Zalo WebView blocks storage
     -------------------------------------------------------------------------- */
  function readWindowNameMap() {
    try {
      var raw = window.name || "";
      if (raw.indexOf(WN_PREFIX) === 0) {
        var parsed = JSON.parse(raw.slice(WN_PREFIX.length));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (_e) {}
    return {};
  }

  function writeWindowNameMap(mapObj) {
    try {
      window.name = WN_PREFIX + JSON.stringify(mapObj || {});
    } catch (_e) {}
  }

  function createDefaultState(lessonId, firstUid) {
    return {
      version: 1,
      lessonId: lessonId,
      mode: "instant", // "instant" (Phản hồi tức thì) | "exam" (Thi trọn bài)
      currentUid: firstUid || "",
      answers: {},
      checked: {},
      flagged: {},
      submitted: false,
      view: "stage", // "stage" | "results"
      reviewFilter: "all", // "all" | "wrong" | "right"
      drill: null,
      updatedAt: Date.now()
    };
  }

  function sanitizeAnswersMap(rawAnswers, validUids) {
    var clean = {};
    if (!rawAnswers || typeof rawAnswers !== "object" || Array.isArray(rawAnswers)) {
      return clean;
    }
    Object.keys(rawAnswers).forEach(function (uid) {
      var q = validUids[uid];
      if (!q) return;
      var val = rawAnswers[uid];
      if (q.part === "mcq") {
        if (val === "A" || val === "B" || val === "C" || val === "D") {
          clean[uid] = val;
        }
      } else if (q.part === "tf") {
        if (val && typeof val === "object" && !Array.isArray(val)) {
          var cleanTf = {};
          ["a", "b", "c", "d"].forEach(function (k) {
            if (typeof val[k] === "boolean") cleanTf[k] = val[k];
          });
          if (Object.keys(cleanTf).length > 0) clean[uid] = cleanTf;
        }
      } else if (q.part === "short") {
        if (typeof val === "string" || typeof val === "number") {
          var s = String(val).slice(0, 80);
          if (s.length > 0) clean[uid] = s;
        }
      }
    });
    return clean;
  }

  function sanitizeBoolMap(rawMap, validUids) {
    var clean = {};
    if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) {
      return clean;
    }
    Object.keys(rawMap).forEach(function (uid) {
      if (validUids[uid] && rawMap[uid] === true) clean[uid] = true;
    });
    return clean;
  }

  function sanitizeState(raw, lesson) {
    var firstUid = lesson && lesson.questions && lesson.questions[0] ? lesson.questions[0].uid : "";
    var base = createDefaultState(lesson ? lesson.id : "", firstUid);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;

    var validUids = {};
    if (lesson && Array.isArray(lesson.questions)) {
      for (var i = 0; i < lesson.questions.length; i++) {
        validUids[lesson.questions[i].uid] = lesson.questions[i];
      }
    }

    base.mode = raw.mode === "exam" ? "exam" : "instant";
    base.currentUid = typeof raw.currentUid === "string" && validUids[raw.currentUid] ? raw.currentUid : firstUid;
    base.submitted = Boolean(raw.submitted);
    base.view = raw.view === "results" && base.submitted ? "results" : "stage";
    base.reviewFilter = raw.reviewFilter === "wrong" || raw.reviewFilter === "right" ? raw.reviewFilter : "all";

    base.answers = sanitizeAnswersMap(raw.answers, validUids);
    base.checked = sanitizeBoolMap(raw.checked, validUids);
    base.flagged = sanitizeBoolMap(raw.flagged, validUids);

    if (raw.drill && typeof raw.drill === "object" && !Array.isArray(raw.drill) && Array.isArray(raw.drill.queue)) {
      var cleanQueue = raw.drill.queue.filter(function (uid) {
        return typeof uid === "string" && Boolean(validUids[uid]);
      });
      if (cleanQueue.length > 0) {
        var idx = Number(raw.drill.idx);
        if (!Number.isFinite(idx) || idx < 0 || idx >= cleanQueue.length) idx = 0;
        else idx = Math.floor(idx);
        base.drill = {
          round: Math.max(1, parseInt(raw.drill.round, 10) || 1),
          queue: cleanQueue,
          idx: idx,
          answers: sanitizeAnswersMap(raw.drill.answers, validUids),
          checked: sanitizeBoolMap(raw.drill.checked, validUids),
          masteredTotal: Math.max(0, parseInt(raw.drill.masteredTotal, 10) || 0),
          initialTotal: Math.max(cleanQueue.length, parseInt(raw.drill.initialTotal, 10) || cleanQueue.length)
        };
      }
    }

    return base;
  }

  function loadLessonState(lesson) {
    if (!lesson) return createDefaultState("", "");
    var key = STORAGE_PREFIX + lesson.id;

    try {
      var rawLocal = window.localStorage.getItem(key);
      if (rawLocal) return sanitizeState(JSON.parse(rawLocal), lesson);
    } catch (_e1) {}

    try {
      var rawSession = window.sessionStorage.getItem(key);
      if (rawSession) return sanitizeState(JSON.parse(rawSession), lesson);
    } catch (_e2) {}

    var wnMap = readWindowNameMap();
    if (wnMap[key]) {
      return sanitizeState(wnMap[key], lesson);
    }

    if (memoryFallback[key]) {
      return sanitizeState(memoryFallback[key], lesson);
    }

    return createDefaultState(lesson.id, lesson.questions[0] ? lesson.questions[0].uid : "");
  }

  function saveLessonState(lessonId, state) {
    if (!lessonId || !state) return;
    var key = STORAGE_PREFIX + lessonId;
    state.updatedAt = Date.now();
    memoryFallback[key] = state;
    var serialized = JSON.stringify(state);

    var savedLocal = false;
    try {
      window.localStorage.setItem(key, serialized);
      savedLocal = true;
    } catch (_errLocal) {
      savedLocal = false;
    }

    if (!savedLocal) {
      try {
        window.sessionStorage.setItem(key, serialized);
      } catch (_errSession) {}
      var wnMap = readWindowNameMap();
      wnMap[key] = state;
      writeWindowNameMap(wnMap);

      if (!storageWarnShown && typeof document !== "undefined" && document.body) {
        storageWarnShown = true;
        showToast("Trình duyệt đang tắt lưu trữ cố định — tiến độ vẫn được giữ trong phiên mở tab này.");
      }
    }
  }

  function clearLessonState(lesson) {
    if (!lesson) return createDefaultState("", "");
    var key = STORAGE_PREFIX + lesson.id;
    delete memoryFallback[key];
    try {
      window.localStorage.removeItem(key);
    } catch (_e1) {}
    try {
      window.sessionStorage.removeItem(key);
    } catch (_e2) {}
    var wnMap = readWindowNameMap();
    if (wnMap[key]) {
      delete wnMap[key];
      writeWindowNameMap(wnMap);
    }
    return createDefaultState(lesson.id, lesson.questions[0] ? lesson.questions[0].uid : "");
  }

  /* --------------------------------------------------------------------------
     Exact Question Completion, Short-Answer Normalization & Evaluation Logic
     -------------------------------------------------------------------------- */
  function normalizeShortAnswer(raw, expectedStr) {
    var rawStr = raw == null ? "" : String(raw);
    var trimmed = rawStr.trim();
    var exp = String(expectedStr == null ? "" : expectedStr).trim();

    if (!trimmed) {
      return {
        answered: false,
        rawTrimmed: "",
        normalized: "",
        hasInvalidChars: false
      };
    }

    // Flag letters or HTML symbols (e.g. "4 câu", "<img...>") without mutating input value
    var hasInvalidChars = /[^\d\s.,;:\-+]/.test(trimmed);
    if (hasInvalidChars) {
      return {
        answered: true,
        rawTrimmed: trimmed,
        normalized: trimmed,
        hasInvalidChars: true
      };
    }

    // Strip accidental outer punctuation (such as iOS double-space trailing dot "3.")
    var cleaned = trimmed.replace(/^[.,;:\s]+|[.,;:\s]+$/g, "");
    if (!cleaned) {
      return {
        answered: true,
        rawTrimmed: trimmed,
        normalized: trimmed,
        hasInvalidChars: true
      };
    }

    if (/^-/.test(cleaned)) {
      return {
        answered: true,
        rawTrimmed: trimmed,
        normalized: cleaned,
        hasInvalidChars: false
      };
    }

    if (exp.length > 1) {
      // Multi-digit ordered statement list (e.g. "124", "134"): tolerate spaces/commas/semicolons/hyphens
      if (/^\d+(?:[\s,;-]+\d+)+$/.test(cleaned)) {
        cleaned = cleaned.replace(/[\s,;-]+/g, "");
      } else if (/^\+?\d+$/.test(cleaned)) {
        cleaned = cleaned.replace(/^\+/, "");
      }
      return {
        answered: true,
        rawTrimmed: trimmed,
        normalized: cleaned,
        hasInvalidChars: false
      };
    }

    // Single-digit count ("1".."9"): tolerate optional '+' and leading zero ("06" -> "6"), keep "3.5" intact as wrong
    if (/^\+?\d+$/.test(cleaned)) {
      var noPlus = cleaned.replace(/^\+/, "");
      var noLeadZero = noPlus.replace(/^0+(?=\d)/, "");
      return {
        answered: true,
        rawTrimmed: trimmed,
        normalized: noLeadZero,
        hasInvalidChars: false
      };
    }

    return {
      answered: true,
      rawTrimmed: trimmed,
      normalized: cleaned,
      hasInvalidChars: false
    };
  }

  function countTfPicked(q, ans) {
    if (!q || q.part !== "tf" || !ans || typeof ans !== "object") return 0;
    var stmts = q.statements || [];
    var count = 0;
    for (var i = 0; i < stmts.length; i++) {
      if (typeof ans[stmts[i].key] === "boolean") count++;
    }
    return count;
  }

  function isQuestionAnswered(q, ans) {
    if (!q || ans == null) return false;
    if (q.part === "mcq") {
      return ans === "A" || ans === "B" || ans === "C" || ans === "D";
    }
    if (q.part === "tf") {
      var stmts = q.statements || [];
      return stmts.length > 0 && countTfPicked(q, ans) === stmts.length;
    }
    if (q.part === "short") {
      return String(ans).trim().length > 0;
    }
    return false;
  }

  function hasPartialAnswer(q, ans) {
    if (!q || ans == null) return false;
    if (q.part === "tf") {
      var picked = countTfPicked(q, ans);
      var total = (q.statements || []).length;
      return picked > 0 && picked < total;
    }
    return false;
  }

  function evaluateQuestion(q, ans) {
    var answered = isQuestionAnswered(q, ans);
    if (q.part === "mcq") {
      var isRight = answered && ans === q.answer;
      return {
        answered: answered,
        partial: false,
        isCorrect: isRight,
        userAnswer: answered ? ans : null,
        expectedAnswer: q.answer
      };
    }
    if (q.part === "tf") {
      var stmts = q.statements || [];
      var subCorrect = 0;
      var pickedCount = 0;
      var details = [];
      var obj = ans && typeof ans === "object" ? ans : {};
      for (var i = 0; i < stmts.length; i++) {
        var s = stmts[i];
        var picked = typeof obj[s.key] === "boolean" ? obj[s.key] : null;
        if (picked !== null) pickedCount++;
        var expected = Boolean(s.is_true);
        var match = picked !== null && picked === expected;
        if (match) subCorrect++;
        details.push({
          key: s.key,
          marker: s.marker_verbatim,
          picked: picked,
          expected: expected,
          match: match
        });
      }
      return {
        answered: answered,
        partial: pickedCount > 0 && pickedCount < stmts.length,
        pickedCount: pickedCount,
        isCorrect: answered && subCorrect === stmts.length,
        subCorrect: subCorrect,
        subTotal: stmts.length,
        details: details
      };
    }
    if (q.part === "short") {
      var expectedStr = String(q.answer).trim();
      var norm = normalizeShortAnswer(ans, expectedStr);
      return {
        answered: norm.answered,
        partial: false,
        hasInvalidChars: norm.hasInvalidChars,
        isCorrect: norm.answered && !norm.hasInvalidChars && norm.normalized === expectedStr,
        userAnswer: norm.rawTrimmed,
        normalizedAnswer: norm.normalized,
        expectedAnswer: expectedStr
      };
    }
    return { answered: false, partial: false, isCorrect: false };
  }

  function computeLessonMetrics(lesson, state) {
    var questions = (lesson && lesson.questions) || [];
    var answers = (state && state.answers) || {};
    var checked = (state && state.checked) || {};
    var submitted = Boolean(state && state.submitted);

    var total = questions.length;
    var answeredCount = 0;
    var partialCount = 0;
    var gradedCount = 0;
    var correctTotal = 0;

    var mcqTotal = 0;
    var mcqCorrect = 0;
    var mcqAnswered = 0;

    var tfTotal = 0;
    var tfFullCorrect = 0;
    var tfSubTotal = 0;
    var tfSubCorrect = 0;
    var tfAnswered = 0;
    var tfPartial = 0;

    var shortTotal = 0;
    var shortCorrect = 0;
    var shortAnswered = 0;

    var wrongUids = [];
    var rightUids = [];

    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      var ans = answers[q.uid];
      var ev = evaluateQuestion(q, ans);
      var isGraded = submitted || Boolean(checked[q.uid]);

      if (ev.answered) answeredCount++;
      else if (ev.partial) partialCount++;
      if (isGraded) gradedCount++;

      if (q.part === "mcq") {
        mcqTotal++;
        if (ev.answered) mcqAnswered++;
        if (ev.isCorrect) mcqCorrect++;
      } else if (q.part === "tf") {
        tfTotal++;
        tfSubTotal += ev.subTotal;
        if (ev.answered) tfAnswered++;
        else if (ev.partial) tfPartial++;
        tfSubCorrect += ev.subCorrect;
        if (ev.isCorrect) tfFullCorrect++;
      } else if (q.part === "short") {
        shortTotal++;
        if (ev.answered) shortAnswered++;
        if (ev.isCorrect) shortCorrect++;
      }

      if (ev.isCorrect) {
        correctTotal++;
        rightUids.push(q.uid);
      } else {
        wrongUids.push(q.uid);
      }
    }

    var subTotalAll = mcqTotal + tfSubTotal + shortTotal;
    var subCorrectTotal = mcqCorrect + tfSubCorrect + shortCorrect;

    var checkedWrongUids = questions
      .filter(function (q) {
        var isGraded = submitted || Boolean(checked[q.uid]);
        if (!isGraded) return false;
        return !evaluateQuestion(q, answers[q.uid]).isCorrect;
      })
      .map(function (q) {
        return q.uid;
      });

    return {
      total: total,
      answeredCount: answeredCount,
      partialCount: partialCount,
      touchedCount: answeredCount + partialCount,
      gradedCount: gradedCount,
      correctTotal: correctTotal,
      subTotalAll: subTotalAll,
      subCorrectTotal: subCorrectTotal,
      mcqTotal: mcqTotal,
      mcqCorrect: mcqCorrect,
      mcqAnswered: mcqAnswered,
      tfTotal: tfTotal,
      tfFullCorrect: tfFullCorrect,
      tfSubTotal: tfSubTotal,
      tfSubCorrect: tfSubCorrect,
      tfAnswered: tfAnswered,
      tfPartial: tfPartial,
      shortTotal: shortTotal,
      shortCorrect: shortCorrect,
      shortAnswered: shortAnswered,
      wrongUids: wrongUids,
      rightUids: rightUids,
      checkedWrongUids: checkedWrongUids
    };
  }

  /* --------------------------------------------------------------------------
     Verbatim Stem Block Renderer (Zero-CLS Intrinsic Image Dimensions)
     -------------------------------------------------------------------------- */
  function renderStemBlocksHtml(q, imagesB64) {
    var blocks = (q && q.stem_blocks) || [];
    var b64Map = imagesB64 || {};
    var out = [];

    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (!b) continue;
      if (b.type === "html") {
        out.push('<p class="stem-p">' + b.html + "</p>");
      } else if (b.type === "table" && Array.isArray(b.rows) && b.rows.length > 0) {
        var tHtml = '<div class="specimen-table-wrap"><table class="specimen-table">';
        tHtml += "<thead><tr>";
        var headRow = b.rows[0] || [];
        for (var c = 0; c < headRow.length; c++) {
          tHtml += '<th scope="col">' + (headRow[c].html || "") + "</th>";
        }
        tHtml += "</tr></thead>";
        if (b.rows.length > 1) {
          tHtml += "<tbody>";
          for (var r = 1; r < b.rows.length; r++) {
            tHtml += "<tr>";
            var row = b.rows[r] || [];
            for (var k = 0; k < row.length; k++) {
              tHtml += "<td>" + (row[k].html || "") + "</td>";
            }
            tHtml += "</tr>";
          }
          tHtml += "</tbody>";
        }
        tHtml += "</table></div>";
        out.push(tHtml);
      } else if (b.type === "image" && b.src) {
        var resolvedSrc = b64Map[b.src] || b.src;
        var dims = IMAGE_DIMS[b.src] || { width: 480, height: 240 };
        var altLabel = escapeHtml((q.label_verbatim || "Sơ đồ") + " - Sơ đồ sinh học");
        out.push(
          '<figure class="specimen-figure">' +
            '<button type="button" class="btn-zoom-image" data-zoom-src="' +
            escapeHtml(resolvedSrc) +
            '" data-zoom-label="' +
            escapeHtml(q.label_verbatim || "Sơ đồ minh họa") +
            '" data-natural-w="' +
            dims.width +
            '" data-natural-h="' +
            dims.height +
            '" aria-label="Phóng to sơ đồ minh họa">' +
            '<img src="' +
            escapeHtml(resolvedSrc) +
            '" width="' +
            dims.width +
            '" height="' +
            dims.height +
            '" alt="' +
            altLabel +
            '" loading="eager" />' +
            '<span class="zoom-caption">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>' +
            "<span>Chạm để soi phóng đại sơ đồ</span>" +
            "</span>" +
            "</button>" +
            "</figure>"
        );
      }
    }
    return out.join("");
  }

  /* --------------------------------------------------------------------------
     Toast & WebView-Safe Share / Synchronous Copy Fallback
     -------------------------------------------------------------------------- */
  var toastTimer = null;
  function showToast(msg) {
    var el = document.getElementById("biosphere-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "biosphere-toast";
      el.className = "biosphere-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.hidden = true;
    }, 3200);
  }

  function legacyCopySync(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      ta.style.left = "-9999px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return Boolean(ok);
    } catch (_e) {
      return false;
    }
  }

  function showManualCopyModal(urlText) {
    var existing = document.getElementById("biosphere-copy-modal");
    if (existing) existing.remove();

    var wrap = document.createElement("div");
    wrap.id = "biosphere-copy-modal";
    wrap.className = "modal-backdrop";
    wrap.innerHTML =
      '<div class="dialog-card" role="dialog" aria-modal="true" aria-label="Sao chép liên kết chia sẻ">' +
      '<h2 class="dialog-title">Sao chép liên kết</h2>' +
      '<p class="dialog-desc">Chạm giữ ô bên dưới để sao chép liên kết gửi cho bạn bè:</p>' +
      '<input type="text" id="biosphere-manual-url" class="manual-copy-input" readonly value="' +
      escapeHtml(urlText) +
      '" />' +
      '<div class="dialog-actions" style="margin-top:14px;">' +
      '<button type="button" id="btn-close-manual-copy" class="btn-dialog-confirm">Đóng</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(wrap);

    var inp = document.getElementById("biosphere-manual-url");
    if (inp) {
      inp.focus();
      inp.select();
      try {
        inp.setSelectionRange(0, urlText.length);
      } catch (_e) {}
    }
    var closeBtn = document.getElementById("btn-close-manual-copy");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        wrap.remove();
      });
    }
    wrap.addEventListener("click", function (ev) {
      if (ev.target === wrap) wrap.remove();
    });
  }

  function shareLink(opts) {
    var rel = (opts && opts.url) || window.location.href;
    var shareUrl = rel;
    try {
      shareUrl = new URL(rel, window.location.href).href;
    } catch (_e) {}

    var isHttp = /^https?:$/i.test(window.location.protocol);
    var title = (opts && opts.title) || "VẬT LÍ 11 — Ôn tập Giữa Học Kỳ I";
    var text = (opts && opts.text) || title;

    if (!isHttp) {
      // Offline file:// mode: never pass file:// to navigator.share (throws TypeError)
      var publicBase = "https://binhnguyentri2010-lang.github.io/quiz-vat-li-11/";
      var fileSlug = "";
      if (rel && rel.indexOf("de-giua-ki") !== -1) fileSlug = "de-giua-ki.html";
      else if (rel && rel.indexOf("bai-1") !== -1) fileSlug = "bai-1.html";
      else if (rel && rel.indexOf("bai-2") !== -1) fileSlug = "bai-2.html";
      else if (rel && rel.indexOf("bai-3") !== -1) fileSlug = "bai-3.html";
      else if (rel && rel.indexOf("bai-4") !== -1) fileSlug = "bai-4.html";
      else if (rel && rel.indexOf("bai-5") !== -1) fileSlug = "bai-5.html";
      else if (rel && rel.indexOf("bai-tap") !== -1) fileSlug = "bai-tap.html";
      var onlineEquivalent = publicBase + fileSlug;
      var copiedOffline = legacyCopySync(onlineEquivalent);
      if (copiedOffline) {
        showToast("Đã sao chép link web công khai để bạn gửi qua Zalo/Messenger!");
      } else {
        showManualCopyModal(onlineEquivalent);
      }
      return;
    }

    // Native share sheet on mobile Safari / Chrome when available over HTTPS
    if (window.isSecureContext && navigator.share && typeof navigator.share === "function") {
      // Also capture synchronous copy backup is NOT needed unless share fails, but mobile share sheet is primary
      navigator
        .share({ title: title, text: text, url: shareUrl })
        .then(function () {
          showToast("Đã mở bảng chia sẻ liên kết.");
        })
        .catch(function (err) {
          if (err && err.name === "AbortError") return;
          if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
            navigator.clipboard.writeText(shareUrl).then(
              function () {
                showToast("Đã sao chép liên kết vào bộ nhớ tạm!");
              },
              function () {
                showManualCopyModal(shareUrl);
              }
            );
          } else {
            showManualCopyModal(shareUrl);
          }
        });
      return;
    }

    // Synchronous copy FIRST inside user click gesture so Zalo/Messenger iOS WebView never loses transient activation
    var syncCopied = legacyCopySync(shareUrl);
    if (syncCopied) {
      showToast("Đã sao chép liên kết để bạn gửi nhanh!");
      return;
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(shareUrl).then(
        function () {
          showToast("Đã sao chép liên kết để bạn gửi nhanh!");
        },
        function () {
          showManualCopyModal(shareUrl);
        }
      );
      return;
    }

    showManualCopyModal(shareUrl);
  }

  /* --------------------------------------------------------------------------
     Bespoke Physics Specimen Wave & Harmonic Oscillator SVGs
     -------------------------------------------------------------------------- */
  function getBotanicalSvg(lessonId) {
    if (lessonId === "de-giua-ki") {
      // Đề tổng hợp: Sóng hình sin điều hòa + trục tọa độ + biên độ A và chu kì T
      return (
        '<svg viewBox="0 0 280 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Đồ thị dao động điều hòa li độ - thời gian">' +
        '<line x1="20" y1="60" x2="265" y2="60" stroke="#123C32" stroke-width="1.8"/>' +
        '<polygon points="268,60 258,55 258,65" fill="#123C32"/>' +
        '<line x1="45" y1="105" x2="45" y2="15" stroke="#123C32" stroke-width="1.8"/>' +
        '<polygon points="45,12 40,22 50,22" fill="#123C32"/>' +
        '<path d="M45 60 Q75 15, 105 60 T165 60 T225 60" stroke="#E98261" stroke-width="2.5" fill="none"/>' +
        '<line x1="45" y1="24" x2="230" y2="24" stroke="#B7D96A" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<line x1="45" y1="96" x2="230" y2="96" stroke="#B7D96A" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<circle cx="105" cy="60" r="4" fill="#123C32"/>' +
        '<circle cx="165" cy="60" r="4" fill="#123C32"/>' +
        '<text x="250" y="75" fill="#123C32" font-family="sans-serif" font-size="12" font-weight="700">t(s)</text>' +
        '<text x="25" y="24" fill="#123C32" font-family="sans-serif" font-size="12" font-weight="700">x(cm)</text>' +
        '<text x="32" y="27" fill="#E98261" font-family="sans-serif" font-size="11" font-weight="700">+A</text>' +
        '<text x="34" y="99" fill="#E98261" font-family="sans-serif" font-size="11" font-weight="700">-A</text>' +
        '<text x="160" y="78" fill="#123C32" font-family="sans-serif" font-size="11" font-weight="700">T</text>' +
        '</svg>'
      );
    }
    if (lessonId === "bai-1") {
      // Bài 1: Con lắc lò xo dao động điều hòa quanh VTCB O
      return (
        '<svg viewBox="0 0 280 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mô hình con lắc lò xo dao động điều hòa">' +
        '<rect x="20" y="25" width="12" height="70" fill="#123C32"/>' +
        '<line x1="20" y1="25" x2="20" y2="95" stroke="#123C32" stroke-width="3"/>' +
        '<line x1="32" y1="60" x2="50" y2="60" stroke="#123C32" stroke-width="2"/>' +
        '<path d="M50 60 L60 45 L70 75 L80 45 L90 75 L100 45 L110 75 L120 45 L130 75 L140 60" stroke="#123C32" stroke-width="2.2" fill="none"/>' +
        '<rect x="140" y="42" width="38" height="36" rx="4" fill="#B7D96A" stroke="#123C32" stroke-width="1.8"/>' +
        '<text x="159" y="65" text-anchor="middle" fill="#123C32" font-family="Georgia, serif" font-size="14" font-weight="800">m</text>' +
        '<line x1="30" y1="80" x2="260" y2="80" stroke="#D5CFC0" stroke-width="1.5"/>' +
        '<line x1="159" y1="80" x2="159" y2="105" stroke="#123C32" stroke-width="1.5" stroke-dasharray="2 2"/>' +
        '<line x1="100" y1="80" x2="100" y2="105" stroke="#E98261" stroke-width="1.5" stroke-dasharray="2 2"/>' +
        '<line x1="218" y1="80" x2="218" y2="105" stroke="#E98261" stroke-width="1.5" stroke-dasharray="2 2"/>' +
        '<text x="159" y="117" text-anchor="middle" fill="#123C32" font-family="sans-serif" font-size="11" font-weight="700">O (VTCB)</text>' +
        '<text x="100" y="117" text-anchor="middle" fill="#E98261" font-family="sans-serif" font-size="11" font-weight="700">-A</text>' +
        '<text x="218" y="117" text-anchor="middle" fill="#E98261" font-family="sans-serif" font-size="11" font-weight="700">+A</text>' +
        '</svg>'
      );
    }
    if (lessonId === "bai-2") {
      // Bài 2: Vòng tròn lượng giác & liên hệ chuyển động tròn đều với DĐĐH
      return (
        '<svg viewBox="0 0 280 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mối liên hệ giữa chuyển động tròn đều và dao động điều hòa">' +
        '<circle cx="80" cy="60" r="45" stroke="#123C32" stroke-width="1.8" fill="#FBF9F3"/>' +
        '<line x1="25" y1="60" x2="135" y2="60" stroke="#123C32" stroke-width="1"/>' +
        '<line x1="80" y1="10" x2="80" y2="110" stroke="#123C32" stroke-width="1"/>' +
        '<circle cx="80" cy="60" r="3" fill="#123C32"/>' +
        '<line x1="80" y1="60" x2="112" y2="28" stroke="#E98261" stroke-width="2"/>' +
        '<circle cx="112" cy="28" r="5" fill="#E98261"/>' +
        '<line x1="112" y1="28" x2="112" y2="60" stroke="#B7D96A" stroke-width="1.5" stroke-dasharray="3 2"/>' +
        '<circle cx="112" cy="60" r="4" fill="#B7D96A" stroke="#123C32" stroke-width="1"/>' +
        '<line x1="150" y1="60" x2="265" y2="60" stroke="#123C32" stroke-width="1.8"/>' +
        '<polygon points="268,60 260,56 260,64" fill="#123C32"/>' +
        '<path d="M150 60 Q175 25, 200 60 T250 60" stroke="#123C32" stroke-width="2" fill="none"/>' +
        '<text x="215" y="105" fill="#123C32" font-family="Georgia, serif" font-size="12" font-weight="700">x = A cos(ωt+φ)</text>' +
        '</svg>'
      );
    }
    if (lessonId === "bai-3") {
      // Bài 3: Pha vuông của v (sớm pha π/2) và gia tốc a (ngược pha π)
      return (
        '<svg viewBox="0 0 280 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Đồ thị li độ, vận tốc và gia tốc">' +
        '<line x1="20" y1="60" x2="265" y2="60" stroke="#123C32" stroke-width="1.5"/>' +
        '<path d="M30 60 Q60 20, 90 60 T150 60 T210 60" stroke="#123C32" stroke-width="2" fill="none"/>' +
        '<path d="M30 20 Q60 60, 90 100 T150 20 T210 100" stroke="#E98261" stroke-width="2" fill="none" stroke-dasharray="4 2"/>' +
        '<rect x="180" y="15" width="85" height="42" rx="4" fill="#FBF9F3" stroke="#B5AE9B"/>' +
        '<text x="188" y="30" fill="#123C32" font-family="sans-serif" font-size="10" font-weight="700">— Li độ x</text>' +
        '<text x="188" y="47" fill="#E98261" font-family="sans-serif" font-size="10" font-weight="700">-- Vận tốc v (+π/2)</text>' +
        '<text x="35" y="112" fill="#123C32" font-family="sans-serif" font-size="11" font-weight="700">a = -ω²x (ngược pha)</text>' +
        '</svg>'
      );
    }
    if (lessonId === "bai-4") {
      // Bài 4: Chuyển hóa động năng và thế năng trong dao động điều hòa W = Wđ + Wt
      return (
        '<svg viewBox="0 0 280 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Đồ thị năng lượng: động năng, thế năng và cơ năng toàn phần">' +
        '<line x1="30" y1="100" x2="250" y2="100" stroke="#123C32" stroke-width="1.8"/>' +
        '<line x1="140" y1="105" x2="140" y2="15" stroke="#123C32" stroke-width="1.8"/>' +
        '<path d="M60 25 Q140 100, 220 25" stroke="#123C32" stroke-width="2.2" fill="none"/>' +
        '<path d="M60 100 Q140 25, 220 100" stroke="#E98261" stroke-width="2.2" fill="none"/>' +
        '<line x1="50" y1="25" x2="230" y2="25" stroke="#B7D96A" stroke-width="2.5"/>' +
        '<text x="234" y="29" fill="#123C32" font-family="sans-serif" font-size="11" font-weight="800">W (Cơ năng)</text>' +
        '<text x="80" y="45" fill="#123C32" font-family="sans-serif" font-size="10" font-weight="700">Wt (Thế năng)</text>' +
        '<text x="155" y="45" fill="#E98261" font-family="sans-serif" font-size="10" font-weight="700">Wđ (Động năng)</text>' +
        '<text x="140" y="115" text-anchor="middle" fill="#123C32" font-family="sans-serif" font-size="11" font-weight="700">x=0 (VTCB)</text>' +
        '</svg>'
      );
    }
    if (lessonId === "bai-5") {
      // Bài 5: Dao động tắt dần & đường cong cộng hưởng biên độ A theo tần số cưỡng bức f
      return (
        '<svg viewBox="0 0 280 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Đường cong cộng hưởng biên độ cực đại tại f0">' +
        '<line x1="30" y1="105" x2="260" y2="105" stroke="#123C32" stroke-width="1.8"/>' +
        '<line x1="45" y1="110" x2="45" y2="15" stroke="#123C32" stroke-width="1.8"/>' +
        '<path d="M50 100 Q120 95, 140 25 Q160 95, 240 102" stroke="#E98261" stroke-width="2.5" fill="none"/>' +
        '<line x1="140" y1="25" x2="140" y2="105" stroke="#B7D96A" stroke-width="1.5" stroke-dasharray="3 2"/>' +
        '<circle cx="140" cy="25" r="5" fill="#E98261"/>' +
        '<text x="140" y="18" text-anchor="middle" fill="#E98261" font-family="sans-serif" font-size="11" font-weight="800">A max (Cộng hưởng)</text>' +
        '<text x="140" y="118" text-anchor="middle" fill="#123C32" font-family="sans-serif" font-size="11" font-weight="700">f = f₀</text>' +
        '<text x="250" y="118" fill="#123C32" font-family="sans-serif" font-size="11" font-weight="700">f</text>' +
        '</svg>'
      );
    }
    // bai-tap: Máy tính Casio fx-880BTG & Vector Fresnel tổng hợp dao động
    return (
      '<svg viewBox="0 0 280 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Minh họa máy tính Casio fx-880BTG và vector quay tổng hợp dao động">' +
      '<rect x="25" y="15" width="80" height="90" rx="8" fill="#123C32" stroke="#0C2922" stroke-width="2"/>' +
      '<rect x="35" y="25" width="60" height="24" rx="4" fill="#B7D96A"/>' +
      '<text x="65" y="41" text-anchor="middle" fill="#123C32" font-family="monospace" font-size="11" font-weight="800">fx-880BTG</text>' +
      '<circle cx="45" cy="60" r="4" fill="#F5F1E6"/>' +
      '<circle cx="65" cy="60" r="4" fill="#F5F1E6"/>' +
      '<circle cx="85" cy="60" r="4" fill="#F5F1E6"/>' +
      '<circle cx="45" cy="74" r="4" fill="#F5F1E6"/>' +
      '<circle cx="65" cy="74" r="4" fill="#F5F1E6"/>' +
      '<circle cx="85" cy="74" r="4" fill="#F5F1E6"/>' +
      '<circle cx="45" cy="88" r="4" fill="#F5F1E6"/>' +
      '<circle cx="65" cy="88" r="4" fill="#F5F1E6"/>' +
      '<circle cx="85" cy="88" r="4" fill="#F5F1E6"/>' +
      '<line x1="140" y1="85" x2="250" y2="85" stroke="#123C32" stroke-width="1.5"/>' +
      '<line x1="150" y1="85" x2="200" y2="35" stroke="#E98261" stroke-width="2.5"/>' +
      '<polygon points="204,32 196,33 200,41" fill="#E98261"/>' +
      '<line x1="150" y1="85" x2="230" y2="60" stroke="#123C32" stroke-width="2"/>' +
      '<text x="208" y="32" fill="#E98261" font-family="Georgia, serif" font-size="12" font-weight="800">A₁, φ₁</text>' +
      '<text x="235" y="65" fill="#123C32" font-family="Georgia, serif" font-size="12" font-weight="800">A₂, φ₂</text>' +
      '</svg>'
    );
  }

  window.BIOSPHERE_CORE = window.PHYSICS_CORE = {
    escapeHtml: escapeHtml,
    getData: getData,
    getLesson: getLesson,
    loadLessonState: loadLessonState,
    saveLessonState: saveLessonState,
    clearLessonState: clearLessonState,
    normalizeShortAnswer: normalizeShortAnswer,
    countTfPicked: countTfPicked,
    isQuestionAnswered: isQuestionAnswered,
    hasPartialAnswer: hasPartialAnswer,
    evaluateQuestion: evaluateQuestion,
    computeLessonMetrics: computeLessonMetrics,
    renderStemBlocksHtml: renderStemBlocksHtml,
    shareLink: shareLink,
    showToast: showToast,
    getBotanicalSvg: getBotanicalSvg
  };
})();
