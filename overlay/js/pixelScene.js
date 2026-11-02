/**
 * ============================================================================
 * ENGINE ĐỒ HỌA VÕ HIỆP CỔ PHONG 16-BIT (PixelSceneRenderer - Wuxia Edition)
 * Lấy cảm hứng từ kiệt tác RPG: Hero's Adventure: Road to Passion (Đại Hiệp Lập Chí Truyện)
 * Tái hiện không gian Thiếu Lâm Tự cổ phong, Chibi Wuxia Sprites, Khí công đả tọa,
 * Chân hương nghi ngút và Khinh công dâng lễ Tam Bảo.
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

    this.burstEffects = []; // Vụ nổ hoa sen phước lành
    this.incenseOfferings = new Map(); // seatIndex -> animation state
    this.woodenFishPulse = 0; // 0..1 khi gõ mõ
    this.bellRings = []; // Các vòng sóng âm thiền đạo

    // Hạt khí quyển Cổ Phong (Cánh sen rơi, Chân khí lơ lửng, Tàn nhang bay)
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

    this.ctx.imageSmoothingEnabled = false;
  }

  initAtmosphereParticles() {
    this.particles = [];
    const count = 46;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.virtualWidth,
        y: Math.random() * this.virtualHeight,
        type: i % 4 === 0 ? 'lotus_petal' : (i % 4 === 1 ? 'qi_ember' : (i % 4 === 2 ? 'gold_spark' : 'zen_mist')),
        size: 2 + Math.floor(Math.random() * 3),
        speedY: 0.2 + Math.random() * 0.45,
        speedX: (Math.random() - 0.5) * 0.4,
        phase: Math.random() * Math.PI * 2,
        color: i % 4 === 0 ? '#f878a8' : (i % 4 === 1 ? '#ff7675' : (i % 4 === 2 ? '#fce881' : '#64e3b1'))
      });
    }
  }

  updateSeats(seats, cols = 4, rows = 6) {
    this.seats = seats || [];
    this.gridCols = cols;
    this.gridRows = rows;
    this.totalSeats = (seats && seats.length) ? seats.length : (cols * rows);
  }

  triggerSeatBurst(seatIndex, color = '#fce881') {
    const pos = this.getSeatScreenPosition(seatIndex);
    if (!pos) return;
    this.burstEffects.push({
      x: pos.x,
      y: pos.y,
      radius: 4,
      maxRadius: 46,
      color: color,
      life: 1.0,
      decay: 0.022
    });
  }

  triggerBellRing() {
    this.bellRings.push({
      x: this.virtualWidth * 0.5,
      y: 195,
      radius: 12,
      maxRadius: 380,
      life: 1.0,
      decay: 0.015
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
      user: user || { nickname: 'Hiệp Khách', skin: 'nam' },
      startTime: performance.now(),
      startX: startPos.x,
      startY: startPos.y,
      targetX: this.virtualWidth * 0.5,
      targetY: 340, // Trước Lư Hương Thiếu Lâm
      durationTotal: 8600
    });
  }

  getSeatScreenPosition(index) {
    if (typeof index !== 'number' || index < 0) return null;
    const cols = Math.max(1, this.gridCols || 4);
    const rows = Math.max(1, this.gridRows || 6);

    const row = Math.floor(index / cols);
    const col = index % cols;

    // Phép chiếu phối cảnh hình thang đả tọa Cổ Phong
    const t = rows > 1 ? (row / (rows - 1)) : 0.5;
    const y = 435 + (465 * Math.pow(t, 1.08));

    const rowWidth = this.virtualWidth * (0.64 + 0.32 * t);
    const startX = (this.virtualWidth - rowWidth) * 0.5;
    const stepX = cols > 1 ? (rowWidth / (cols - 1)) : 0;
    const x = startX + col * stepX;

    const depthScale = (0.78 + 0.26 * t) * Math.min(1.0, Math.sqrt(24 / Math.max(24, this.totalSeats)));

    return { x: Math.round(x), y: Math.round(y), scale: depthScale, row, col };
  }

  // ==========================================================================
  // VÒNG LẶP RENDER CHÍNH (RENDER LOOP)
  // ==========================================================================
  animate(currentTime) {
    this.time = currentTime * 0.001;

    if (this.woodenFishPulse > 0) {
      this.woodenFishPulse = Math.max(0, this.woodenFishPulse - 0.05);
    }

    this.ctx.save();
    this.ctx.scale(this.scaleX, this.scaleY);

    // 1. Bình Phong Thủy Mặc & Kiến Trúc Chánh Điện Thiếu Lâm
    this.drawWuxiaTempleBackground();

    // 2. Đại Kim Thân Phật Thích Ca Mâu Ni & Hào Quang Cửu Phẩm
    this.drawWuxiaBuddhaStatue();

    // 3. Bàn Thờ Tam Bảo, Lư Đồng Bát Quái & Khói Trầm Long Quy
    this.drawWuxiaAltarAndIncense();

    // 4. Hàng 3 Vị Thiếu Lâm Cao Tăng (Phương Trượng Đại Sư gõ Mõ Long Ngư)
    this.drawWuxiaHeadMonks();

    // 5. Lưới Bồ Đoàn & Chibi Wuxia Sprites Đả Tọa (24..100 Hiệp Khách)
    this.drawSeatsAndWuxiaMeditators();

    // 6. Hoạt Ảnh Khinh Công Lướt Lên Cắm Nhang (Incense Walk Cycle)
    this.drawIncenseOfferings();

    // 7. Sóng Âm Thiền Đạo & Trận Pháp Hoa Sen Vàng Bùng Nổ
    this.drawVisualEffects();

    // 8. Cánh Sen, Tàn Nhang & Chân Khí Bầu Khí Quyển
    this.drawAtmosphereParticles();

    this.ctx.restore();
    requestAnimationFrame(this.animate);
  }

  // ==========================================================================
  // 1. KIẾN TRÚC THIẾU LÂM TỰ & BÌNH PHONG SƠN THỦY MẶC (Hero's Adventure)
  // ==========================================================================
  drawWuxiaTempleBackground() {
    const ctx = this.ctx;
    const W = this.virtualWidth;
    const H = this.virtualHeight;

    // Không gian Chánh điện cổ kính u trầm
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0c0610');
    bgGrad.addColorStop(0.32, '#1a0d1e');
    bgGrad.addColorStop(0.55, '#281324');
    bgGrad.addColorStop(1, '#150915');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // BỨC BÌNH PHONG SƠN THỦY MẶC KHỔNG LỒ (Giant Ink-Wash Mountain Screen)
    ctx.fillStyle = '#1c101c';
    ctx.fillRect(40, 52, W - 80, 240);
    ctx.strokeStyle = '#8a5c24';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 52, W - 80, 240);

    // Vẽ dãy núi đá thủy mặc cuộn sương mù (Ink Wash Mountains)
    ctx.fillStyle = '#2d1b2b';
    ctx.beginPath();
    ctx.moveTo(42, 288);
    ctx.lineTo(85, 175);
    ctx.lineTo(145, 230);
    ctx.lineTo(210, 140);
    ctx.lineTo(270, 220);
    ctx.lineTo(340, 155);
    ctx.lineTo(410, 240);
    ctx.lineTo(W - 44, 185);
    ctx.lineTo(W - 44, 288);
    ctx.closePath();
    ctx.fill();

    // Vầng trăng tròn mờ ảo sau rặng núi (Zen Full Moon)
    ctx.fillStyle = 'rgba(252, 232, 129, 0.18)';
    ctx.beginPath();
    ctx.arc(W * 0.5, 145, 48, 0, Math.PI * 2);
    ctx.fill();

    // MÁI ĐAO CHÙA CỔ VỌNG NGUYỆT ĐẬM CHẤT KIẾM HIỆP
    ctx.fillStyle = '#4a150e'; // Ngói cổ nâu đỏ sẫm
    ctx.beginPath();
    ctx.moveTo(8, 75);
    ctx.lineTo(75, 45);
    ctx.lineTo(W - 75, 45);
    ctx.lineTo(W - 8, 75);
    ctx.lineTo(W - 36, 102);
    ctx.lineTo(36, 102);
    ctx.closePath();
    ctx.fill();

    // Viền ngói thếp vàng & Xà gồ chạm trổ
    ctx.fillStyle = '#c58c1b';
    ctx.fillRect(32, 98, W - 64, 5);
    ctx.fillRect(70, 43, W - 140, 4);

    // Hai đầu đao cong vút hình phượng vũ lượn mây
    this.drawWuxiaRoofRidge(6, 70, true);
    this.drawWuxiaRoofRidge(W - 22, 70, false);

    // HAI CỘT GỖ LIM NGUYÊN KHỐI CHẠM RỒNG VÀNG
    ctx.fillStyle = '#2c1208';
    ctx.fillRect(16, 102, 32, 485);
    ctx.fillRect(W - 48, 102, 32, 485);

    // Khắc câu đối Thiếu Lâm chữ vàng thếp ngọc
    ctx.fillStyle = '#c58c1b';
    ctx.fillRect(20, 108, 24, 6);
    ctx.fillRect(W - 44, 108, 24, 6);
    this.drawWuxiaCouplet(24, 138, ['BỒ', 'ĐỀ', 'BẢN', 'VÔ', 'THỤ']);
    this.drawWuxiaCouplet(W - 40, 138, ['MINH', 'KÍNH', 'DIỆC', 'PHI', 'ĐÀI']);

    // Rèm Gấm Lụa Vàng buông rủ 2 bên chánh điện
    ctx.fillStyle = 'rgba(229, 179, 56, 0.22)';
    ctx.fillRect(48, 102, 14, 250);
    ctx.fillRect(W - 62, 102, 14, 250);

    // HAI CHẬU BONSAI TÙNG BÁCH CỔ PHONG HAI BÊN BỆ ĐIỆN
    this.drawBonsaiPine(64, 308);
    this.drawBonsaiPine(W - 88, 308);

    // NỀN ĐÁ BÁT TRÀNG PHỐI CẢNH ĐA TẦNG
    ctx.fillStyle = '#1c0f1b';
    ctx.fillRect(0, 412, W, H - 412);

    // Các đường gân gạch cổ phong 16-bit
    ctx.strokeStyle = '#2d182a';
    ctx.lineWidth = 2;
    for (let y = 435; y < H; y += 38) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (let x = 35; x < W; x += 62) {
      ctx.beginPath();
      ctx.moveTo(x, 420);
      ctx.lineTo(x * 1.34 - W * 0.17, H);
      ctx.stroke();
    }
  }

  drawWuxiaRoofRidge(x, y, isLeft) {
    const ctx = this.ctx;
    ctx.fillStyle = '#fce881';
    const dir = isLeft ? -1 : 1;
    ctx.fillRect(x, y, 16, 6);
    ctx.fillRect(x + dir * 6, y - 8, 10, 8);
    ctx.fillRect(x + dir * 12, y - 16, 6, 8);
    // Hạt châu đỉnh ngói
    ctx.fillStyle = '#b82b1c';
    ctx.fillRect(x + dir * 13, y - 22, 5, 5);
  }

  drawWuxiaCouplet(x, startY, words) {
    const ctx = this.ctx;
    ctx.font = 'bold 13px "VT323", "Noto Serif", serif';
    ctx.textAlign = 'center';
    words.forEach((w, i) => {
      ctx.fillStyle = '#fce881';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(w, x + 8, startY + i * 26);
      ctx.shadowBlur = 0;
    });
  }

  drawBonsaiPine(x, y) {
    const ctx = this.ctx;
    // Chậu gốm men lam
    ctx.fillStyle = '#203a48';
    ctx.fillRect(x + 4, y + 26, 20, 12);
    ctx.fillStyle = '#e5b338';
    ctx.fillRect(x + 2, y + 24, 24, 3);

    // Thân cây tùng gồ ghề
    ctx.fillStyle = '#3e2010';
    ctx.fillRect(x + 12, y + 10, 5, 16);
    ctx.fillRect(x + 8, y + 14, 12, 4);

    // Tán lá kim xanh ngọc
    ctx.fillStyle = '#1c6846';
    ctx.fillRect(x - 2, y + 6, 14, 8);
    ctx.fillRect(x + 10, y + 2, 16, 9);
    ctx.fillRect(x + 4, y - 2, 16, 8);
  }

  // ==========================================================================
  // 2. ĐẠI KIM THÂN ĐỨC PHẬT & HÀO QUANG CỬU PHẨM (Hero's Adventure Gold Buddha)
  // ==========================================================================
  drawWuxiaBuddhaStatue() {
    const ctx = this.ctx;
    const cx = this.virtualWidth * 0.5;
    const cy = 205;

    // 1. Hào Quang Cửu Phẩm Kim Quang (9 Tầng Ánh Sáng Chân Khí)
    const haloRadius = 72 + Math.sin(this.time * 2.5) * 6;
    for (let r = 5; r >= 1; r--) {
      const rad = (haloRadius / 5) * r;
      const alpha = 0.08 + (5 - r) * 0.06;
      ctx.fillStyle = `rgba(252, 232, 129, ${alpha})`;
      ctx.beginPath();
      ctx.arc(cx, cy - 24, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8 Điểm Kim Quang Tinh Tú xoay quanh hào quang
    const rot = this.time * 0.5;
    ctx.fillStyle = '#fce881';
    for (let i = 0; i < 8; i++) {
      const ang = rot + (i * Math.PI / 4);
      const kx = cx + Math.cos(ang) * (haloRadius + 15);
      const ky = (cy - 24) + Math.sin(ang) * (haloRadius + 15);
      ctx.fillRect(Math.round(kx) - 2, Math.round(ky) - 2, 5, 5);
    }

    // 2. Cửu Phẩm Liên Hoa Đài (Tòa Sen Cổ Phong Uy Nghiêm)
    ctx.fillStyle = '#7a4f08'; // Đáy bệ sen bát giác
    ctx.fillRect(cx - 56, cy + 50, 112, 20);
    ctx.fillStyle = '#c58c1b';
    ctx.fillRect(cx - 48, cy + 38, 96, 14);

    // Cánh hoa sen hồng ngọc dát vàng
    for (let k = -4; k <= 4; k++) {
      ctx.fillStyle = '#b82b1c';
      ctx.fillRect(cx + k * 12 - 6, cy + 28, 12, 14);
      ctx.fillStyle = '#fce881';
      ctx.fillRect(cx + k * 12 - 4, cy + 29, 8, 4);
    }

    // 3. Đại Kim Thân Đức Phật Thích Ca (Phong cách tượng vàng đồ sộ)
    // Thân y áo cà sa vàng óng
    ctx.fillStyle = '#d49818';
    ctx.fillRect(cx - 35, cy - 4, 70, 42);
    ctx.fillStyle = '#fce881'; // Vạt áo vắt chéo thêu viền
    ctx.fillRect(cx - 18, cy, 36, 38);

    // Hai cánh tay kiết ấn thiền định (Thiền Định Ấn)
    ctx.fillStyle = '#c58c1b';
    ctx.fillRect(cx - 44, cy + 8, 16, 28);
    ctx.fillRect(cx + 28, cy + 8, 16, 28);
    ctx.fillStyle = '#fce881'; // Bàn tay kết ấn
    ctx.fillRect(cx - 16, cy + 24, 32, 12);

    // 4. Kim Dung & Nhục Kế Ushnisha
    ctx.fillStyle = '#fce881';
    ctx.fillRect(cx - 20, cy - 34, 40, 32);
    // Vành tai dài Phật tướng
    ctx.fillRect(cx - 24, cy - 28, 4, 22);
    ctx.fillRect(cx + 20, cy - 28, 4, 22);

    // Mắt khép hờ từ bi
    ctx.fillStyle = '#4a2608';
    ctx.fillRect(cx - 14, cy - 20, 9, 2);
    ctx.fillRect(cx + 5, cy - 20, 9, 2);
    // Bạch Hào châu ngọc giữa trán
    ctx.fillStyle = '#b82b1c';
    ctx.fillRect(cx - 1, cy - 26, 3, 3);

    // Tóc xoắn ốc xanh biếc & Nhục kế trên đỉnh đầu
    ctx.fillStyle = '#18243b';
    ctx.fillRect(cx - 20, cy - 40, 40, 8);
    ctx.fillRect(cx - 9, cy - 47, 18, 8);
  }

  // ==========================================================================
  // 3. BÀN THỜ TAM BẢO, LƯ ĐỒNG BÁT QUÁI & KHÓI TRẦM LONG QUY
  // ==========================================================================
  drawWuxiaAltarAndIncense() {
    const ctx = this.ctx;
    const cx = this.virtualWidth * 0.5;
    const ay = 285;

    // Bàn thờ gỗ trắc đỏ sơn son nẹp đồng
    ctx.fillStyle = '#4a150e';
    ctx.fillRect(cx - 78, ay, 156, 48);
    ctx.fillStyle = '#c58c1b';
    ctx.fillRect(cx - 82, ay - 2, 164, 6);
    ctx.fillRect(cx - 72, ay + 40, 144, 5);

    // Hoa văn Bát Quái vàng giữa bàn thờ
    ctx.fillStyle = '#fce881';
    ctx.fillRect(cx - 8, ay + 14, 16, 16);
    ctx.fillStyle = '#4a150e';
    ctx.fillRect(cx - 5, ay + 17, 10, 10);

    // Đĩa hoa sen cúng Phật & Chén trà ngọc
    ctx.fillStyle = '#f878a8';
    ctx.fillRect(cx - 62, ay - 11, 18, 9);
    ctx.fillStyle = '#2ea879'; // Chén ngọc lưu ly
    ctx.fillRect(cx + 44, ay - 10, 18, 8);

    // LƯ ĐỒNG BÁT QUÁI TAM TÚC UY NGHIÊM
    ctx.fillStyle = '#8a5c18';
    ctx.fillRect(cx - 22, ay - 18, 44, 24);
    ctx.fillStyle = '#fce881';
    ctx.fillRect(cx - 26, ay - 20, 52, 5); // Miệng lư
    // 3 chân quỳ lư hương
    ctx.fillStyle = '#5c3a08';
    ctx.fillRect(cx - 18, ay + 6, 8, 8);
    ctx.fillRect(cx + 10, ay + 6, 8, 8);

    // BA NÉN CHÂN HƯƠNG ĐỎ THẪM
    ctx.fillStyle = '#b82b1c';
    ctx.fillRect(cx - 8, ay - 38, 2, 20);
    ctx.fillRect(cx - 1, ay - 44, 2, 26);
    ctx.fillRect(cx + 6, ay - 38, 2, 20);

    // Đầu nhang rực lửa Chân khí
    const firePulse = (Math.sin(this.time * 8) + 1) * 0.5;
    ctx.fillStyle = firePulse > 0.4 ? '#ff7675' : '#fce881';
    ctx.fillRect(cx - 9, ay - 40, 4, 3);
    ctx.fillRect(cx - 2, ay - 46, 4, 3);
    ctx.fillRect(cx + 5, ay - 40, 4, 3);

    // LÀN KHÓI TRẦM LONG QUY CUỘN SÓNG (Wuxia Dragon Smoke)
    ctx.fillStyle = 'rgba(252, 240, 215, 0.45)';
    for (let s = 0; s < 20; s++) {
      const sy = ay - 50 - (s * 8);
      const wave = Math.sin(this.time * 2.8 + s * 0.42) * (7 + s * 1.3);
      const smokeW = 4 + Math.floor(s * 0.75);
      ctx.fillRect(Math.round(cx + wave - smokeW * 0.5), Math.round(sy), smokeW, 5);
    }
  }

  // ==========================================================================
  // 4. HÀNG 3 VỊ THIẾU LÂM CAO TĂNG (Phương Trượng Đại Sư gõ Mõ Long Ngư)
  // ==========================================================================
  drawWuxiaHeadMonks() {
    const ctx = this.ctx;
    const W = this.virtualWidth;
    const monkY = 370;

    // Phương Trượng Đại Sư ở giữa
    this.drawShaolinAbbotSprite(W * 0.5, monkY, 'Phương Trượng Đại Sư');

    // Thầy Minh Đạo bên trái (Chấp Chưởng Giới Luật)
    this.drawShaolinMonkSprite(W * 0.23, monkY, 'Thầy Minh Đạo');

    // Thầy Tâm Từ bên phải (Chấp Chưởng Tạng Kinh)
    this.drawShaolinMonkSprite(W * 0.77, monkY, 'Thầy Tâm Từ');
  }

  drawShaolinAbbotSprite(x, y, label) {
    const ctx = this.ctx;
    const breath = Math.sin(this.time * 2.2) * 1.6;
    const drawY = Math.round(y + breath);

    // Bồ đoàn gấm đỏ thêu hoa sen vàng
    ctx.fillStyle = '#4a150e';
    ctx.fillRect(x - 26, drawY + 24, 52, 13);
    ctx.fillStyle = '#c58c1b';
    ctx.fillRect(x - 22, drawY + 22, 44, 4);

    // Cà sa Đại Tổ thêu kim tuyến (Đỏ son + Vàng rực)
    ctx.fillStyle = '#b82b1c';
    ctx.fillRect(x - 20, drawY - 6, 40, 30);
    ctx.fillStyle = '#fce881';
    ctx.fillRect(x - 9, drawY, 18, 24);

    // Chuỗi tràng hạt Bồ Đề 108 hạt vắt qua ngực
    ctx.fillStyle = '#5c3a08';
    ctx.fillRect(x - 12, drawY - 2, 24, 4);

    // Đầu Phương Trượng cạo trọc uy nghiêm, râu dài bạc phơ
    ctx.fillStyle = '#fce881';
    ctx.fillRect(x - 12, drawY - 28, 24, 23);
    // Vành tai phúc hậu
    ctx.fillRect(x - 14, drawY - 22, 2, 13);
    ctx.fillRect(x + 12, drawY - 22, 2, 13);
    // Chòm râu bạc dài uy đức
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 4, drawY - 9, 8, 12);
    ctx.fillRect(x - 2, drawY + 3, 4, 6);

    // Mắt khép thiền
    ctx.fillStyle = '#4a2608';
    ctx.fillRect(x - 8, drawY - 16, 5, 2);
    ctx.fillRect(x + 3, drawY - 16, 5, 2);

    // ĐẠI MỘC NGƯ (Mõ Gỗ Long Ngư chạm cá hóa rồng)
    ctx.fillStyle = '#5c2208';
    ctx.fillRect(x - 12, drawY + 12, 24, 15);
    ctx.fillStyle = '#c58c1b';
    ctx.fillRect(x - 9, drawY + 14, 18, 9);

    // Dùi mõ gõ theo nhịp
    const strike = this.woodenFishPulse > 0.1 ? 6 : 0;
    ctx.fillStyle = '#fce881';
    ctx.fillRect(x + 14, drawY + 6 + strike, 6, 6);
    ctx.fillStyle = '#c58c1b';
    ctx.fillRect(x + 7, drawY + 10 + strike, 9, 3);

    // Nốt nhạc Chân Khí bay lên khi gõ mõ
    if (this.woodenFishPulse > 0.2) {
      ctx.fillStyle = '#fce881';
      ctx.font = '16px "VT323", monospace';
      ctx.fillText('♫', x - 16, drawY - 6 - this.woodenFishPulse * 18);
    }

    // Thẻ Tên Gỗ Trắc Cổ Phong
    this.drawWuxiaMonkLabel(x, drawY + 37, label);
  }

  drawShaolinMonkSprite(x, y, label) {
    const ctx = this.ctx;
    const breath = Math.sin(this.time * 2.2 + 1.2) * 1.5;
    const drawY = Math.round(y + breath);

    // Bồ đoàn
    ctx.fillStyle = '#4a150e';
    ctx.fillRect(x - 22, drawY + 24, 44, 12);
    ctx.fillStyle = '#c58c1b';
    ctx.fillRect(x - 18, drawY + 22, 36, 4);

    // Cà sa vàng đất nung
    ctx.fillStyle = '#c58c1b';
    ctx.fillRect(x - 18, drawY - 4, 36, 28);
    ctx.fillStyle = '#7a4f08';
    ctx.fillRect(x - 8, drawY + 2, 16, 22);

    // Hai tay chắp chữ thập niệm kinh
    ctx.fillStyle = '#fce881';
    ctx.fillRect(x - 5, drawY + 4, 10, 10);

    // Đầu Sư Thầy
    ctx.fillStyle = '#fce881';
    ctx.fillRect(x - 11, drawY - 26, 22, 22);
    ctx.fillStyle = '#4a2608';
    ctx.fillRect(x - 7, drawY - 14, 5, 2);
    ctx.fillRect(x + 2, drawY - 14, 5, 2);

    this.drawWuxiaMonkLabel(x, drawY + 37, label);
  }

  drawWuxiaMonkLabel(x, y, text) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(28, 12, 30, 0.92)';
    ctx.fillRect(x - 44, y, 88, 17);
    ctx.strokeStyle = '#c58c1b';
    ctx.strokeRect(x - 44, y, 88, 17);

    ctx.fillStyle = '#fce881';
    ctx.font = '12px "VT323", "Noto Serif", serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y + 13);
  }

  // ==========================================================================
  // 5. CHIBI WUXIA SPRITES ĐẢ TỌA & TRẬN PHÁP BÁT QUÁI (Hero's Adventure Style)
  // ==========================================================================
  drawSeatsAndWuxiaMeditators() {
    const total = this.totalSeats || 24;

    for (let i = 0; i < total; i++) {
      const pos = this.getSeatScreenPosition(i);
      if (!pos) continue;

      const seat = this.seats[i];
      const isOccupied = seat && seat.occupied && seat.user;
      
      if (this.incenseOfferings.has(i)) continue;

      this.drawSingleWuxiaSeat(pos.x, pos.y, pos.scale, seat, isOccupied, i);
    }
  }

  drawSingleWuxiaSeat(x, y, scale, seat, isOccupied, seatIndex) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // 1. Bồ Đoàn Thiền Tọa Cổ Phong
    ctx.fillStyle = isOccupied ? '#5c2208' : '#2a121f';
    ctx.fillRect(-23, -6, 46, 14);
    ctx.fillStyle = isOccupied ? '#c58c1b' : '#3e1a2f';
    ctx.fillRect(-19, -8, 38, 4);

    // 2. Trận Pháp Bát Quái / Chân Khí Hoa Sen (Khi đã cúng dường có điểm công đức)
    if (isOccupied && seat.user.meritPoints > 0) {
      const rot = this.time * 2 + seatIndex;
      ctx.strokeStyle = '#fce881';
      ctx.lineWidth = 2;
      ctx.strokeRect(-28, -34, 56, 44);

      // 4 Tia Chân Khí ngọc bích 4 góc
      ctx.fillStyle = '#64e3b1';
      ctx.fillRect(-30, -36, 4, 4);
      ctx.fillRect(26, -36, 4, 4);
      ctx.fillRect(-30, 8, 4, 4);
      ctx.fillRect(26, 8, 4, 4);
    }

    // 3. Nhân vật Chibi Kiếm Hiệp Đả Tọa (Chibi Wuxia Sprite)
    if (isOccupied) {
      const user = seat.user;
      const breath = Math.sin(this.time * 2.4 + seatIndex * 0.7) * 1.5;
      this.drawChibiWuxiaSprite(0, Math.round(-12 + breath), user.skin || 'nam');

      // Luồng Chân Khí Tam Hoa Tụ Đỉnh (Qi breath from head)
      if (seat.user.meritPoints > 0) {
        ctx.fillStyle = 'rgba(252, 232, 129, 0.45)';
        const qiY = -34 + Math.sin(this.time * 4 + seatIndex) * 3;
        ctx.fillRect(-2, qiY, 4, 4);
      }

      // Thẻ Tên Hiệp Khách Cổ Phong
      this.drawWuxiaUserLabel(0, 15, user.nickname || 'Hiệp Khách', user.meritPoints);
    } else {
      // Ghế trống
      ctx.fillStyle = '#633955';
      ctx.font = '12px "VT323", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${seatIndex + 1}`, 0, 4);
    }

    ctx.restore();
  }

  // ==========================================================================
  // BỘ TẠO SPRITE CHIBI WUXIA 16-BIT (HERO'S ADVENTURE CHARACTER ENGINE)
  // ==========================================================================
  drawChibiWuxiaSprite(cx, cy, skin) {
    const ctx = this.ctx;
    const p = this.getWuxiaPalette(skin);

    // 1. Thân Áo Bào Kiếm Hiệp Ngồi Xếp Bằng Đả Tọa (Giao Lĩnh Áo Chéo)
    ctx.fillStyle = p.robe;
    ctx.fillRect(cx - 16, cy - 2, 32, 20); // Vạt áo bào
    ctx.fillStyle = p.inner;
    ctx.fillRect(cx - 6, cy + 2, 12, 16); // Vạt trong cổ chéo
    // Đai lưng hiệp khách (Waist Sash)
    ctx.fillStyle = p.sash || '#c58c1b';
    ctx.fillRect(cx - 15, cy + 5, 30, 4);

    // Hai bàn tay kiết ấn đặt lên gối đả tọa
    ctx.fillStyle = p.skinTone;
    ctx.fillRect(cx - 14, cy + 7, 6, 6);
    ctx.fillRect(cx + 8, cy + 7, 6, 6);

    // 2. Khuôn Mặt Chibi Kiếm Hiệp 16-bit
    ctx.fillStyle = p.skinTone;
    ctx.fillRect(cx - 10, cy - 20, 20, 18);

    // Mắt to Chibi nhắm mắt tĩnh tâm
    ctx.fillStyle = '#2c1404';
    ctx.fillRect(cx - 7, cy - 11, 4, 2);
    ctx.fillRect(cx + 3, cy - 11, 4, 2);

    // 3. Tóc Búi / Mũ Nón / Phụ Kiện Theo Môn Phái Wuxia
    this.drawWuxiaAccessory(cx, cy, skin, p);
  }

  getWuxiaPalette(skin) {
    const palettes = {
      nam: { robe: '#4a5b6d', inner: '#d1d8e0', sash: '#c58c1b', skinTone: '#ffd9a0' },
      nu: { robe: '#dff9fb', inner: '#c7ecee', sash: '#f878a8', skinTone: '#ffe4c4' },
      su: { robe: '#d69e2e', inner: '#7a4f08', sash: '#b82b1c', skinTone: '#ffd9a0' },
      tieu: { robe: '#b7791f', inner: '#fce881', sash: '#7a4f08', skinTone: '#ffd9a0' },
      ni: { robe: '#c09b52', inner: '#e2e8f0', sash: '#7a4f08', skinTone: '#ffe4c4' },
      caotang: { robe: '#b82b1c', inner: '#fce881', sash: '#fce881', skinTone: '#ffd9a0' },
      sen: { robe: '#f687b3', inner: '#fff5f7', sash: '#fce881', skinTone: '#ffe4c4' },
      vang: { robe: '#e5b338', inner: '#ffffff', sash: '#b82b1c', skinTone: '#ffd9a0' },
      canhsat: { robe: '#1f3d28', inner: '#fce881', sash: '#b82b1c', skinTone: '#ffd9a0' }, // Cẩm Y Vệ
      bacsi: { robe: '#f8fafc', inner: '#b82b1c', sash: '#2ea879', skinTone: '#ffd9a0' },   // Thần Y
      trom: { robe: '#1a1824', inner: '#4a445a', sash: '#b82b1c', skinTone: '#ffd9a0' },    // Dạ Hành Đạo Tặc
      heo: { robe: '#f472b6', inner: '#fbcfe8', sash: '#fce881', skinTone: '#fbcfe8' },
      bo: { robe: '#f8fafc', inner: '#1e293b', sash: '#c58c1b', skinTone: '#ffd9a0' },
      ga: { robe: '#facc15', inner: '#ef4444', sash: '#b82b1c', skinTone: '#ffd9a0' },
      hocsinh: { robe: '#f5f6fa', inner: '#b82b1c', sash: '#273c75', skinTone: '#ffd9a0' }, // Thư Sinh Tầm Đạo
      duccha: { robe: '#0f172a', inner: '#ffffff', sash: '#c58c1b', skinTone: '#ffd9a0' },   // Tây Vực Giáo Sĩ
      thantai: { robe: '#b82b1c', inner: '#fce881', sash: '#fce881', skinTone: '#ffd9a0' },  // Tài Thần Gia
      ninja: { robe: '#181232', inner: '#3c2e74', sash: '#b82b1c', skinTone: '#ffd9a0' },    // Nhẫn Giả Đông Doanh
      congchua: { robe: '#fbcfe8', inner: '#f472b6', sash: '#fce881', skinTone: '#ffe4c4' } // Quận Chúa
    };
    return palettes[skin] || palettes.nam;
  }

  drawWuxiaAccessory(cx, cy, skin, p) {
    const ctx = this.ctx;

    switch (skin) {
      case 'nam': // Búi tóc kiếm khách + Trâm cài
        ctx.fillStyle = '#1c1208';
        ctx.fillRect(cx - 10, cy - 22, 20, 5);
        ctx.fillRect(cx - 4, cy - 28, 8, 7); // Búi tóc cao
        ctx.fillStyle = '#c58c1b'; // Trâm cài ngọc
        ctx.fillRect(cx - 7, cy - 25, 14, 2);
        break;
      case 'nu': // Tóc dài cài trâm hoa sen ngọc
        ctx.fillStyle = '#1c1208';
        ctx.fillRect(cx - 10, cy - 22, 20, 5);
        ctx.fillRect(cx - 12, cy - 14, 3, 14); // Lọn tóc thả hai bên
        ctx.fillRect(cx + 9, cy - 14, 3, 14);
        ctx.fillStyle = '#2ea879'; // Trâm phỉ thúy
        ctx.fillRect(cx + 4, cy - 25, 4, 4);
        break;
      case 'canhsat': // Mũ Cẩm Y Vệ (Phi Ngư Mạo)
        ctx.fillStyle = '#1a1418';
        ctx.fillRect(cx - 11, cy - 27, 22, 9);
        ctx.fillStyle = '#fce881';
        ctx.fillRect(cx - 3, cy - 25, 6, 4);
        break;
      case 'bacsi': // Thần Y: Khăn quấn trán & Bầu hồ lô thuốc
        ctx.fillStyle = '#2ea879';
        ctx.fillRect(cx - 10, cy - 23, 20, 4);
        // Hồ lô bên hông
        ctx.fillStyle = '#e5b338';
        ctx.fillRect(cx + 12, cy + 3, 5, 7);
        break;
      case 'trom': // Khăn trùm mặt Dạ Hành
        ctx.fillStyle = '#0d0914';
        ctx.fillRect(cx - 10, cy - 24, 20, 7);
        ctx.fillRect(cx - 10, cy - 7, 20, 6);
        break;
      case 'thantai': // Mũ cánh chuồn Tài Thần mạ vàng
        ctx.fillStyle = '#b82b1c';
        ctx.fillRect(cx - 11, cy - 27, 22, 8);
        ctx.fillStyle = '#fce881';
        ctx.fillRect(cx - 18, cy - 23, 7, 3);
        ctx.fillRect(cx + 11, cy - 23, 7, 3);
        break;
      case 'ninja': // Băng trán nhẫn giả & Thanh kiếm sau lưng
        ctx.fillStyle = '#3c2e74';
        ctx.fillRect(cx - 10, cy - 22, 20, 4);
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(cx - 3, cy - 22, 6, 4);
        break;
      case 'congchua': // Phượng miện đính ngọc châu
        ctx.fillStyle = '#fce881';
        ctx.fillRect(cx - 8, cy - 26, 16, 6);
        ctx.fillStyle = '#b82b1c';
        ctx.fillRect(cx - 2, cy - 29, 4, 4);
        break;
      case 'su':
      case 'tieu':
      case 'caotang':
      case 'ni':
        // Đầu cạo trọc Thiếu Lâm
        break;
      default:
        ctx.fillStyle = '#1c1208';
        ctx.fillRect(cx - 9, cy - 22, 18, 4);
        ctx.fillRect(cx - 4, cy - 26, 8, 5);
        break;
    }
  }

  drawWuxiaUserLabel(x, y, name, merit) {
    const ctx = this.ctx;
    ctx.font = '13.5px "VT323", "Noto Serif", serif';
    ctx.textAlign = 'center';

    const cleanName = name.length > 12 ? (name.substring(0, 11) + '…') : name;
    const txtWidth = ctx.measureText(cleanName).width;

    // Khung nhãn bài ngọc bích / thẻ gỗ
    ctx.fillStyle = merit > 0 ? 'rgba(38, 16, 44, 0.94)' : 'rgba(20, 10, 24, 0.9)';
    ctx.fillRect(x - txtWidth * 0.5 - 6, y - 9, txtWidth + 12, 16);
    ctx.strokeStyle = merit > 0 ? '#fce881' : '#c58c1b';
    ctx.strokeRect(x - txtWidth * 0.5 - 6, y - 9, txtWidth + 12, 16);

    ctx.fillStyle = merit > 0 ? '#fce881' : '#fffdf5';
    ctx.fillText(cleanName, x, y + 3);
  }

  // ==========================================================================
  // 6. KHINH CÔNG LƯỚT LÊN CẮM NHANG (Wuxia Incense Offering Walk Cycle)
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

      if (progress < 0.28) {
        // Pha 1: Thi triển khinh công lướt tới trước lư hương (0..28%)
        const p1 = progress / 0.28;
        curX = anim.startX + (anim.targetX - anim.startX) * p1;
        curY = anim.startY + (anim.targetY - anim.startY) * p1;
        bowOffset = Math.sin(p1 * Math.PI * 6) * 4; // Nhấp nhô khinh công
      } else if (progress < 0.72) {
        // Pha 2: Dâng nhang & Cúi đầu 3 bái tạ ơn Tam Bảo (28..72%)
        curX = anim.targetX;
        curY = anim.targetY;
        const p2 = (progress - 0.28) / 0.44;
        bowOffset = Math.sin(p2 * Math.PI * 6) * 7; // 3 nhịp bái sâu
      } else {
        // Pha 3: Thi triển lùi bước khinh công về bồ đoàn (72..100%)
        const p3 = (progress - 0.72) / 0.28;
        curX = anim.targetX + (anim.startX - anim.targetX) * p3;
        curY = anim.targetY + (anim.startY - anim.targetY) * p3;
        bowOffset = Math.sin(p3 * Math.PI * 6) * 4;
        isHoldingIncense = false;
      }

      this.ctx.save();
      this.ctx.translate(Math.round(curX), Math.round(curY + bowOffset));
      
      // Vẽ nhân vật
      this.drawChibiWuxiaSprite(0, -12, anim.user.skin || 'nam');

      // Cầm 3 nén chân hương bốc khói rực lửa
      if (isHoldingIncense) {
        this.ctx.fillStyle = '#b82b1c';
        this.ctx.fillRect(-2, -28, 4, 14);
        this.ctx.fillStyle = '#fce881';
        this.ctx.fillRect(-3, -31, 6, 4);
      }

      this.drawWuxiaUserLabel(0, 15, `🙏 ${anim.user.nickname}`, anim.user.meritPoints || 0);
      this.ctx.restore();
    }
  }

  // ==========================================================================
  // 7. SÓNG ÂM THIỀN ĐẠO & TRẬN PHÁP HOA SEN BÙNG NỔ
  // ==========================================================================
  drawVisualEffects() {
    const ctx = this.ctx;

    // Vòng sóng âm Đại Hồng Chung lan tỏa
    for (let b = this.bellRings.length - 1; b >= 0; b--) {
      const bell = this.bellRings[b];
      bell.radius += 6.0;
      bell.life -= bell.decay;

      if (bell.life <= 0 || bell.radius >= bell.maxRadius) {
        this.bellRings.splice(b, 1);
        continue;
      }

      ctx.strokeStyle = `rgba(252, 232, 129, ${bell.life * 0.8})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bell.x, bell.y, bell.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Hoa sen vàng bùng nổ khi được cúng dường (Gift Burst)
    for (let k = this.burstEffects.length - 1; k >= 0; k--) {
      const burst = this.burstEffects[k];
      burst.radius += 2.0;
      burst.life -= burst.decay;

      if (burst.life <= 0) {
        this.burstEffects.splice(k, 1);
        continue;
      }

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
  // 8. HẠT KHÍ QUYỂN CỔ PHONG (Cánh Sen, Chân Khí, Tàn Nhang)
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
