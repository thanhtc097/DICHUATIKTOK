/**
 * ============================================================================
 * PIXEL APP — KẾT NỐI SOCKET.IO & ĐIỀU PHỐI HUD PHONG CÁCH VÕ HIỆP CỔ PHONG
 * Hero's Adventure: Road to Passion (Đại Hiệp Lập Chí Truyện Style)
 * ============================================================================
 */

(function () {
  const socket = io();

  // Khởi tạo Audio Engine & Pixel Scene Renderer
  const audio = window.templeAudio || new TempleAudioEngine();
  window.templeAudio = audio;

  const scene = new PixelSceneRenderer();
  window.pixelScene = scene;

  // DOM Elements
  const bannerTitle = document.getElementById('banner-title');
  const bannerSubtitle = document.getElementById('banner-subtitle');
  const seatCounter = document.getElementById('seat-counter');
  const sessionTimer = document.getElementById('session-timer');
  const meritContainer = document.getElementById('merit-list-container');
  const chantToast = document.getElementById('chant-toast');
  const chantToastTitle = document.getElementById('chant-toast-title');
  const chantToastText = document.getElementById('chant-toast-text');
  const btnUnlockAudio = document.getElementById('btn-unlock-audio');
  const btnTestBell = document.getElementById('btn-test-bell');
  const btnTestChant = document.getElementById('btn-test-chant');

  let sessionStartTime = Date.now() - 45000;
  let toastTimeout = null;

  // Mở khóa âm thanh Web Audio API khi người dùng click
  function unlockAudio() {
    if (audio) {
      if (!audio.ctx) {
        audio.initContext();
      } else if (audio.ctx.state === 'suspended') {
        audio.ctx.resume().catch(() => {});
      }
      audio.unlocked = true;
      if (btnUnlockAudio) {
        btnUnlockAudio.textContent = '🔊 ĐÃ BẬT ÂM';
        btnUnlockAudio.classList.remove('active-pulse');
      }
    }
  }

  window.addEventListener('click', unlockAudio);
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  if (btnUnlockAudio) {
    btnUnlockAudio.addEventListener('click', e => {
      e.stopPropagation();
      unlockAudio();
      audio.playTempleBell(0.95);
      scene.triggerBellRing();
    });
  }

  if (btnTestBell) {
    btnTestBell.addEventListener('click', e => {
      e.stopPropagation();
      unlockAudio();
      audio.playTempleBell(1.0);
      scene.triggerBellRing();
    });
  }

  if (btnTestChant) {
    btnTestChant.addEventListener('click', e => {
      e.stopPropagation();
      unlockAudio();
      fetch('/api/chant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }).catch(err => console.error(err));
    });
  }

  // Cập nhật danh sách Bảng Phước Duyên bên phải
  function renderMeritList(meritList = []) {
    if (!meritContainer) return;
    if (!meritList || meritList.length === 0) {
      meritContainer.innerHTML = '<div class="merit-empty">Chưa có</div>';
      return;
    }

    meritContainer.innerHTML = meritList.slice(0, 6).map(item => `
      <div class="merit-item">
        <span class="merit-item-name">🙏 ${escapeHtml(item.nickname)}</span>
        <span class="merit-item-pts">+${item.points}</span>
      </div>
    `).join('');
  }

  // Hiển thị hộp thoại Sớ Vàng Cuộn Trục Cổ Phong
  function showChantToast(title, text, durationMs = 9500) {
    if (!chantToast) return;
    if (chantToastTitle) chantToastTitle.textContent = title || '✦ VẠN CỔ THIỀN DUYÊN ✦';
    if (chantToastText) chantToastText.textContent = text || '';
    chantToast.classList.remove('hidden');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      chantToast.classList.add('hidden');
    }, durationMs);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Đồng hồ đếm thời gian phiên thiền (Võ Lâm Thì Khắc)
  setInterval(() => {
    if (!sessionTimer) return;
    const elapsedSec = Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000));
    const hrs = String(Math.floor(elapsedSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
    const secs = String(elapsedSec % 60).padStart(2, '0');
    sessionTimer.textContent = `${hrs}:${mins}:${secs}`;
  }, 1000);

  // ==========================================================================
  // LẮNG NGHE SỰ KIỆN TỪ NODE.JS BACKEND (SOCKET.IO)
  // ==========================================================================
  socket.on('state_update', state => {
    if (!state) return;
    if (state.sessionStartTime) {
      sessionStartTime = state.sessionStartTime - 45000;
    }
    if (seatCounter) {
      seatCounter.textContent = `${state.occupiedCount}/${state.totalSeats}`;
    }
    if (state.voiceConfig && audio) {
      audio.updateConfig(state.voiceConfig);
    }
    if (state.seats) {
      scene.updateSeats(state.seats, state.gridCols, state.gridRows);
    }
    renderMeritList(state.meritList);
  });

  socket.on('seat_event', evt => {
    if (!evt) return;
    if (typeof evt.seatIndex === 'number') {
      scene.triggerSeatBurst(evt.seatIndex, '#fce881');

      // Khi người xem bình luận "adidaphat" khinh công lên cắm nhang lễ Phật
      if (evt.isIncenseOffering || evt.action === 'offer_incense') {
        const u = (evt.seat && evt.seat.user) ? evt.seat.user : { nickname: 'Hiệp Khách', skin: 'nam' };
        scene.triggerIncenseOffering(evt.seatIndex, u);
        showChantToast(
          `🪔 THÀNH TÂM DÂNG HƯƠNG LỄ PHẬT 🪔`,
          `Hiệp khách ${escapeHtml(u.nickname)} dâng nén tâm hương cúng dường Tam Bảo. Nam Mô A Di Đà Phật 🙏`,
          8000
        );
      }
    }
    if (evt.action === 'join_seat' && audio) {
      audio.playTempleBell(0.55);
    }
  });

  socket.on('gift_event', evt => {
    if (!evt) return;
    if (typeof evt.seatIndex === 'number') {
      scene.triggerSeatBurst(evt.seatIndex, '#fce881');
    }
    showChantToast(
      `✦ VẠN CỔ THIỀN DUYÊN · ${evt.donorName.toUpperCase()} ✦`,
      evt.chantText,
      11000
    );
  });

  socket.on('chant_speech', payload => {
    if (!payload) return;
    const title = payload.type === 'merit_dedication'
      ? `✦ XƯỚNG DANH HỒI HƯỚNG · ${(payload.donorName || '').toUpperCase()} ✦`
      : `✦ ${(payload.title || 'VẠN CỔ THIỀN ÂM').toUpperCase()} ✦`;
    showChantToast(title, payload.text, 11000);

    if (audio) {
      audio.playChantSpeech(payload);
    }
  });

  socket.on('bell_ring', () => {
    if (audio) audio.playTempleBell(0.95);
    scene.triggerBellRing();
  });

  socket.on('wooden_fish_hit', () => {
    if (audio) audio.playWoodenFish();
    scene.triggerWoodenFishHit();
  });

  socket.on('reload_overlay', () => {
    window.location.reload();
  });

  // ==========================================================================
  // KHUNG VÕ LÂM THIỀN QUY BÊN TRÁI: CAROUSEL VÀ GẬP MỞ
  // ==========================================================================
  const guideCard = document.getElementById('guide-card');
  const btnToggleGuide = document.getElementById('btn-toggle-guide');

  const carouselSlides = document.querySelectorAll('.guide-carousel-slide');
  let currentSlideIdx = 0;
  if (carouselSlides.length > 1) {
    setInterval(() => {
      carouselSlides[currentSlideIdx].classList.remove('active');
      currentSlideIdx = (currentSlideIdx + 1) % carouselSlides.length;
      carouselSlides[currentSlideIdx].classList.add('active');
    }, 6000);
  }

  if (btnToggleGuide && guideCard) {
    btnToggleGuide.addEventListener('click', e => {
      e.stopPropagation();
      const isCollapsed = guideCard.classList.toggle('collapsed');
      btnToggleGuide.textContent = isCollapsed ? '＋' : '─';
    });
  }
})();
