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

      setTimeout(() => {
        splash.remove();
        penguin_ready = true;
        update_penguin(); // 펭귄 즉시 등장
      }, 950);
    };

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

    splash.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (e.deltaY > 0) move_splash_penguin(e.deltaY);
    }, { passive: false });

    let touch_y = 0;
    splash.addEventListener("touchstart", (e) => { touch_y = e.touches[0].clientY; }, { passive: true });
    splash.addEventListener("touchmove",  (e) => {
      const dy = touch_y - e.touches[0].clientY;
      if (dy > 0) move_splash_penguin(dy * 3);
      touch_y = e.touches[0].clientY;
    }, { passive: true });

    splash.addEventListener("click", dismiss_splash);
  }

  /* ══════════════════════════════════════
     가로 스크롤
     세로 scrollY → h-rail translateX 변환
     ══════════════════════════════════════ */
  const h_track    = document.getElementById("h-track");
  const h_stage    = document.getElementById("h-stage");
  const h_rail     = document.getElementById("h-rail");
  const prog_bar   = document.getElementById("h-progress-bar");
  const h_sections = h_rail ? Array.from(h_rail.querySelectorAll(".h-section")) : [];

  let h_scroll_progress = 0; // 0~1, 전역 공유
  let scroll_base_x = 0;    // 스크롤 기반 translateX

  /* ── 마우스 패럴랙스 ── */
  let mp_target = 0;   // 마우스 목표 오프셋
  let mp_cur    = 0;   // 보간된 현재 오프셋
  const MP_RANGE = 100; // 좌우 최대 이동 px
  const MP_LERP  = 0.06;

  document.addEventListener("mousemove", (e) => {
    const cx = window.innerWidth / 2;
    mp_target = ((e.clientX - cx) / cx) * MP_RANGE;
  });
  document.addEventListener("mouseleave", () => { mp_target = 0; });

  /* ── 렌더 루프: 스크롤 + 마우스 패럴랙스 합산 ── */
  const render_rail = () => {
    mp_cur += (mp_target - mp_cur) * MP_LERP;
    if (h_rail) {
      const max_x  = h_rail.scrollWidth - window.innerWidth;
      const final_x = Math.max(0, Math.min(max_x, scroll_base_x - mp_cur));
      h_rail.style.transform = `translateX(-${final_x.toFixed(2)}px)`;

      // sr-elem 가시성 업데이트
      h_sections.forEach((sec, i) => {
        const sec_left = i * 1920;
        const sec_right = (i + 1) * 1920;
        const view_l   = final_x - 200;
        const view_r   = final_x + window.innerWidth;
        if (view_r > sec_left && view_l < sec_right) {
          sec.querySelectorAll(".sr-elem:not(.revealed)").forEach(el => {
            el.classList.add("revealed");
          });
        }
      });
    }
    requestAnimationFrame(render_rail);
  };
  requestAnimationFrame(render_rail);

  const setup_h_track = () => {
    if (!h_track || !h_rail) return;
    const rail_w  = h_rail.scrollWidth;
    const view_w  = window.innerWidth;
    const view_h  = window.innerHeight;
    h_track.style.height = `${rail_w - view_w + view_h}px`;
  };

  const update_h_scroll = () => {
    if (!h_track || !h_rail) return;
    const scroll_max = h_track.offsetHeight - window.innerHeight;
    if (scroll_max <= 0) return;

    h_scroll_progress = Math.max(0, Math.min(1, window.scrollY / scroll_max));
    scroll_base_x = h_scroll_progress * (h_rail.scrollWidth - window.innerWidth);

    // 진행 표시바
    if (prog_bar) prog_bar.style.width = `${(h_scroll_progress * 100).toFixed(2)}%`;
  };

  setup_h_track();
  window.addEventListener("resize", () => { setup_h_track(); update_h_scroll(); });
  window.addEventListener("scroll", update_h_scroll, { passive: true });
  update_h_scroll();

  /* ── 섹션 번호로 직접 이동하는 함수 (헤더 nav용) ── */
  window.scrollToSection = (index) => {
    if (!h_track || !h_rail) return;
    const section_w  = 1920;
    const rail_w     = h_rail.scrollWidth;
    const view_w     = window.innerWidth;
    const scroll_max = h_track.offsetHeight - window.innerHeight;

    const target_x   = Math.min(index * section_w, rail_w - view_w);
    const target_sy  = (target_x / (rail_w - view_w)) * scroll_max;
    window.scrollTo({ top: target_sy, behavior: "smooth" });
  };

  /* ══════════════════════════════════════
     바닥 걷는 펭귄 캐릭터
     ══════════════════════════════════════ */
  const penguin_el = document.getElementById("penguin");

  let p_scroll_timer = null;
  let p_shown        = false;
  const P_W          = 260;
  const P_MARGIN     = 40;

  /* 드래그 상태 */
  let p_drag_active  = false;
  let p_drag_start_x = 0;
  let p_drag_origin  = 0;
  let p_manual_x     = null; // null이면 스크롤 기반, 숫자면 수동 위치

  const update_penguin = () => {
    if (!penguin_ready || !penguin_el) return;
    if (p_drag_active || p_manual_x !== null) return; // 드래그 중엔 스킵

    const scroll_max = document.documentElement.scrollHeight - window.innerHeight;
    if (scroll_max <= 0) return;

    const progress = Math.max(0, Math.min(1, window.scrollY / scroll_max));
    const travel   = window.innerWidth - P_W - P_MARGIN * 2;
    const x        = P_MARGIN + progress * travel;

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
      const max_x  = window.innerWidth - P_W - P_MARGIN;
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
      const max_x = window.innerWidth - P_W - P_MARGIN;
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
