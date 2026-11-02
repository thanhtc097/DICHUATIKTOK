/**
 * ============================================================================
 * BỘ DỰNG CẢNH CHÁNH ĐIỆN PIXEL ART / RETRO 16-BIT (PixelSceneRenderer)
 * Tái hiện thế giới thiền định bằng phong cách đồ họa hoài niệm RPG 16-bit / SNES.
 * ============================================================================
 */

class PixelSceneRenderer {
  constructor() {
    this.canvas = document.getElementById('pixel-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Tỉ lệ dựng cảnh logic: 540 x 960 (Chuẩn dọc 9:16)
    this.virtualWidth = 540;
    this.virtualHeight = 960;

    this.seats = [];
    this.gridCols = 4;
    this.gridRows = 6;
    this.totalSeats = 24;

    this.burstEffects = []; // { x, y, radius, maxRadius, color, life, maxLife }
    this.incenseOfferings = new Map(); // seatIndex -> animation state
    this.woodenFishPulse = 0; // 0..1 khi gõ mõ
    this.bellRings = []; // Các vòng sóng âm chuông pixel

    // Hạt khí quyển pixel (Cánh sen, Bụi vàng, Đom đóm)
    this.particles = [];
    this.initAtmosphereParticles();

    this.time = 0;
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  handleResize() {
    const stage = document.getElementById('stage-container');
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);

    this.scaleX = this.canvas.width / this.virtualWidth;
    this.scaleY = this.canvas.height / this.virtualHeight;

    // Giữ nét vẽ pixel sắc cạnh không bị mờ
    this.ctx.imageSmoothingEnabled = false;
  }

  initAtmosphereParticles() {
    this.particles = [];
    const count = 38;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.virtualWidth,
        y: Math.random() * this.virtualHeight,
        type: i % 3 === 0 ? 'lotus' : (i % 3 === 1 ? 'gold_dust' : 'firefly'),
        size: 2 + Math.floor(Math.random() * 3),
        speedY: 0.25 + Math.random() * 0.45,
        speedX: (Math.random() - 0.5) * 0.35,
        phase: Math.random() * Math.PI * 2,
        color: i % 3 === 0 ? '#f878a8' : (i % 3 === 1 ? '#ffe640' : '#7ce0ff')
      });
    }
  }

  updateSeats(seats, cols = 4, rows = 6) {
    this.seats = seats || [];
    this.gridCols = cols;
    this.gridRows = rows;
    this.totalSeats = (seats && seats.length) ? seats.length : (cols * rows);
  }

  triggerSeatBurst(seatIndex, color = '#ffe640') {
    const pos = this.getSeatScreenPosition(seatIndex);
    if (!pos) return;
    this.burstEffects.push({
      x: pos.x,
      y: pos.y,
      radius: 4,
      maxRadius: 42,
      color: color,
      life: 1.0,
      decay: 0.025
    });
  }

  triggerBellRing() {
    this.bellRings.push({
      x: this.virtualWidth * 0.5,
      y: 195,
      radius: 10,
      maxRadius: 360,
      life: 1.0,
      decay: 0.016
    });

    const stage = document.getElementById('stage-container');
    if (stage) {
      stage.classList.remove('bell-shake');
      void stage.offsetWidth;
      stage.classList.add('bell-shake');
    }
  }

  triggerWoodenFishHit() {
    this.woodenFishPulse = 1.0;
  }

  triggerIncenseOffering(seatIndex, user) {
    const startPos = this.getSeatScreenPosition(seatIndex);
    if (!startPos) return;

    this.incenseOfferings.set(seatIndex, {
      seatIndex,
      user: user || { nickname: 'Phật Tử', skin: 'nam' },
      startTime: performance.now(),
      startX: startPos.x,
      startY: startPos.y,
      targetX: this.virtualWidth * 0.5,
      targetY: 345, // Trước lư hương Chánh điện
      durationTotal: 8800 // 8.8 giây cho cả chu trình
    });
  }

  getSeatScreenPosition(index) {
    if (typeof index !== 'number' || index < 0) return null;
    const cols = Math.max(1, this.gridCols || 4);
    const rows = Math.max(1, this.gridRows || 6);

    const row = Math.floor(index / cols);
    const col = index % cols;

    // Phép chiếu phối cảnh bậc thang hoài niệm 16-bit
    const t = rows > 1 ? (row / (rows - 1)) : 0.5;
    
    // Y bắt đầu từ dưới bục Thầy (y ~ 440) nở dần xuống đáy (y ~ 910)
    const y = 430 + (470 * Math.pow(t, 1.08));

    // Bề rộng hàng mở rộng dần theo chiều sâu (hình thang phối cảnh)
    const rowWidth = this.virtualWidth * (0.64 + 0.32 * t);
    const startX = (this.virtualWidth - rowWidth) * 0.5;
    const stepX = cols > 1 ? (rowWidth / (cols - 1)) : 0;
    const x = startX + col * stepX;

    // Hệ số co giãn theo chiều sâu và số ghế
    const depthScale = (0.76 + 0.28 * t) * Math.min(1.0, Math.sqrt(24 / Math.max(24, this.totalSeats)));

    return { x: Math.round(x), y: Math.round(y), scale: depthScale, row, col };
  }

  // ==========================================================================
  // VÒNG LẶP RENDER CHÍNH (RENDER LOOP)
  // ==========================================================================
  animate(currentTime) {
    this.time = currentTime * 0.001;

    if (this.woodenFishPulse > 0) {
      this.woodenFishPulse = Math.max(0, this.woodenFishPulse - 0.06);
    }

    this.ctx.save();
    this.ctx.scale(this.scaleX, this.scaleY);

    // 1. Vẽ Nền Chánh Điện Pixel Art 16-bit
    this.drawPixelTempleBackground();

    // 2. Vẽ Tượng Đức Phật Thích Ca Mâu Ni & Hào Quang 16-bit
    this.drawPixelBuddhaStatue();

    // 3. Vẽ Bàn Thờ Tam Bảo & Lư Hương Nghi Ngút Khói 16-bit
    this.drawPixelAltarAndIncense();

    // 4. Vẽ Hàng 3 Vị Sư Thầy Tọa Thiền & Gõ Mõ
    this.drawHeadMonks();

    // 5. Vẽ Lưới Bồ Đoàn & Thiền Sinh (24..100 Chỗ)
    this.drawSeatsAndMeditators();

    // 6. Vẽ Hoạt Ảnh Người Bước Lên Cắm Nhang (Incense Walk Cycle)
    this.drawIncenseOfferings();

    // 7. Vẽ Sóng Âm Đại Hồng Chung & Vụ Nổ Sao Tặng Quà
    this.drawVisualEffects();

    // 8. Vẽ Bụi Vàng & Cánh Sen Rơi Bầu Khí Quyển
    this.drawAtmosphereParticles();

    this.ctx.restore();
    requestAnimationFrame(this.animate);
  }

  // ==========================================================================
  // 1. NỀN CHÁNH ĐIỆN CHÙA PIXEL ART (Kiến trúc cổ Việt Nam 16-bit)
  // ==========================================================================
  drawPixelTempleBackground() {
    const ctx = this.ctx;
    const W = this.virtualWidth;
    const H = this.virtualHeight;

    // Bầu trời đêm tĩnh lặng / tường chánh điện
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#12081e');
    grad.addColorStop(0.35, '#220f32');
    grad.addColorStop(0.55, '#351838');
    grad.addColorStop(1, '#1b0e24');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Mái ngói Chùa cổ cong vút (Mái ngói âm dương pixelated)
    ctx.fillStyle = '#6b2014'; // Đỏ gạch nung cổ
    ctx.beginPath();
    ctx.moveTo(10, 80);
    ctx.lineTo(80, 50);
    ctx.lineTo(W - 80, 50);
    ctx.lineTo(W - 10, 80);
    ctx.lineTo(W - 40, 105);
    ctx.lineTo(40, 105);
    ctx.closePath();
    ctx.fill();

    // Viền ngói vàng thếp ngọc
    ctx.fillStyle = '#e8a820';
    ctx.fillRect(35, 102, W - 70, 5);
    ctx.fillRect(75, 48, W - 150, 4);

    // Đầu đao mái chùa cong vút 2 bên (Đặc trưng chùa Việt)
    this.drawPixelTileEdge(8, 76, true);
    this.drawPixelTileEdge(W - 24, 76, false);

    // Hai Cột Gỗ Lim To Chống Chánh Điện
    ctx.fillStyle = '#421f14';
    ctx.fillRect(20, 105, 30, 480);
    ctx.fillRect(W - 50, 105, 30, 480);

    // Khắc câu đối chữ vàng trên cột gỗ
    ctx.fillStyle = '#f8b800';
    ctx.fillRect(24, 110, 22, 5);
    ctx.fillRect(W - 46, 110, 22, 5);
    this.drawCoupletLetters(28, 140, ['TÂM', 'TỰA', 'LIÊN', 'HOA', 'TỊNH']);
    this.drawCoupletLetters(W - 42, 140, ['ĐỨC', 'NHƯ', 'ĐẠI', 'HẢI', 'THÂM']);

    // Hai Đèn Lồng Lục Giác Đỏ Treo 2 Bên (Đung đưa theo nhịp)
    const sway = Math.sin(this.time * 1.5) * 4;
    this.drawPixelLantern(58 + sway, 115);
    this.drawPixelLantern(W - 86 - sway, 115);

    // Nền gạch chiếu thiền Chánh điện (Lát gạch nung Bát Tràng)
    ctx.fillStyle = '#2d182b';
    ctx.fillRect(0, 410, W, H - 410);

    // Các đường chỉ gạch phối cảnh 16-bit
    ctx.strokeStyle = '#3e2038';
    ctx.lineWidth = 2;
    for (let y = 430; y < H; y += 38) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (let x = 40; x < W; x += 65) {
      ctx.beginPath();
      ctx.moveTo(x, 420);
      ctx.lineTo(x * 1.3 - W * 0.15, H);
      ctx.stroke();
    }
  }

  drawPixelTileEdge(x, y, isLeft) {
    const ctx = this.ctx;
    ctx.fillStyle = '#f8b800';
    const dir = isLeft ? -1 : 1;
    ctx.fillRect(x, y, 16, 6);
    ctx.fillRect(x + dir * 6, y - 8, 10, 8);
    ctx.fillRect(x + dir * 12, y - 16, 6, 8);
  }

  drawCoupletLetters(x, startY, words) {
    const ctx = this.ctx;
    ctx.fillStyle = '#fce47c';
    ctx.font = 'bold 13px "VT323", monospace';
    ctx.textAlign = 'center';
    words.forEach((w, i) => {
      ctx.fillText(w, x + 6, startY + i * 26);
    });
  }

  drawPixelLantern(x, y) {
    const ctx = this.ctx;
    // Dây treo
    ctx.fillStyle = '#d09828';
    ctx.fillRect(x + 10, y, 2, 22);

    // Thân lồng đèn đỏ vàng
    const lanternPulse = 0.8 + 0.2 * Math.sin(this.time * 4);
    ctx.fillStyle = '#b81c20';
    ctx.fillRect(x + 2, y + 22, 18, 26);
    ctx.fillStyle = '#e8a820';
    ctx.fillRect(x + 5, y + 25, 12, 20);

    // Ánh sáng tỏa ra
    ctx.fillStyle = `rgba(255, 230, 80, ${0.25 * lanternPulse})`;
    ctx.fillRect(x - 8, y + 14, 38, 42);

    // Tua rua lồng đèn
    ctx.fillStyle = '#d09828';
    ctx.fillRect(x + 9, y + 48, 4, 14);
  }

  // ==========================================================================
  // 2. TƯỢNG ĐỨC PHẬT THÍCH CA MÂU NI & HÀO QUANG 16-BIT
  // ==========================================================================
  drawPixelBuddhaStatue() {
    const ctx = this.ctx;
    const cx = this.virtualWidth * 0.5;
    const cy = 205; // Tâm tượng Phật

    // 1. Hào Quang Tỏa Sáng Tuần Hoàn (Palette Cycling 16-bit Halo)
    const haloRadius = 68 + Math.sin(this.time * 2.2) * 5;
    const haloSteps = 5;
    for (let r = haloSteps; r >= 1; r--) {
      const rad = (haloRadius / haloSteps) * r;
      const alpha = 0.12 + (haloSteps - r) * 0.05;
      ctx.fillStyle = `rgba(255, 220, 60, ${alpha})`;
      ctx.beginPath();
      ctx.arc(cx, cy - 22, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Các tia hào quang 16-bit tỏa 8 hướng
    const rayAngle = this.time * 0.45;
    ctx.fillStyle = 'rgba(255, 240, 120, 0.35)';
    for (let i = 0; i < 8; i++) {
      const ang = rayAngle + (i * Math.PI / 4);
      const rx = cx + Math.cos(ang) * (haloRadius + 14);
      const ry = (cy - 22) + Math.sin(ang) * (haloRadius + 14);
      ctx.fillRect(Math.round(rx) - 2, Math.round(ry) - 2, 5, 5);
    }

    // 2. Tòa Sen Vàng Bát Nhã (Đài sen tam cấp 16-bit)
    ctx.fillStyle = '#b88018'; // Đáy tòa sen
    ctx.fillRect(cx - 52, cy + 50, 104, 18);
    ctx.fillStyle = '#f8b800'; // Thân tòa sen
    ctx.fillRect(cx - 44, cy + 38, 88, 14);

    // Cánh hoa sen hồng vàng uốn lượn xung quanh đài sen
    ctx.fillStyle = '#f878a8';
    for (let k = -4; k <= 4; k++) {
      ctx.fillRect(cx + k * 11 - 5, cy + 28, 10, 12);
    }

    // 3. Thân Tượng Đức Phật Thích Ca (Dát vàng rực rỡ)
    // Áo Cà sa vàng óng
    ctx.fillStyle = '#e8a010';
    ctx.fillRect(cx - 32, cy - 2, 64, 40); // Khối thân ngực
    ctx.fillStyle = '#fcd040'; // Vạt y áo cà sa vắt chéo
    ctx.fillRect(cx - 16, cy + 2, 32, 36);

    // Hai cánh tay kiết ấn thiền định (Dhyana Mudra)
    ctx.fillStyle = '#e8a010';
    ctx.fillRect(cx - 40, cy + 8, 14, 26);
    ctx.fillRect(cx + 26, cy + 8, 14, 26);
    ctx.fillStyle = '#ffe070'; // Hai bàn tay đan nhau đặt trên đùi
    ctx.fillRect(cx - 14, cy + 24, 28, 10);

    // 4. Khuôn Mặt & Nhục Kế (Ushnisha) Đức Phật
    // Khuôn mặt từ bi
    ctx.fillStyle = '#ffe070';
    ctx.fillRect(cx - 18, cy - 32, 36, 30);
    // Vành tai dài phúc hậu
    ctx.fillRect(cx - 22, cy - 26, 4, 20);
    ctx.fillRect(cx + 18, cy - 26, 4, 20);

    // Mắt khép hờ tĩnh tọa
    ctx.fillStyle = '#5c3814';
    ctx.fillRect(cx - 12, cy - 18, 8, 2);
    ctx.fillRect(cx + 4, cy - 18, 8, 2);
    // Nốt ruồi ngọc Bạch Hào (Urna) giữa trán
    ctx.fillStyle = '#f83838';
    ctx.fillRect(cx - 1, cy - 24, 3, 3);

    // Tóc xoắn ốc xanh đen & Nhục kế nhô cao trên đỉnh đầu
    ctx.fillStyle = '#1c2844';
    ctx.fillRect(cx - 18, cy - 38, 36, 8);
    ctx.fillRect(cx - 8, cy - 44, 16, 7); // Nhục kế nhô cao
  }

  // ==========================================================================
  // 3. BÀN THỜ TAM BẢO & LƯ HƯƠNG NGHI NGÚT KHÓI PIXEL 16-BIT
  // ==========================================================================
  drawPixelAltarAndIncense() {
    const ctx = this.ctx;
    const cx = this.virtualWidth * 0.5;
    const ay = 285;

    // Bàn thờ sơn son thếp vàng
    ctx.fillStyle = '#5c1b12';
    ctx.fillRect(cx - 72, ay, 144, 46);
    ctx.fillStyle = '#f8b800'; // Nẹp viền vàng
    ctx.fillRect(cx - 76, ay - 2, 152, 6);
    ctx.fillRect(cx - 68, ay + 38, 136, 5);

    // Mâm ngũ quả & đĩa hoa sen cúng Phật
    ctx.fillStyle = '#f878a8';
    ctx.fillRect(cx - 56, ay - 10, 16, 8); // Đĩa hoa sen hồng bên trái
    ctx.fillStyle = '#f8a020';
    ctx.fillRect(cx + 40, ay - 10, 16, 8); // Mâm ngũ quả vàng bên phải

    // Lư hương đồng tam khí uy nghiêm chính giữa bàn thờ
    ctx.fillStyle = '#b88424';
    ctx.fillRect(cx - 20, ay - 16, 40, 22);
    ctx.fillStyle = '#fcd040';
    ctx.fillRect(cx - 24, ay - 18, 48, 5); // Miệng lư hương
    // Chân quỳ lư hương
    ctx.fillStyle = '#8a5c12';
    ctx.fillRect(cx - 16, ay + 6, 8, 6);
    ctx.fillRect(cx + 8, ay + 6, 8, 6);

    // Ba nén nhang đỏ cắm trên lư hương
    ctx.fillStyle = '#c82828';
    ctx.fillRect(cx - 7, ay - 36, 2, 20); // Nén trái
    ctx.fillRect(cx - 1, ay - 42, 2, 26); // Nén giữa
    ctx.fillRect(cx + 5, ay - 36, 2, 20); // Nén phải

    // Đầu nhang đỏ rực nhấp nháy
    const glow = (Math.sin(this.time * 8) + 1) * 0.5;
    ctx.fillStyle = glow > 0.4 ? '#ff5030' : '#ffe050';
    ctx.fillRect(cx - 8, ay - 38, 4, 3);
    ctx.fillRect(cx - 2, ay - 44, 4, 3);
    ctx.fillRect(cx + 4, ay - 38, 4, 3);

    // Khói trầm hương uốn lượn bay lên trời (Procedural Pixel Smoke)
    ctx.fillStyle = 'rgba(255, 245, 220, 0.42)';
    for (let s = 0; s < 18; s++) {
      const sy = ay - 48 - (s * 8);
      const wave = Math.sin(this.time * 2.5 + s * 0.45) * (6 + s * 1.2);
      const smokeW = 4 + Math.floor(s * 0.7);
      ctx.fillRect(Math.round(cx + wave - smokeW * 0.5), Math.round(sy), smokeW, 5);
    }
  }

  // ==========================================================================
  // 4. HÀNG 3 VỊ SƯ THẦY TỌA THIỀN & GÕ MÕ
  // ==========================================================================
  drawHeadMonks() {
    const ctx = this.ctx;
    const W = this.virtualWidth;
    const monkY = 370;

    // Sư Trụ Trì ở giữa (y = monkY, cx = W * 0.5)
    this.drawHeadMonkSprite(W * 0.5, monkY, 'tru_tri', 'Sư Trụ Trì', true);

    // Thầy Minh Đạo bên trái
    this.drawHeadMonkSprite(W * 0.24, monkY, 'thay_minh_dao', 'Thầy Minh Đạo', false);

    // Thầy Tâm Từ bên phải
    this.drawHeadMonkSprite(W * 0.76, monkY, 'thay_tam_tu', 'Thầy Tâm Từ', false);
  }

  drawHeadMonkSprite(x, y, type, label, isAbbot = false) {
    const ctx = this.ctx;
    const breath = Math.sin(this.time * 2 + (isAbbot ? 0 : 1.2)) * 1.5;
    const drawY = Math.round(y + breath);

    // 1. Bồ đoàn thiền tọa
    ctx.fillStyle = '#6a3820';
    ctx.fillRect(x - 24, drawY + 24, 48, 12);
    ctx.fillStyle = '#c89030';
    ctx.fillRect(x - 20, drawY + 22, 40, 4);

    // 2. Y Cà sa Sư Thầy
    const robeColor = isAbbot ? '#c03828' : '#d88c20'; // Trụ trì cà sa đỏ tổ, 2 thầy cà sa vàng
    const innerColor = isAbbot ? '#ecc94b' : '#975a16';

    ctx.fillStyle = robeColor;
    ctx.fillRect(x - 18, drawY - 4, 36, 28);
    ctx.fillStyle = innerColor;
    ctx.fillRect(x - 8, drawY + 2, 16, 22);

    // 3. Đầu Sư Thầy cạo trọc trang nghiêm
    ctx.fillStyle = '#ffe090';
    ctx.fillRect(x - 11, drawY - 26, 22, 22);
    // Vành tai dài
    ctx.fillRect(x - 13, drawY - 20, 2, 12);
    ctx.fillRect(x + 11, drawY - 20, 2, 12);

    // Mắt khép thiền
    ctx.fillStyle = '#5c3814';
    ctx.fillRect(x - 7, drawY - 14, 5, 2);
    ctx.fillRect(x + 2, drawY - 14, 5, 2);

    // 4. Nếu là Sư Trụ Trì: Đặt Mõ Gỗ trước mặt và hoạt ảnh dùi gõ mõ
    if (isAbbot) {
      // Chiếc mõ gỗ tròn
      ctx.fillStyle = '#663318';
      ctx.fillRect(x - 10, drawY + 12, 20, 14);
      ctx.fillStyle = '#9e5524';
      ctx.fillRect(x - 8, drawY + 14, 16, 8);

      // Cánh tay cầm dùi mõ gõ theo nhịp
      const strike = this.woodenFishPulse > 0.1 ? 5 : 0;
      ctx.fillStyle = '#ffe090';
      ctx.fillRect(x + 12, drawY + 6 + strike, 6, 6); // Bàn tay
      ctx.fillStyle = '#c89030';
      ctx.fillRect(x + 6, drawY + 10 + strike, 8, 3); // Dùi gõ

      // Nốt nhạc bay lên khi gõ mõ
      if (this.woodenFishPulse > 0.2) {
        ctx.fillStyle = '#ffe640';
        ctx.font = '16px "VT323", monospace';
        ctx.fillText('♫', x - 14, drawY - 4 - this.woodenFishPulse * 16);
      }
    } else {
      // 2 vị Thầy 2 bên chắp tay búp sen niệm Phật
      ctx.fillStyle = '#ffe090';
      ctx.fillRect(x - 5, drawY + 4, 10, 10);
    }

    // 5. Thẻ Tên Vị Thầy bằng font pixel
    ctx.fillStyle = 'rgba(28, 14, 40, 0.88)';
    ctx.fillRect(x - 38, drawY + 36, 76, 17);
    ctx.strokeStyle = '#f8b800';
    ctx.strokeRect(x - 38, drawY + 36, 76, 17);

    ctx.fillStyle = '#ffe640';
    ctx.font = '12px "VT323", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, drawY + 49);
  }

  // ==========================================================================
  // 5. VẼ LƯỚI BỒ ĐOÀN & 19 SKIN THIỀN SINH PIXEL ART 16-BIT
  // ==========================================================================
  drawSeatsAndMeditators() {
    const ctx = this.ctx;
    const total = this.totalSeats || 24;

    for (let i = 0; i < total; i++) {
      const pos = this.getSeatScreenPosition(i);
      if (!pos) continue;

      const seat = this.seats[i];
      const isOccupied = seat && seat.occupied && seat.user;
      
      // Nếu đang trong hoạt ảnh cắm nhang thì bỏ qua vẽ tĩnh tại chỗ
      if (this.incenseOfferings.has(i)) continue;

      this.drawSingleSeat(pos.x, pos.y, pos.scale, seat, isOccupied, i);
    }
  }

  drawSingleSeat(x, y, scale, seat, isOccupied, seatIndex) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // 1. Vẽ Bồ Đoàn Tròn Pixel Art
    ctx.fillStyle = isOccupied ? '#542618' : '#301826';
    ctx.fillRect(-22, -6, 44, 14);
    ctx.fillStyle = isOccupied ? '#b87820' : '#4a253a';
    ctx.fillRect(-18, -8, 36, 4);

    // 2. Vòng hào quang phước lành nếu Phật tử đã cúng dường tích điểm công đức
    if (isOccupied && seat.user.meritPoints > 0) {
      const auraPulse = Math.sin(this.time * 3 + seatIndex) * 3;
      ctx.strokeStyle = '#ffe640';
      ctx.lineWidth = 2;
      ctx.strokeRect(-26 - auraPulse * 0.5, -34, 52 + auraPulse, 44);
    }

    // 3. Nếu có người ngồi thiền: Vẽ Sprite Nhân vật Pixel
    if (isOccupied) {
      const user = seat.user;
      const breath = Math.sin(this.time * 2.2 + seatIndex * 0.6) * 1.5;
      this.drawCharacterSprite(0, Math.round(-12 + breath), user.skin || 'nam');

      // Nhãn Tên Phật Tử
      this.drawUserLabel(0, 14, user.nickname || 'Phật Tử', user.meritPoints);
    } else {
      // Ghế Trống: Vẽ số thứ tự ghế mờ
      ctx.fillStyle = '#6e4460';
      ctx.font = '12px "VT323", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${seatIndex + 1}`, 0, 4);
    }

    ctx.restore();
  }

  // ==========================================================================
  // HỆ THỐNG VẼ 19 SKIN NHÂN VẬT SPRITES 16-BIT (Procedural Pixel Generators)
  // ==========================================================================
  drawCharacterSprite(cx, cy, skin) {
    const ctx = this.ctx;
    const p = this.getSkinPalette(skin);

    // Thân áo ngồi thiền kiết già
    ctx.fillStyle = p.robe;
    ctx.fillRect(cx - 15, cy - 2, 30, 20); // Vạt áo tràng
    ctx.fillStyle = p.inner;
    ctx.fillRect(cx - 6, cy + 2, 12, 16); // Vạt trong

    // Hai bàn tay chắp trước ngực hoặc đặt trên đùi
    ctx.fillStyle = p.skinTone;
    ctx.fillRect(cx - 4, cy + 4, 8, 7);

    // Khuôn mặt chibi retro 16-bit
    ctx.fillStyle = p.skinTone;
    ctx.fillRect(cx - 9, cy - 20, 18, 18);

    // Mắt to chibi nhắm mắt thiền định
    ctx.fillStyle = p.eyeColor || '#2c1808';
    ctx.fillRect(cx - 6, cy - 11, 4, 2);
    ctx.fillRect(cx + 2, cy - 11, 4, 2);

    // Vẽ Tóc / Mũ / Phụ kiện đặc trưng theo từng Skin
    this.drawSkinAccessory(cx, cy, skin, p);
  }

  getSkinPalette(skin) {
    const palettes = {
      nam: { robe: '#6a7888', inner: '#e2e8f0', skinTone: '#ffd9a0' },
      nu: { robe: '#edf2f7', inner: '#cbd5e0', skinTone: '#ffe4c4' },
      su: { robe: '#d69e2e', inner: '#975a16', skinTone: '#ffd9a0' },
      tieu: { robe: '#b7791f', inner: '#ecc94b', skinTone: '#ffd9a0' },
      ni: { robe: '#c09b52', inner: '#e2e8f0', skinTone: '#ffe4c4' },
      caotang: { robe: '#c53030', inner: '#ecc94b', skinTone: '#ffd9a0' },
      sen: { robe: '#f687b3', inner: '#fff5f7', skinTone: '#ffe4c4' },
      vang: { robe: '#ecc94b', inner: '#ffffff', skinTone: '#ffd9a0' },
      canhsat: { robe: '#2f5e3d', inner: '#eab308', skinTone: '#ffd9a0' },
      bacsi: { robe: '#f8fafc', inner: '#ef4444', skinTone: '#ffd9a0' },
      trom: { robe: '#1e293b', inner: '#f1f5f9', skinTone: '#ffd9a0' },
      heo: { robe: '#f472b6', inner: '#fbcfe8', skinTone: '#fbcfe8' },
      bo: { robe: '#f8fafc', inner: '#1e293b', skinTone: '#ffd9a0' },
      ga: { robe: '#facc15', inner: '#ef4444', skinTone: '#ffd9a0' },
      hocsinh: { robe: '#ffffff', inner: '#dc2626', skinTone: '#ffd9a0' },
      duccha: { robe: '#0f172a', inner: '#ffffff', skinTone: '#ffd9a0' },
      thantai: { robe: '#dc2626', inner: '#facc15', skinTone: '#ffd9a0' },
      ninja: { robe: '#1e1b4b', inner: '#4338ca', skinTone: '#ffd9a0' },
      congchua: { robe: '#fbcfe8', inner: '#f472b6', skinTone: '#ffe4c4' }
    };
    return palettes[skin] || palettes.nam;
  }

  drawSkinAccessory(cx, cy, skin, p) {
    const ctx = this.ctx;

    switch (skin) {
      case 'canhsat': // Mũ cành hương cảnh sát xanh lá
        ctx.fillStyle = '#1e3e28';
        ctx.fillRect(cx - 10, cy - 25, 20, 6);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(cx - 2, cy - 23, 4, 3);
        break;
      case 'bacsi': // Mũ y tế có chữ thập đỏ
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 9, cy - 25, 18, 6);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cx - 1, cy - 24, 2, 4);
        ctx.fillRect(cx - 2, cy - 23, 4, 2);
        break;
      case 'trom': // Khăn trùm đầu ninja đạo chích
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cx - 10, cy - 24, 20, 7);
        ctx.fillRect(cx - 9, cy - 7, 18, 5); // Khẩu trang che miệng
        break;
      case 'heo': // Tai heo hồng
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(cx - 11, cy - 24, 5, 5);
        ctx.fillRect(cx + 6, cy - 24, 5, 5);
        // Mũi heo
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(cx - 4, cy - 10, 8, 4);
        break;
      case 'bo': // Sừng bò sữa
        ctx.fillStyle = '#475569';
        ctx.fillRect(cx - 12, cy - 25, 4, 6);
        ctx.fillRect(cx + 8, cy - 25, 4, 6);
        break;
      case 'ga': // Mào gà đỏ rực
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cx - 3, cy - 26, 6, 7);
        // Mỏ gà vàng
        ctx.fillStyle = '#f97316';
        ctx.fillRect(cx - 2, cy - 10, 4, 3);
        break;
      case 'hocsinh': // Khăn quàng đỏ học sinh
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cx - 5, cy - 2, 10, 4);
        ctx.fillRect(cx - 2, cy + 2, 4, 6);
        break;
      case 'duccha': // Cổ áo cha xứ màu trắng
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 3, cy - 2, 6, 3);
        break;
      case 'thantai': // Mũ cánh chuồn Thần Tài
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cx - 10, cy - 26, 20, 7);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(cx - 16, cy - 22, 6, 3);
        ctx.fillRect(cx + 10, cy - 22, 6, 3);
        break;
      case 'ninja': // Băng đeo trán nhẫn giả
        ctx.fillStyle = '#4338ca';
        ctx.fillRect(cx - 10, cy - 21, 20, 4);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(cx - 3, cy - 21, 6, 4);
        break;
      case 'congchua': // Vương miện công chúa
        ctx.fillStyle = '#facc15';
        ctx.fillRect(cx - 6, cy - 25, 12, 5);
        ctx.fillRect(cx - 6, cy - 28, 3, 3);
        ctx.fillRect(cx - 1, cy - 29, 3, 4);
        ctx.fillRect(cx + 4, cy - 28, 3, 3);
        break;
      case 'su':
      case 'ni':
      case 'caotang': // Đầu sư thầy cạo trọc
        break;
      default: // Cư sĩ nam / nữ: Búi tóc gọn gàng
        ctx.fillStyle = '#221510';
        ctx.fillRect(cx - 9, cy - 22, 18, 4);
        ctx.fillRect(cx - 3, cy - 26, 6, 5);
        break;
    }
  }

  drawUserLabel(x, y, name, merit) {
    const ctx = this.ctx;
    ctx.font = '13px "VT323", monospace';
    ctx.textAlign = 'center';

    const cleanName = name.length > 12 ? (name.substring(0, 11) + '…') : name;
    const txtWidth = ctx.measureText(cleanName).width;

    ctx.fillStyle = 'rgba(18, 10, 24, 0.88)';
    ctx.fillRect(x - txtWidth * 0.5 - 5, y - 9, txtWidth + 10, 15);
    ctx.strokeStyle = merit > 0 ? '#ffe640' : '#d09828';
    ctx.strokeRect(x - txtWidth * 0.5 - 5, y - 9, txtWidth + 10, 15);

    ctx.fillStyle = merit > 0 ? '#ffe640' : '#ffffff';
    ctx.fillText(cleanName, x, y + 3);
  }

  // ==========================================================================
  // 6. HOẠT ẢNH BƯỚC LÊN CẮM NHANG LỄ PHẬT (Incense Walk Cycle 16-bit)
  // ==========================================================================
  drawIncenseOfferings() {
    const now = performance.now();
    for (const [seatIndex, anim] of this.incenseOfferings.entries()) {
      const elapsed = now - anim.startTime;
      if (elapsed >= anim.durationTotal) {
        this.incenseOfferings.delete(seatIndex);
        continue;
      }

      const progress = elapsed / anim.durationTotal;
      let curX = anim.startX;
      let curY = anim.startY;
      let bowOffset = 0;
      let isHoldingIncense = true;

      if (progress < 0.3) {
        // Pha 1: Bước đi lên trước lư hương (0..30%)
        const p1 = progress / 0.3;
        curX = anim.startX + (anim.targetX - anim.startX) * p1;
        curY = anim.startY + (anim.targetY - anim.startY) * p1;
        bowOffset = Math.sin(p1 * Math.PI * 8) * 3; // Nhấp nhô bước chân
      } else if (progress < 0.7) {
        // Pha 2: Dâng nhang & Cúi lạy 3 xá trước tượng Phật (30..70%)
        curX = anim.targetX;
        curY = anim.targetY;
        const p2 = (progress - 0.3) / 0.4;
        bowOffset = Math.sin(p2 * Math.PI * 6) * 6; // 3 nhịp cúi lạy sâu
      } else {
        // Pha 3: Bước lùi về bồ đoàn (70..100%)
        const p3 = (progress - 0.7) / 0.3;
        curX = anim.targetX + (anim.startX - anim.targetX) * p3;
        curY = anim.targetY + (anim.startY - anim.targetY) * p3;
        bowOffset = Math.sin(p3 * Math.PI * 8) * 3;
        isHoldingIncense = false;
      }

      this.ctx.save();
      this.ctx.translate(Math.round(curX), Math.round(curY + bowOffset));
      
      // Vẽ nhân vật
      this.drawCharacterSprite(0, -12, anim.user.skin || 'nam');

      // Cầm 3 nén nhang đỏ bốc khói vàng trên tay
      if (isHoldingIncense) {
        this.ctx.fillStyle = '#dc2626';
        this.ctx.fillRect(-2, -26, 4, 12);
        this.ctx.fillStyle = '#fde047';
        this.ctx.fillRect(-3, -29, 6, 3); // Lửa nhang đỏ vàng
      }

      // Tên nhân vật
      this.drawUserLabel(0, 14, `🙏 ${anim.user.nickname}`, anim.user.meritPoints || 0);
      this.ctx.restore();
    }
  }

  // ==========================================================================
  // 7. SÓNG ÂM CHUÔNG ĐẠI HỒNG CHUNG & HOA SEN NỞ TẶNG QUÀ
  // ==========================================================================
  drawVisualEffects() {
    const ctx = this.ctx;

    // Vòng sóng âm chuông 16-bit
    for (let b = this.bellRings.length - 1; b >= 0; b--) {
      const bell = this.bellRings[b];
      bell.radius += 5.5;
      bell.life -= bell.decay;

      if (bell.life <= 0 || bell.radius >= bell.maxRadius) {
        this.bellRings.splice(b, 1);
        continue;
      }

      ctx.strokeStyle = `rgba(255, 230, 80, ${bell.life * 0.75})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bell.x, bell.y, bell.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Vụ nổ hoa sen vàng tặng quà (Gift Bursts)
    for (let k = this.burstEffects.length - 1; k >= 0; k--) {
      const burst = this.burstEffects[k];
      burst.radius += 1.8;
      burst.life -= burst.decay;

      if (burst.life <= 0) {
        this.burstEffects.splice(k, 1);
        continue;
      }

      // Vẽ cánh sen pixel tỏa ra 8 hướng
      ctx.fillStyle = burst.color;
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        const bx = burst.x + Math.cos(ang) * burst.radius;
        const by = burst.y + Math.sin(ang) * burst.radius;
        ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 5, 5);
      }
    }
  }

  // ==========================================================================
  // 8. HẠT BẦU KHÍ QUYỂN PIXEL (Cánh Sen, Bụi Vàng, Đom Đóm)
  // ==========================================================================
  drawAtmosphereParticles() {
    const ctx = this.ctx;
    const W = this.virtualWidth;
    const H = this.virtualHeight;

    for (const pt of this.particles) {
      pt.y += pt.speedY;
      pt.x += Math.sin(this.time + pt.phase) * pt.speedX;

      if (pt.y > H + 10) {
        pt.y = -10;
        pt.x = Math.random() * W;
      }

      ctx.fillStyle = pt.color;
      ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
    }
  }
}

window.PixelSceneRenderer = PixelSceneRenderer;
