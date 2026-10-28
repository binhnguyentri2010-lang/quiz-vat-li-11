/**
 * CasioGuide - Cẩm nang Mẹo bấm máy tính Casio fx-880BTG cho Vật lí 11
 * Chuẩn phím máy tính thế hệ mới Casio fx-880BTG (Home, Catalog, Settings, Format, Tools)
 */

const CasioGuide = {
  tips: {
    radian_setting: {
      title: "Chuyển đơn vị góc sang Radian (R)",
      keys: ["SETTINGS", "Cài đặt phép tính", "Đơn vị góc", "Radian"],
      note: "Bắt buộc kiểm tra góc chữ R trên màn hình trước khi tính các hàm cos, sin trong dao động điều hòa!"
    },
    complex_addition: {
      title: "Cộng 2 dao động cùng phương, cùng tần số",
      keys: ["HOME", "Số phức (Complex)", "OK", "Nhập: A1 ∠ φ1 + A2 ∠ φ2", "EXE", "FORMAT", "r∠θ"],
      note: "Để gõ dấu ∠: Nhấn CATALOG > Số phức > Ký hiệu góc ∠. FORMAT r∠θ cho ra ngay Biên độ tổng hợp A và Pha ban đầu φ."
    },
    derivative_velocity: {
      title: "Tính vận tốc v tức thời bằng phép đạo hàm",
      keys: ["CATALOG", "Phép tính giải tích", "Đạo hàm d/dx", "Nhập: f(x) = x(t)", "x = t0", "EXE"],
      note: "Vì v = x'(t), bấm trực tiếp đạo hàm tại thời điểm t0 giúp tránh nhầm lẫn dấu sin/cos và pha ban đầu."
    },
    table_scan: {
      title: "Dò bảng Table quét thời điểm và quãng đường",
      keys: ["HOME", "Bảng giá trị (Table)", "f(x) = A*cos(ωx + φ)", "TOOLS", "Phạm vi bảng", "Start: 0", "End: T", "Step: T/12"],
      note: "Bước nhảy T/12 hoặc T/24 giúp đi qua đúng các vị trí đặc biệt (0, ±A/2, ±A√2/2, ±A√3/2, ±A)."
    },
    solve_equation: {
      title: "Dò nghiệm tìm thời điểm vật qua li độ x0",
      keys: ["Nhập phương trình f(x) = 0", "TOOLS", "Equation Solver (Lời giải phương trình)", "Nhập giá trị dự đoán", "EXE"],
      note: "Hữu ích khi đề bài hỏi thời điểm đầu tiên hoặc thời điểm lần thứ k vật đi qua vị trí có li độ xác định."
    }
  },

  /**
   * Tạo HTML hiển thị mẹo bấm máy trực quan
   */
  renderTipCard(tipKey) {
    const tip = this.tips[tipKey];
    if (!tip) return "";

    const keyBadges = tip.keys.map(k => `<span class="key-badge">${k}</span>`).join(" <span style='color:var(--text-muted);font-size:0.8rem;'>➔</span> ");

    return `
      <div class="casio-tip-box">
        <div class="casio-tip-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="16" y2="10" />
            <line x1="8" y1="14" x2="16" y2="14" />
            <line x1="8" y1="18" x2="16" y2="18" />
          </svg>
          Mẹo Casio fx-880BTG: ${tip.title}
        </div>
        <div class="casio-keys">${keyBadges}</div>
        <div style="margin-top:0.4rem;font-size:0.8rem;color:var(--text-secondary);font-style:italic;">
          💡 ${tip.note}
        </div>
      </div>
    `;
  }
};

window.CasioGuide = CasioGuide;
