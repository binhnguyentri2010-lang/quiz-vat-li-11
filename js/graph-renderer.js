/**
 * GraphRenderer - Trình vẽ đồ thị Vật lí dao động điều hòa bằng SVG Vector thuần
 * Không phụ thuộc thư viện ngoài, nét căng trên Retina/iPhone, responsive.
 */

const GraphRenderer = {
  /**
   * Tạo đồ thị li độ - thời gian x-t cho Câu 7 PDF
   * Phương trình: x = 2*cos(5*pi*t - pi/2) = 2*sin(5*pi*t) (cm)
   * A = 2 cm, T = 0.4 s (T/2 = 0.2 s), qua x=0 tại t=0 theo chiều dương
   */
  renderOscillationGraph() {
    const width = 380;
    const height = 180;
    const padding = { top: 25, right: 30, bottom: 35, left: 45 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    // T = 0.4s, vẽ từ t = 0 đến t = 0.5s
    const tMax = 0.5;
    const xMax = 2.5; // cm

    const toSvgX = (t) => padding.left + (t / tMax) * plotW;
    const toSvgY = (x) => padding.top + plotH / 2 - (x / xMax) * (plotH / 2);

    let pathD = "";
    const samples = 100;
    for (let i = 0; i <= samples; i++) {
      const t = (i / samples) * tMax;
      // x = 2 * sin(5 * Math.PI * t)
      const x = 2 * Math.sin(5 * Math.PI * t);
      const sx = toSvgX(t).toFixed(1);
      const sy = toSvgY(x).toFixed(1);
      pathD += (i === 0 ? `M ${sx} ${sy}` : ` L ${sx} ${sy}`);
    }

    // Grid lines & labels
    let gridLines = "";
    const tTicks = [0.1, 0.2, 0.3, 0.4];
    tTicks.forEach((t) => {
      const sx = toSvgX(t);
      gridLines += `
        <line x1="${sx}" y1="${padding.top}" x2="${sx}" y2="${height - padding.bottom}" stroke="var(--border-subtle)" stroke-dasharray="3,3" />
        <text x="${sx}" y="${height - padding.bottom + 18}" font-size="11" font-weight="600" fill="var(--text-secondary)" text-anchor="middle">${t}</text>
      `;
    });

    const xTicks = [2, -2];
    xTicks.forEach((x) => {
      const sy = toSvgY(x);
      gridLines += `
        <line x1="${padding.left}" y1="${sy}" x2="${width - padding.right}" y2="${sy}" stroke="var(--border-subtle)" stroke-dasharray="3,3" />
        <text x="${padding.left - 8}" y="${sy + 4}" font-size="11" font-weight="700" fill="var(--text-secondary)" text-anchor="end">${x > 0 ? '+2' : '-2'}</text>
      `;
    });

    const zeroY = toSvgY(0);

    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" max-width="${width}px" style="max-width: 440px; display: block; margin: 0 auto; overflow: visible;">
        <!-- Background Grid -->
        ${gridLines}

        <!-- Trục hoành Ot -->
        <line x1="${padding.left - 10}" y1="${zeroY}" x2="${width - 10}" y2="${zeroY}" stroke="var(--text-main)" stroke-width="1.7" marker-end="url(#arrow)" />
        <text x="${width - 5}" y="${zeroY + 4}" font-size="12" font-weight="700" fill="var(--text-main)" text-anchor="start">t (s)</text>
        <text x="${padding.left - 8}" y="${zeroY + 14}" font-size="11" font-weight="600" fill="var(--text-secondary)" text-anchor="end">0</text>

        <!-- Trục tung Ox -->
        <line x1="${padding.left}" y1="${height - 10}" x2="${padding.left}" y2="12" stroke="var(--text-main)" stroke-width="1.7" marker-end="url(#arrow)" />
        <text x="${padding.left}" y="8" font-size="12" font-weight="700" fill="var(--text-main)" text-anchor="middle">x (cm)</text>

        <!-- Đồ thị li độ hình sin -->
        <path d="${pathD}" fill="none" stroke="var(--accent-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Điểm nổi bật -->
        <circle cx="${toSvgX(0)}" cy="${toSvgY(0)}" r="3.5" fill="var(--accent-primary)" />
        <circle cx="${toSvgX(0.1)}" cy="${toSvgY(2)}" r="3.5" fill="var(--accent-primary)" />
        <circle cx="${toSvgX(0.2)}" cy="${toSvgY(0)}" r="3.5" fill="var(--accent-primary)" />
        <circle cx="${toSvgX(0.3)}" cy="${toSvgY(-2)}" r="3.5" fill="var(--accent-primary)" />
        <circle cx="${toSvgX(0.4)}" cy="${toSvgY(0)}" r="3.5" fill="var(--accent-primary)" />

        <!-- Mũi tên trục -->
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--text-main)" />
          </marker>
        </defs>
      </svg>
    `;
  },

  /**
   * Tạo đồ thị thế năng - động năng theo li độ x (Parabol)
   */
  renderEnergyGraph() {
    const width = 360;
    const height = 170;
    const p = { top: 20, right: 30, bottom: 30, left: 40 };
    const pw = width - p.left - p.right;
    const ph = height - p.top - p.bottom;

    const toX = (x) => p.left + ((x + 1) / 2) * pw;
    const toY = (w) => p.top + ph - (w / 1) * ph;

    let wtD = "", wdD = "";
    for (let i = 0; i <= 60; i++) {
      const x = -1 + (i / 60) * 2;
      const wt = x * x;
      const wd = 1 - wt;
      const sx = toX(x).toFixed(1);
      wtD += (i === 0 ? `M ${sx} ${toY(wt).toFixed(1)}` : ` L ${sx} ${toY(wt).toFixed(1)}`);
      wdD += (i === 0 ? `M ${sx} ${toY(wd).toFixed(1)}` : ` L ${sx} ${toY(wd).toFixed(1)}`);
    }

    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" style="max-width: 400px; display: block; margin: 0 auto;">
        <line x1="${p.left}" y1="${toY(1)}" x2="${width - p.right}" y2="${toY(1)}" stroke="var(--border-subtle)" stroke-dasharray="3,3" />
        <text x="${p.left - 6}" y="${toY(1) + 4}" font-size="10" font-weight="700" fill="var(--text-secondary)" text-anchor="end">W</text>

        <!-- Trục hoành Ox -->
        <line x1="${p.left - 10}" y1="${toY(0)}" x2="${width - 10}" y2="${toY(0)}" stroke="var(--text-main)" stroke-width="1.5" />
        <text x="${width - 5}" y="${toY(0) + 4}" font-size="11" font-weight="700" fill="var(--text-main)">x</text>
        <text x="${toX(-1)}" y="${toY(0) + 16}" font-size="10" font-weight="700" fill="var(--text-secondary)" text-anchor="middle">-A</text>
        <text x="${toX(0)}" y="${toY(0) + 16}" font-size="10" font-weight="700" fill="var(--text-secondary)" text-anchor="middle">0</text>
        <text x="${toX(1)}" y="${toY(0) + 16}" font-size="10" font-weight="700" fill="var(--text-secondary)" text-anchor="middle">+A</text>

        <!-- Trục tung OW -->
        <line x1="${toX(0)}" y1="${height - 10}" x2="${toX(0)}" y2="10" stroke="var(--text-main)" stroke-width="1.5" />
        <text x="${toX(0) + 6}" y="12" font-size="11" font-weight="700" fill="var(--text-main)">W</text>

        <!-- Đường cơ năng W = const -->
        <line x1="${toX(-1)}" y1="${toY(1)}" x2="${toX(1)}" y2="${toY(1)}" stroke="var(--warning-border)" stroke-width="2" />
        <text x="${toX(1) + 4}" y="${toY(1) + 3}" font-size="9" font-weight="700" fill="var(--warning-border)">W</text>

        <!-- Đường thế năng Wt -->
        <path d="${wtD}" fill="none" stroke="var(--accent-primary)" stroke-width="2.2" />
        <text x="${toX(-0.7)}" y="${toY(0.7)}" font-size="10" font-weight="700" fill="var(--accent-primary)">Wt</text>

        <!-- Đường động năng Wd -->
        <path d="${wdD}" fill="none" stroke="var(--success-border)" stroke-width="2.2" stroke-dasharray="4,3" />
        <text x="${toX(0.7)}" y="${toY(0.7)}" font-size="10" font-weight="700" fill="var(--success-border)">Wd</text>
      </svg>
    `;
  }
};

window.GraphRenderer = GraphRenderer;
