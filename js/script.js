document.addEventListener("DOMContentLoaded", () => {

  /* ══════════════════════════════════════
     스플래시 화면 – 마우스 패럴랙스 + 펭귄 스크롤 진입
     ══════════════════════════════════════ */
  const splash      = document.getElementById("splash");
  const splash_bg   = document.getElementById("splash-bg");
  const splash_text = document.getElementById("splash-text");

  let penguin_ready = false;

  if (splash && splash_bg) {
    let target_x = 0, target_y = 0;
    let cur_x = 0, cur_y = 0;
    let raf_id = null;

    const BG_RANGE   = 38;
    const TEXT_RANGE = 10;

    const tick = () => {
      cur_x += (target_x - cur_x) * 0.07;
      cur_y += (target_y - cur_y) * 0.07;

      splash_bg.style.transform =
        `translate(calc(-50% + ${(cur_x * BG_RANGE).toFixed(2)}px),
                   calc(-50% + ${(cur_y * BG_RANGE).toFixed(2)}px))`;

      if (splash_text) {
        splash_text.style.transform =
          `translate(calc(-50% + ${(-cur_x * TEXT_RANGE).toFixed(2)}px),
                     calc(-50% + ${(-cur_y * TEXT_RANGE).toFixed(2)}px))`;
      }
      raf_id = requestAnimationFrame(tick);
    };

    splash.addEventListener("mousemove", (e) => {
      const cx = window.innerWidth  / 2;
      const cy = window.innerHeight / 2;
      target_x = (e.clientX - cx) / cx;
      target_y = (e.clientY - cy) / cy;
    });
    splash.addEventListener("mouseleave", () => { target_x = 0; target_y = 0; });
    raf_id = requestAnimationFrame(tick);

    /* ── 스플래시 해제 ── */
    let splash_dismissed = false;
    const dismiss_splash = () => {
      if (splash_dismissed) return;
      splash_dismissed = true;
      if (raf_id) cancelAnimationFrame(raf_id);

      splash.classList.add("fade-out");
      document.body.classList.remove("splash-active");

      // 스플래시 페이드 시작과 동시에 펭귄 미리 준비 (좌측 시작 보장)
      window.scrollTo({ top: 0, behavior: "instant" });
      penguin_ready = true;
      update_penguin();

      setTimeout(() => {
        splash.style.visibility = "hidden";
        splash.style.pointerEvents = "none";
      }, 950);
    };

    /* ── 스플래시 복원 (맨 위로 스크롤 시) ── */
    const restore_splash = () => {
      if (!splash_dismissed) return;
      splash_dismissed = false;
      sp_accum = SP_TOTAL; // 펭귄 오른쪽 끝에서 시작
      penguin_ready = false;

      splash.style.visibility = "";
      splash.style.pointerEvents = "";
      splash.classList.remove("fade-out");
      document.body.classList.add("splash-active");

      // 패럴랙스 재시작
      raf_id = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", () => {
      if (window.scrollY === 0 && splash_dismissed) {
        restore_splash();
      }
    }, { passive: true });

    /* ── 스플래시 좌→우 펭귄 ── */
    const sp_lr       = document.getElementById("splash-penguin-lr");
    const SP_W        = 280;
    const SP_MARGIN   = 40;
    const SP_TOTAL    = 1400;
    let   sp_accum    = 0;
    let   sp_walk_timer = null;

    const move_splash_penguin = (delta) => {
      if (!sp_lr || splash_dismissed) return;

      sp_accum = Math.max(0, Math.min(SP_TOTAL, sp_accum + delta));
      const progress = sp_accum / SP_TOTAL;
      const travel   = window.innerWidth - SP_W - SP_MARGIN;
      sp_lr.style.transform = `translateX(${(progress * travel).toFixed(1)}px)`;

      sp_lr.classList.add("walking");
      clearTimeout(sp_walk_timer);
      sp_walk_timer = setTimeout(() => sp_lr.classList.remove("walking"), 200);

      if (progress >= 1) dismiss_splash();
    };

    // 앞뒤 양방향 스크롤 허용
    splash.addEventListener("wheel", (e) => {
      e.preventDefault();
      move_splash_penguin(e.deltaY);
    }, { passive: false });

    let touch_y = 0;
    splash.addEventListener("touchstart", (e) => { touch_y = e.touches[0].clientY; }, { passive: true });
    splash.addEventListener("touchmove",  (e) => {
      const dy = touch_y - e.touches[0].clientY;
      move_splash_penguin(dy * 3);
      touch_y = e.touches[0].clientY;
    }, { passive: true });

    splash.addEventListener("click", dismiss_splash);
  }

  /* ══════════════════════════════════════
     배경 crossfade + 펭귄 수평 이동
     ══════════════════════════════════════ */
  const h_track    = document.getElementById("h-track");
  const h_rail     = document.getElementById("h-rail");
  const prog_bar   = document.getElementById("h-progress-bar");
  const h_sections = h_rail ? Array.from(h_rail.querySelectorAll(".h-section")) : [];

  let h_scroll_progress = 0;
  let current_section_idx = 0;

  const section_count = h_sections.length;

  // 트랙 높이 = 섹션 수 × 뷰포트 높이 × 1.8 (스크롤 여유)
  const setup_h_track = () => {
    if (!h_track) return;
    h_track.style.height = `${section_count * window.innerHeight * 1.8}px`;
  };

  // 섹션 전환
  const show_section = (idx) => {
    h_sections.forEach((sec, i) => {
      sec.classList.toggle("active", i === idx);
    });
    current_section_idx = idx;
  };

  const last_video = document.querySelector(".h-section:last-child video");

  const update_h_scroll = () => {
    if (!h_track) return;
    const scroll_max = h_track.offsetHeight - window.innerHeight;
    if (scroll_max <= 0) return;

    h_scroll_progress = Math.max(0, Math.min(1, window.scrollY / scroll_max));

    // 진행 표시바
    if (prog_bar) prog_bar.style.width = `${(h_scroll_progress * 100).toFixed(2)}%`;

    // 섹션 전환: 펭귄 X 위치 기반 (같은 progress 사용)
    const idx = Math.min(section_count - 1,
      Math.floor(h_scroll_progress * section_count));
    if (idx !== current_section_idx) show_section(idx);

    // 펭귄도 같은 progress로 즉시 업데이트
    update_penguin();

    // 마지막 동영상: 진입 후 지연 줌아웃+페이드
    if (last_video) {
      const last_threshold = (section_count - 1) / section_count;
      if (h_scroll_progress >= last_threshold) {
        if (!last_video._ending_armed) {
          last_video._ending_armed = true;
          last_video.classList.remove("video-ending");
          void last_video.offsetWidth;
          last_video.classList.add("video-ending");
        }
      } else {
        last_video._ending_armed = false;
        last_video.classList.remove("video-ending");
      }
    }
  };

  /* ── 섹션 번호로 직접 이동 (헤더 nav용) ── */
  window.scrollToSection = (index) => {
    if (!h_track) return;
    const scroll_max = h_track.offsetHeight - window.innerHeight;
    const target_sy  = (index / section_count) * scroll_max;
    window.scrollTo({ top: target_sy, behavior: "smooth" });
  };

  // 초기 실행
  show_section(0);
  setup_h_track();
  window.addEventListener("load",   () => { setup_h_track(); update_h_scroll(); });
  window.addEventListener("resize", () => { setup_h_track(); update_h_scroll(); });
  window.addEventListener("scroll", update_h_scroll, { passive: true });

  /* ══════════════════════════════════════
     바닥 걷는 펭귄 캐릭터
     ══════════════════════════════════════ */
  const penguin_el = document.getElementById("penguin");

  let p_scroll_timer = null;
  let p_shown        = false;
  const P_MARGIN     = 40;
  const get_P_W = () => penguin_el ? penguin_el.offsetWidth : Math.round(window.innerHeight / 3 * 0.6);

  /* 드래그 상태 */
  let p_drag_active  = false;
  let p_drag_start_x = 0;
  let p_drag_origin  = 0;
  let p_manual_x     = null; // null이면 스크롤 기반, 숫자면 수동 위치

  const update_penguin = () => {
    if (!penguin_ready || !penguin_el) return;
    if (p_drag_active || p_manual_x !== null) return;

    // 섹션 전환과 동일한 scroll_max 사용 (h_scroll_progress와 동기화)
    if (!h_track) return;
    const scroll_max = h_track.offsetHeight - window.innerHeight;
    if (scroll_max <= 0) return;

    const progress = Math.max(0, Math.min(1, window.scrollY / scroll_max));
    const P_W      = get_P_W();
    const travel   = window.innerWidth - P_W - P_MARGIN * 2;
    const x        = P_MARGIN + progress * travel;

    // 수평 이동만 — Y, 회전 없음
    penguin_el.style.transform = `translateX(${x.toFixed(1)}px)`;

    if (!p_shown) {
      p_shown = true;
      penguin_el.classList.add("visible");
    }

    // 스크롤 50% 이상이면 어른 황제펭귄으로 전환
    if (progress >= 0.5) {
      penguin_el.classList.add("grown");
    } else {
      penguin_el.classList.remove("grown");
    }

    penguin_el.classList.add("walking");
    clearTimeout(p_scroll_timer);
    p_scroll_timer = setTimeout(() => penguin_el.classList.remove("walking"), 160);
  };

  /* ── 드래그로 자유 이동 ── */
  if (penguin_el) {
    penguin_el.addEventListener("mousedown", (e) => {
      p_drag_active  = true;
      p_drag_start_x = e.clientX;
      // 현재 translateX 값 추출
      const mat = new DOMMatrix(getComputedStyle(penguin_el).transform);
      p_drag_origin = mat.m41 || 0;
      penguin_el.classList.add("dragging");
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!p_drag_active) return;
      const delta  = e.clientX - p_drag_start_x;
      const max_x  = window.innerWidth - get_P_W() - P_MARGIN;
      const new_x  = Math.max(P_MARGIN, Math.min(max_x, p_drag_origin + delta));
      p_manual_x   = new_x;
      penguin_el.style.transform = `translateX(${new_x.toFixed(1)}px)`;
      penguin_el.classList.add("walking");
    });

    document.addEventListener("mouseup", () => {
      if (!p_drag_active) return;
      p_drag_active = false;
      penguin_el.classList.remove("dragging");
      document.body.style.userSelect = "";
      // 잠시 후 스크롤 기반으로 복귀
      clearTimeout(p_scroll_timer);
      p_scroll_timer = setTimeout(() => {
        penguin_el.classList.remove("walking");
        p_manual_x = null;
        update_penguin();
      }, 800);
    });

    /* 터치 드래그 */
    penguin_el.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      p_drag_active  = true;
      p_drag_start_x = t.clientX;
      const mat = new DOMMatrix(getComputedStyle(penguin_el).transform);
      p_drag_origin = mat.m41 || 0;
      penguin_el.classList.add("dragging");
    }, { passive: true });

    document.addEventListener("touchmove", (e) => {
      if (!p_drag_active) return;
      const delta = e.touches[0].clientX - p_drag_start_x;
      const max_x = window.innerWidth - get_P_W() - P_MARGIN;
      const new_x = Math.max(P_MARGIN, Math.min(max_x, p_drag_origin + delta));
      p_manual_x  = new_x;
      penguin_el.style.transform = `translateX(${new_x.toFixed(1)}px)`;
      penguin_el.classList.add("walking");
    }, { passive: true });

    document.addEventListener("touchend", () => {
      if (!p_drag_active) return;
      p_drag_active = false;
      penguin_el.classList.remove("dragging");
      clearTimeout(p_scroll_timer);
      p_scroll_timer = setTimeout(() => {
        penguin_el.classList.remove("walking");
        p_manual_x = null;
        update_penguin();
      }, 800);
    });
  }

  window.addEventListener("scroll", update_penguin, { passive: true });
  window.addEventListener("resize", update_penguin);

});
