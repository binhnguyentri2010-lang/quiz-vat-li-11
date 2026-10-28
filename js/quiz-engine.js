/**
 * QuizEngine - Động cơ chấm điểm & quản lý trạng thái bài thi Vật lí 11
 * Tuân thủ barem thang điểm chuẩn Bộ GD&ĐT cho dạng đề mới (TN 4 lựa chọn + Đúng/Sai 4 ý)
 * Thiết kế an toàn 100% với localStorage qua try/catch
 */

const QuizEngine = {
  state: {
    activeTab: "pdf_midterm", // 'pdf_midterm' | 'theory' | 'exercise'
    mode: "practice",         // 'practice' (hiện giải thích ngay) | 'exam' (thi bấm giờ)
    questions: [],
    userAnswers: {},          // { [qId]: 'A' | { a: true, b: false } | 'text' }
    flagged: {},              // { [qId]: true }
    timerSeconds: 45 * 60,
    timerInterval: null,
    isSubmitted: false,
    scoreResult: null
  },

  /**
   * Lưu trạng thái vào localStorage an toàn
   */
  saveState() {
    try {
      const dataToSave = {
        activeTab: this.state.activeTab,
        mode: this.state.mode,
        userAnswers: this.state.userAnswers,
        flagged: this.state.flagged,
        timerSeconds: this.state.timerSeconds,
        isSubmitted: this.state.isSubmitted
      };
      localStorage.setItem(`quiz_vatli11_${this.state.activeTab}`, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn("Storage warning: Không thể ghi vào localStorage (có thể do Safari Private Mode).", e);
    }
  },

  /**
   * Khôi phục trạng thái từ localStorage an toàn
   */
  loadState(tabKey) {
    try {
      const saved = localStorage.getItem(`quiz_vatli11_${tabKey}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Storage warning: Không thể đọc từ localStorage.", e);
    }
    return null;
  },

  /**
   * Xóa sạch tiến độ để làm lại từ đầu
   */
  resetProgress(tabKey) {
    try {
      localStorage.removeItem(`quiz_vatli11_${tabKey}`);
    } catch (e) {}
    this.state.userAnswers = {};
    this.state.flagged = {};
    this.state.isSubmitted = false;
    this.state.scoreResult = null;
    this.state.timerSeconds = 45 * 60;
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
      this.state.timerInterval = null;
    }
  },

  /**
   * Ghi nhận lựa chọn trắc nghiệm 4 phương án
   */
  selectOption(qId, optionKey) {
    if (this.state.isSubmitted && this.state.mode === "exam") return;
    this.state.userAnswers[qId] = optionKey;
    this.saveState();
  },

  /**
   * Ghi nhận lựa chọn Đúng/Sai cho từng ý a, b, c, d
   */
  selectTrueFalse(qId, subId, val) {
    if (this.state.isSubmitted && this.state.mode === "exam") return;
    if (!this.state.userAnswers[qId] || typeof this.state.userAnswers[qId] !== "object") {
      this.state.userAnswers[qId] = {};
    }
    this.state.userAnswers[qId][subId] = val;
    this.saveState();
  },

  /**
   * Bật/tắt cờ đánh dấu câu xem lại
   */
  toggleFlag(qId) {
    this.state.flagged[qId] = !this.state.flagged[qId];
    this.saveState();
  },

  /**
   * Barem tính điểm chuẩn Bộ GD&ĐT:
   * - Trắc nghiệm 4 lựa chọn: Mỗi câu 0.25đ
   * - Trắc nghiệm Đúng/Sai:
   *     + Đúng 1 ý: 0.1 điểm
   *     + Đúng 2 ý: 0.25 điểm
   *     + Đúng 3 ý: 0.50 điểm
   *     + Đúng 4 ý: 1.00 điểm
   */
  calculateScore() {
    let totalScore = 0;
    let maxScore = 0;
    let mcCorrect = 0;
    let mcTotal = 0;
    let tfPoints = 0;
    let tfTotal = 0;

    const details = [];

    this.state.questions.forEach((q) => {
      if (q.type === "multiple_choice") {
        mcTotal++;
        maxScore += 0.25;
        const userChoice = this.state.userAnswers[q.id];
        const isCorrect = userChoice && userChoice.toUpperCase() === q.answer.toUpperCase();
        if (isCorrect) {
          totalScore += 0.25;
          mcCorrect++;
        }
        details.push({
          id: q.id,
          type: "multiple_choice",
          isCorrect,
          earned: isCorrect ? 0.25 : 0,
          max: 0.25
        });
      } else if (q.type === "true_false") {
        tfTotal++;
        maxScore += 1.0;
        const userAns = this.state.userAnswers[q.id] || {};
        let correctSubCount = 0;

        q.statements.forEach((stmt) => {
          const sId = stmt.id || stmt.sub_id;
          let isCorrectVal = stmt.correct;
          if (isCorrectVal === undefined) {
            if (stmt.is_correct !== undefined) isCorrectVal = Boolean(stmt.is_correct);
            else if (stmt.correct_answer !== undefined) isCorrectVal = (stmt.correct_answer === true || stmt.correct_answer === "Đúng" || stmt.correct_answer === "true");
            else if (stmt.marked_answer !== undefined) isCorrectVal = (stmt.marked_answer === true || stmt.marked_answer === "Đúng" || stmt.marked_answer === "true");
          }
          isCorrectVal = Boolean(isCorrectVal);
          const uVal = userAns[sId];
          if (uVal !== undefined && uVal === isCorrectVal) {
            correctSubCount++;
          }
        });

        const totalStmts = q.statements ? q.statements.length : 4;
        let earned = 0;
        if (totalStmts === 4) {
          // Barem chuẩn Bộ GD&ĐT cho câu 4 lệnh hỏi
          if (correctSubCount === 1) earned = 0.1;
          else if (correctSubCount === 2) earned = 0.25;
          else if (correctSubCount === 3) earned = 0.5;
          else if (correctSubCount === 4) earned = 1.0;
        } else if (totalStmts > 0) {
          earned = Number(((correctSubCount / totalStmts) * 1.0).toFixed(2));
        }

        totalScore += earned;
        tfPoints += earned;

        details.push({
          id: q.id,
          type: "true_false",
          correctSubCount,
          totalSubCount: totalStmts,
          earned,
          max: 1.0
        });
      }
    });

    const result = {
      totalScore: Number(totalScore.toFixed(2)),
      maxScore: Number(maxScore.toFixed(2)),
      percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
      mcCorrect,
      mcTotal,
      tfPoints: Number(tfPoints.toFixed(2)),
      tfTotalScore: tfTotal * 1.0,
      details
    };

    this.state.scoreResult = result;
    this.state.isSubmitted = true;
    this.saveState();
    return result;
  }
};

window.QuizEngine = QuizEngine;
