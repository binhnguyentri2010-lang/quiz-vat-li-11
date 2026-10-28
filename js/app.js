/**
 * App.js - Ứng dụng Web Quiz Vật lí 11 THPT Trần Hưng Đạo
 * Gồm Trang Chủ (Home) và 3 chuyên mục làm bài:
 * 1. Đề Ôn Tập Giữa Kì I (Từ PDF 10 trang - Mục riêng biệt)
 * 2. Chuyên Đề Lý Thuyết (ĐÃ CHIA NHỎ THEO TỪNG BÀI ĐỘC LẬP: Bài 1 -> Bài 5)
 * 3. Chuyên Đề Bài Tập & Casio fx-880BTG (Lọc từ đề cương 30 trang)
 * Sư phạm tương tác: Người học tự chọn đáp án trước, sau đó mới hiện kết quả và mở lời giải.
 */

document.addEventListener("DOMContentLoaded", () => {
  const App = {
    currentTab: "home", // Mặc định mở Trang Chủ
    currentFilterLesson: "all",
    currentMode: "practice", // 'practice' | 'exam'
    timerSeconds: 45 * 60,
    timerInterval: null,
    revealedSolutions: {}, // Theo dõi các câu tự luận đã click xem lời giải

    // Danh bạ 5 bài học lý thuyết riêng biệt
    theoryLessons: [
      { id: "bai_1", num: 1, title: "Bài 1: Dao động điều hòa", shortTitle: "Bài 1: Dao động điều hòa", count: 19 },
      { id: "bai_2", num: 2, title: "Bài 2: Mô tả dao động điều hòa", shortTitle: "Bài 2: Mô tả DĐĐH", count: 9 },
      { id: "bai_3", num: 3, title: "Bài 3: Vận tốc, gia tốc trong DĐĐH", shortTitle: "Bài 3: Vận tốc & Gia tốc", count: 17 },
      { id: "bai_4", num: 4, title: "Bài 4: Năng lượng trong DĐĐH", shortTitle: "Bài 4: Năng lượng DĐĐH", count: 34 },
      { id: "bai_5", num: 5, title: "Bài 5: Dao động tắt dần, dao động cưỡng bức, hiện tượng cộng hưởng", shortTitle: "Bài 5: Tắt dần - Cưỡng bức", count: 36 }
    ],
    currentTheoryLesson: "bai_1", // Mặc định Bài 1 khi vào Lý thuyết

    init() {
      this.initTheme();
      this.setupNavigation();
      this.setupControls();
      this.switchTab("home");
    },

    // Quản lý Dark/Light Theme
    initTheme() {
      const savedTheme = localStorage.getItem("quiz_theme") || 
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", savedTheme);

      const themeToggle = document.getElementById("btn-theme-toggle");
      if (themeToggle) {
        themeToggle.addEventListener("click", () => {
          const current = document.documentElement.getAttribute("data-theme");
          const next = current === "dark" ? "light" : "dark";
          document.documentElement.setAttribute("data-theme", next);
          try { localStorage.setItem("quiz_theme", next); } catch (e) {}
        });
      }
    },

    // Điều hướng giữa Trang chủ và 3 mục làm bài
    setupNavigation() {
      const navTabs = document.querySelectorAll(".nav-tab");
      navTabs.forEach(tab => {
        tab.addEventListener("click", () => {
          const targetTab = tab.getAttribute("data-tab");
          this.switchTab(targetTab);
        });
      });
    },

    // Lối tắt từ Trang chủ vào thẳng 1 bài lý thuyết cụ thể
    openTheoryLesson(lessonId) {
      this.currentTheoryLesson = lessonId;
      this.switchTab("theory");
    },

    // Chuyển bài học lý thuyết trực tiếp
    switchTheoryLesson(lessonId) {
      this.currentTheoryLesson = lessonId;
      this.updateTheoryPills();
      this.loadTabData("theory");
      window.scrollTo({ top: 100, behavior: "smooth" });
    },

    updateTheoryPills() {
      const pills = document.querySelectorAll(".lesson-pill-btn");
      pills.forEach(pill => {
        const lid = pill.getAttribute("data-lesson");
        pill.classList.toggle("active", lid === this.currentTheoryLesson);
      });
    },

    switchTab(tabKey) {
      this.currentTab = tabKey;
      QuizEngine.state.activeTab = tabKey;
      this.currentFilterLesson = "all";

      // Đồng bộ trạng thái trực quan và hỗ trợ truy cập (WAI-ARIA)
      const navTabs = document.querySelectorAll(".nav-tab");
      navTabs.forEach(tab => {
        const isSelected = tab.getAttribute("data-tab") === tabKey;
        tab.classList.toggle("active", isSelected);
        tab.setAttribute("aria-selected", isSelected ? "true" : "false");
        tab.setAttribute("tabindex", isSelected ? "0" : "-1");
      });

      const homeView = document.getElementById("home-view");
      const quizView = document.getElementById("quiz-view");
      const theorySelector = document.getElementById("theory-lesson-selector");
      const filterElem = document.getElementById("lesson-filter-container");

      if (tabKey === "home") {
        if (homeView) homeView.hidden = false;
        if (quizView) quizView.hidden = true;
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Khi vào 1 trong 3 mục làm bài
      if (homeView) homeView.hidden = true;
      if (quizView) quizView.hidden = false;

      // Cập nhật hiển thị thanh chọn bài học chuyên biệt cho Lý thuyết
      if (tabKey === "theory") {
        if (theorySelector) theorySelector.hidden = false;
        if (filterElem) filterElem.hidden = true;
        this.updateTheoryPills();
      } else {
        if (theorySelector) theorySelector.hidden = true;
        if (filterElem) filterElem.hidden = (tabKey === "pdf_midterm");
      }

      this.loadTabData(tabKey);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    setupControls() {
      // Nút đổi chế độ Luyện tập / Thi thử
      const modeBtn = document.getElementById("btn-toggle-mode");
      if (modeBtn) {
        modeBtn.addEventListener("click", () => {
          this.currentMode = this.currentMode === "practice" ? "exam" : "practice";
          QuizEngine.state.mode = this.currentMode;
          modeBtn.innerHTML = this.currentMode === "practice" 
            ? `<span>📖</span> Chế độ: <strong>Luyện tập</strong>` 
            : `<span>⏱️</span> Chế độ: <strong>Thi thử (45p)</strong>`;

          const timerCard = document.getElementById("timer-container");
          if (timerCard) {
            timerCard.hidden = this.currentMode !== "exam";
          }

          if (this.currentMode === "exam") {
            this.startTimer();
          } else {
            this.stopTimer();
          }

          this.renderQuestions();
        });
      }

      // Bộ lọc bài học cho Mục Bài tập
      const lessonFilter = document.getElementById("lesson-filter");
      if (lessonFilter) {
        lessonFilter.addEventListener("change", (e) => {
          this.currentFilterLesson = e.target.value;
          this.renderQuestions();
          this.renderPalette();
        });
      }

      // Nút Nộp bài / Chấm điểm
      const submitBtn = document.getElementById("btn-submit-quiz");
      if (submitBtn) {
        submitBtn.addEventListener("click", () => {
          this.submitQuiz();
        });
      }

      // Nút Làm lại
      const resetBtn = document.getElementById("btn-reset-quiz");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          const currentStorageKey = this.currentTab === "theory" 
            ? `theory_${this.currentTheoryLesson}` 
            : this.currentTab;

          if (confirm("Bạn có chắc chắn muốn xóa bài làm của phần này và bắt đầu lại từ đầu không?")) {
            QuizEngine.resetProgress(currentStorageKey);
            this.revealedSolutions = {};
            this.renderQuestions();
            this.renderPalette();
          }
        });
      }
    },

    // Bắt đầu đếm ngược cho thi thử
    startTimer() {
      this.stopTimer();
      this.timerSeconds = 45 * 60;
      this.updateTimerDisplay();

      this.timerInterval = setInterval(() => {
        this.timerSeconds--;
        this.updateTimerDisplay();
        if (this.timerSeconds <= 0) {
          this.stopTimer();
          alert("Hết giờ làm bài! Hệ thống đang tự động nộp bài và chấm điểm.");
          this.submitQuiz();
        }
      }, 1000);
    },

    stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    },

    updateTimerDisplay() {
      const elem = document.getElementById("timer-display");
      if (!elem) return;
      const m = Math.floor(this.timerSeconds / 60);
      const s = this.timerSeconds % 60;
      elem.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },

    loadTabData(tabKey) {
      const bank = window.QUIZ_BANK || window.QUIZ_DATA;
      if (!bank) {
        console.warn("Dữ liệu QUIZ_BANK / QUIZ_DATA chưa sẵn sàng.");
        return;
      }

      const titleElem = document.getElementById("section-title");
      const descElem = document.getElementById("section-desc");

      let qList = [];
      let storageKey = tabKey;

      if (tabKey === "pdf_midterm") {
        qList = bank.pdf_midterm || [];
        if (titleElem) titleElem.innerHTML = `<span>📑</span> Đề Ôn Tập Giữa Kì I (Từ Đề Cương PDF 10 Trang)`;
        if (descElem) descElem.textContent = "Bao gồm 58 câu trắc nghiệm 4 lựa chọn và 8 câu trắc nghiệm Đúng/Sai (kèm đồ thị li độ - thời gian).";
      } else if (tabKey === "theory") {
        // TÁCH NHỎ RIÊNG TỪNG BÀI: Chỉ lấy các câu của bài đang chọn
        const allTheory = bank.theory || [];
        qList = allTheory.filter(q => q.lesson_id === this.currentTheoryLesson);
        storageKey = `theory_${this.currentTheoryLesson}`;

        const currentLInfo = this.theoryLessons.find(l => l.id === this.currentTheoryLesson) || this.theoryLessons[0];
        if (titleElem) titleElem.innerHTML = `<span>📘</span> ${currentLInfo.title} (${qList.length} câu lý thuyết)`;
        if (descElem) descElem.textContent = "Chuyên đề lý thuyết trọng tâm: rèn luyện câu hỏi nhận biết, thông hiểu, bản chất định nghĩa chuẩn SGK Kết nối tri thức.";
      } else if (tabKey === "exercise") {
        qList = bank.exercise || [];
        if (titleElem) titleElem.innerHTML = `<span>⚡</span> Ngân Hàng Bài Tập & Mẹo Bấm Casio fx-880BTG`;
        if (descElem) descElem.textContent = "Toàn bộ bài tập tính toán, đồ thị, trả lời ngắn, tự luận kèm mẹo giải nhanh máy tính Casio fx-880BTG.";
      }

      QuizEngine.state.questions = qList;

      // Khôi phục trạng thái đã lưu theo storageKey riêng của bài
      const saved = QuizEngine.loadState(storageKey);
      if (saved) {
        QuizEngine.state.userAnswers = saved.userAnswers || {};
        QuizEngine.state.flagged = saved.flagged || {};
        QuizEngine.state.isSubmitted = saved.isSubmitted || false;
      } else {
        QuizEngine.state.userAnswers = {};
        QuizEngine.state.flagged = {};
        QuizEngine.state.isSubmitted = false;
      }

      this.renderQuestions();
      this.renderPalette();
    },

    // Bật tắt xem lời giải câu tự luận
    toggleSolution(qId) {
      this.revealedSolutions[qId] = !this.revealedSolutions[qId];
      this.renderQuestions();
    },

    renderQuestions() {
      const container = document.getElementById("questions-list");
      if (!container) return;

      let list = QuizEngine.state.questions;

      // Áp dụng filter bài học nếu có trong mục Bài tập
      if (this.currentTab === "exercise" && this.currentFilterLesson !== "all") {
        list = list.filter(q => q.lesson_id === this.currentFilterLesson);
      }

      if (list.length === 0) {
        container.innerHTML = `
          <div style="text-align:center;padding:3rem;color:var(--text-secondary);background:var(--bg-surface);border-radius:var(--radius-md);">
            <div style="font-size:2.5rem;margin-bottom:0.5rem;">📂</div>
            <h3>Chưa có câu hỏi nào cho bài học này.</h3>
          </div>
        `;
        return;
      }

      let html = "";
      list.forEach((q, idx) => {
        const isFlagged = QuizEngine.state.flagged[q.id];
        const userChoice = QuizEngine.state.userAnswers[q.id];
        const isSubmitted = QuizEngine.state.isSubmitted;
        const isPractice = this.currentMode === "practice";

        let graphHtml = "";
        if (q.has_graph && window.GraphRenderer) {
          if (q.graph_type === "energy") {
            graphHtml = `<div class="graph-container">${window.GraphRenderer.renderEnergyGraph()}<div class="graph-caption">Đồ thị động năng và thế năng trong dao động điều hòa</div></div>`;
          } else {
            graphHtml = `<div class="graph-container">${window.GraphRenderer.renderOscillationGraph()}<div class="graph-caption">Hình 1: Đồ thị dao động điều hòa li độ - thời gian (x - t)</div></div>`;
          }
        }

        let bodyHtml = "";

        if (q.type === "multiple_choice") {
          let optionsList = [];
          if (Array.isArray(q.options)) {
            optionsList = q.options;
          } else if (q.options && typeof q.options === 'object') {
            optionsList = ['A', 'B', 'C', 'D'].map(k => q.options[k] || q.options[k.toLowerCase()] || '');
          }

          const hasAnswered = userChoice !== undefined && userChoice !== null && userChoice !== "";

          const optionsHtml = optionsList.map((opt, optIdx) => {
            const key = String.fromCharCode(65 + optIdx); // A, B, C, D
            const isSelected = userChoice === key;
            const isCorrect = q.answer && q.answer.toUpperCase() === key;

            let classes = "option-btn";
            if (isSelected) classes += " selected";

            // SƯ PHẠM: CHỈ HIỆN ĐÚNG/SAI KHI NGƯỜI DÙNG ĐÃ CHỌN HOẶC ĐÃ NỘP BÀI THI!
            if (isSubmitted || (isPractice && hasAnswered)) {
              if (isSelected && !isCorrect) {
                classes += " wrong";
              }
              if (isCorrect) {
                classes += " correct";
              }
            }

            return `
              <button type="button" class="${classes}" onclick="App.handleSelectOption('${q.id}', '${key}')" ${isSubmitted && !isPractice ? 'disabled' : ''}>
                <span class="option-key">${key}</span>
                <span class="option-text">${opt}</span>
              </button>
            `;
          }).join("");

          bodyHtml = `<div class="options-grid">${optionsHtml}</div>`;
        } else if (q.type === "true_false") {
          const userSub = userChoice || {};
          const totalStmts = q.statements ? q.statements.length : 0;
          let userCorrectCount = 0;
          let answeredCount = 0;

          const cardsHtml = q.statements.map((stmt) => {
            const sKey = stmt.key || stmt.id || stmt.sub_id;
            const sMarker = stmt.marker_verbatim || `${sKey})`;
            const sText = stmt.text || stmt.content || "";
            let expected = stmt.is_true;
            if (expected === undefined) expected = stmt.correct;
            if (expected === undefined) {
              if (stmt.is_correct !== undefined) expected = Boolean(stmt.is_correct);
              else if (stmt.correct_answer !== undefined) expected = (stmt.correct_answer === true || stmt.correct_answer === "Đúng" || stmt.correct_answer === "true");
              else if (stmt.marked_answer !== undefined) expected = (stmt.marked_answer === true || stmt.marked_answer === "Đúng" || stmt.marked_answer === "true");
            }
            expected = Boolean(expected);

            const picked = typeof userSub[sKey] === "boolean" ? userSub[sKey] : null;
            if (picked !== null) {
              answeredCount++;
              if (picked === expected) userCorrectCount++;
            }

            const cardCls = ["tf-card"];
            let verdictHtml = "";
            const trueBtnCls = ["tf-choice-btn"];
            const falseBtnCls = ["tf-choice-btn"];

            // Khi đã nộp bài (Exam) HOẶC khi đã trả lời ý này (Practice)
            const isGradedSub = isSubmitted || (isPractice && picked !== null);

            if (isGradedSub) {
              const isMatch = picked !== null && picked === expected;
              cardCls.push(isMatch ? "is-graded-right" : "is-graded-wrong");
              const pickedWord = picked === true ? "Đúng" : picked === false ? "Sai" : "Chưa chọn";
              const expWord = expected ? "Đúng" : "Sai";

              verdictHtml = `
                <div class="tf-verdict-note">
                  ${isMatch ? `✓ Chính xác (${expWord})` : `✗ Bạn chọn: ${pickedWord} · Đáp án chuẩn: ${expWord}`}
                </div>
              `;

              if (picked === true) {
                trueBtnCls.push(expected === true ? "is-correct-pick" : "is-wrong-pick");
              } else if (expected === true) {
                trueBtnCls.push("is-actual-answer");
              }

              if (picked === false) {
                falseBtnCls.push(expected === false ? "is-correct-pick" : "is-wrong-pick");
              } else if (expected === false) {
                falseBtnCls.push("is-actual-answer");
              }
            } else {
              if (picked === true) trueBtnCls.push("is-selected");
              if (picked === false) falseBtnCls.push("is-selected");
            }

            return `
              <div class="${cardCls.join(' ')}">
                <div class="tf-statement-row">
                  <span class="tf-marker">${sMarker}</span>
                  <div class="tf-statement-text">
                    <div>${sText}</div>
                    ${verdictHtml}
                    ${isGradedSub && stmt.explanation ? `
                      <div class="tf-stmt-explain">
                        ➜ ${stmt.explanation}
                      </div>
                    ` : ''}
                  </div>
                </div>
                <div class="tf-controls-wrap">
                  <div class="tf-dual-bar" role="group" aria-label="Mệnh đề ${sMarker}">
                    <button type="button" class="${trueBtnCls.join(' ')}" onclick="App.handleSelectTF('${q.id}', '${sKey}', true)" aria-pressed="${picked === true ? 'true' : 'false'}">
                      Đúng
                    </button>
                    <button type="button" class="${falseBtnCls.join(' ')}" onclick="App.handleSelectTF('${q.id}', '${sKey}', false)" aria-pressed="${picked === false ? 'true' : 'false'}">
                      Sai
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join("");

          // Khung tóm tắt điểm câu Đúng/Sai khi người học đã chọn đủ các ý hoặc đã nộp bài
          let tfSummaryHtml = "";
          if (isSubmitted || (isPractice && answeredCount === totalStmts && totalStmts > 0)) {
            let earnedScore = 0;
            if (totalStmts === 4) {
              if (userCorrectCount === 1) earnedScore = 0.1;
              else if (userCorrectCount === 2) earnedScore = 0.25;
              else if (userCorrectCount === 3) earnedScore = 0.5;
              else if (userCorrectCount === 4) earnedScore = 1.0;
            } else if (totalStmts > 0) {
              earnedScore = Number(((userCorrectCount / totalStmts) * 1.0).toFixed(2));
            }

            const stateClass = userCorrectCount === totalStmts ? 'all-correct' : (userCorrectCount > 0 ? 'partial-correct' : 'all-wrong');
            tfSummaryHtml = `
              <div class="tf-summary-bar ${stateClass}">
                <div class="tf-summary-title">
                  <span>📊 Kết quả câu Đúng/Sai:</span>
                  <strong>Đúng ${userCorrectCount}/${totalStmts} ý</strong>
                  <span class="tf-score-pill">+${earnedScore.toFixed(2)} điểm</span>
                </div>
                <div class="tf-summary-note">
                  (Barem Bộ GD&ĐT: Đúng 1 ý = 0.1đ | 2 ý = 0.25đ | 3 ý = 0.50đ | 4 ý = 1.00đ)
                </div>
              </div>
            `;
          }

          bodyHtml = `<div class="tf-list">${cardsHtml}</div>${tfSummaryHtml}`;
        } else if (q.type === "short_answer" || q.type === "essay") {
          const isRevealed = (this.revealedSolutions && this.revealedSolutions[q.id]) || isSubmitted;
          bodyHtml = `
            <div style="margin-bottom:0.75rem;">
              ${isRevealed ? `
                <div style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:0.35rem;">
                  <strong>Đáp số / Kết quả:</strong> <span style="color:var(--accent-primary);font-weight:700;">${q.answer || q.result || "Xem giải chi tiết bên dưới"}</span>
                </div>
              ` : `
                <div style="margin-bottom:0.5rem;">
                  <button type="button" class="btn-reveal-solution" onclick="App.toggleSolution('${q.id}')">
                    <span>👁️</span> Bấm để xem đáp số & Lời giải chi tiết
                  </button>
                </div>
              `}
            </div>
          `;
        }

        // LỜI GIẢI CHI TIẾT & MẸO CASIO:
        // CHỈ HIỆN KHI:
        // - Ở chế độ thi thử và ĐÃ nộp bài (isSubmitted)
        // - Ở chế độ luyện tập VÀ người dùng ĐÃ chọn đáp án cho câu này
        let footerHtml = "";
        const hasMCAnswered = q.type === "multiple_choice" && userChoice !== undefined && userChoice !== null && userChoice !== "";
        const totalTFStmts = q.statements ? q.statements.length : 4;
        const answeredTFCount = userChoice ? Object.keys(userChoice).length : 0;
        const hasTFAnswered = q.type === "true_false" && userChoice && answeredTFCount >= totalTFStmts;
        const hasEssayRevealed = (q.type === "short_answer" || q.type === "essay") && ((this.revealedSolutions && this.revealedSolutions[q.id]) || isSubmitted);

        const shouldShowExplain = isSubmitted || (isPractice && (hasMCAnswered || hasTFAnswered || hasEssayRevealed));

        if (shouldShowExplain && (q.explanation || q.solution)) {
          let casioHtml = "";
          if (q.casio_tip && window.CasioGuide) {
            casioHtml = window.CasioGuide.renderTipCard(q.casio_tip);
          }

          footerHtml = `
            <div class="explanation-box">
              <div class="explanation-header">
                <span>💡</span> Lời giải chi tiết:
              </div>
              <div style="line-height:1.6;">${q.explanation || q.solution}</div>
              ${casioHtml}
            </div>
          `;
        }

        html += `
          <article class="question-card ${isFlagged ? 'flagged' : ''}" id="card-${q.id}">
            <header class="card-header">
              <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                <span class="q-badge">Câu ${idx + 1}</span>
                <span class="q-type-tag">${q.type === 'multiple_choice' ? 'Trắc nghiệm 4 phương án' : (q.type === 'true_false' ? 'Đúng / Sai' : 'Tự luận / Trả lời ngắn')}</span>
                ${q.lesson_title ? `<span class="q-type-tag" style="background:var(--accent-soft);color:var(--accent-text);font-weight:600;">${q.lesson_title}</span>` : ''}
              </div>
              <button type="button" class="btn btn-outline" style="min-height:36px;padding:0.25rem 0.6rem;font-size:0.75rem;" onclick="App.handleToggleFlag('${q.id}')">
                ${isFlagged ? '🚩 Bỏ cờ' : '🏳️ Đánh dấu'}
              </button>
            </header>

            <div class="question-text">${q.question || q.context || ''}</div>
            ${graphHtml}
            ${bodyHtml}
            ${footerHtml}
          </article>
        `;
      });

      // Nếu đang ở mục Lý Thuyết: Bổ sung thanh điều hướng chuyển nhanh Bài trước / Bài sau
      if (this.currentTab === "theory") {
        const curIdx = this.theoryLessons.findIndex(l => l.id === this.currentTheoryLesson);
        const prevLesson = curIdx > 0 ? this.theoryLessons[curIdx - 1] : null;
        const nextLesson = curIdx < this.theoryLessons.length - 1 ? this.theoryLessons[curIdx + 1] : null;

        html += `
          <nav class="lesson-nav-footer" aria-label="Điều hướng bài học">
            <div>
              ${prevLesson ? `
                <button type="button" class="btn btn-outline btn-prev-lesson" onclick="App.switchTheoryLesson('${prevLesson.id}')">
                  ← ${prevLesson.shortTitle}
                </button>
              ` : `
                <button type="button" class="btn btn-outline" onclick="App.switchTab('home')">
                  🏠 Về Trang Chủ
                </button>
              `}
            </div>
            <div>
              ${nextLesson ? `
                <button type="button" class="btn btn-primary btn-next-lesson" onclick="App.switchTheoryLesson('${nextLesson.id}')">
                  Học Tiếp: ${nextLesson.shortTitle} ➔
                </button>
              ` : `
                <button type="button" class="btn btn-primary" onclick="App.switchTab('exercise')">
                  ⚡ Chuyển Sang Luyện Bài Tập ➔
                </button>
              `}
            </div>
          </nav>
        `;
      }

      container.innerHTML = html;

      // Render công thức LaTeX nếu có KaTeX
      this.renderKaTeX();
    },

    renderPalette() {
      const palette = document.getElementById("questions-palette");
      if (!palette) return;

      let list = QuizEngine.state.questions;
      if (this.currentTab === "exercise" && this.currentFilterLesson !== "all") {
        list = list.filter(q => q.lesson_id === this.currentFilterLesson);
      }

      let html = "";
      list.forEach((q, idx) => {
        const isFlagged = QuizEngine.state.flagged[q.id];
        const ans = QuizEngine.state.userAnswers[q.id];
        let isAnswered = false;
        let isPartial = false;

        if (q.type === "multiple_choice") {
          isAnswered = Boolean(ans);
        } else if (q.type === "true_false") {
          const totalSub = q.statements ? q.statements.length : 4;
          const answeredSub = ans ? Object.keys(ans).length : 0;
          isAnswered = answeredSub === totalSub;
          isPartial = answeredSub > 0 && answeredSub < totalSub;
        } else if (q.type === "short_answer" || q.type === "essay") {
          isAnswered = Boolean(this.revealedSolutions && this.revealedSolutions[q.id]);
        }

        let classes = "palette-btn";
        if (isAnswered) classes += " answered";
        else if (isPartial) classes += " partial";
        if (isFlagged) classes += " flagged";

        html += `
          <button type="button" class="${classes}" onclick="App.scrollToQuestion('card-${q.id}')" title="Câu ${idx + 1}">
            ${idx + 1}
          </button>
        `;
      });

      palette.innerHTML = html;
    },

    scrollToQuestion(elementId) {
      const target = document.getElementById(elementId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.style.transition = "outline 0.2s ease";
        target.style.outline = "2px solid var(--accent-primary)";
        setTimeout(() => {
          target.style.outline = "none";
        }, 1500);
      }
    },

    handleSelectOption(qId, key) {
      QuizEngine.selectOption(qId, key);
      this.renderQuestions();
      this.renderPalette();
    },

    handleSelectTF(qId, subId, val) {
      QuizEngine.selectTrueFalse(qId, subId, val);
      this.renderQuestions();
      this.renderPalette();
    },

    handleToggleFlag(qId) {
      QuizEngine.toggleFlag(qId);
      this.renderQuestions();
      this.renderPalette();
    },

    submitQuiz() {
      const result = QuizEngine.calculateScore();
      this.stopTimer();
      this.renderQuestions();
      this.renderPalette();

      // Hiển thị modal kết quả
      const modal = document.getElementById("result-modal");
      if (modal) {
        document.getElementById("modal-score").textContent = result.totalScore;
        document.getElementById("modal-max-score").textContent = `/ ${result.maxScore} điểm`;
        document.getElementById("modal-percentage").textContent = `${result.percentage}%`;
        document.getElementById("modal-mc-stat").textContent = `${result.mcCorrect} / ${result.mcTotal}`;
        document.getElementById("modal-tf-stat").textContent = `${result.tfPoints} / ${result.tfTotalScore} đ`;
        modal.hidden = false;
      }
    },

    closeModal() {
      const modal = document.getElementById("result-modal");
      if (modal) modal.hidden = true;
    },

    renderKaTeX() {
      if (window.renderMathInElement) {
        window.renderMathInElement(document.body, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true }
          ],
          throwOnError: false
        });
      }
    }
  };

  window.App = App;
  App.init();
});
