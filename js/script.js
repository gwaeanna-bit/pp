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

  const setup_h_track = () => {
    if (!h_track || !h_rail) return;
    const rail_w  = h_rail.scrollWidth;
    const view_w  = window.innerWidth;
    const view_h  = window.innerHeight;
    // 트랙 높이 = 가로 이동 거리 + 뷰포트 높이 한 페이지
    h_track.style.height = `${rail_w - view_w + view_h}px`;
  };

  const update_h_scroll = () => {
    if (!h_track || !h_rail) return;

    const scroll_max = h_track.offsetHeight - window.innerHeight;
    if (scroll_max <= 0) return;

    h_scroll_progress = Math.max(0, Math.min(1, window.scrollY / scroll_max));
    const max_x = h_rail.scrollWidth - window.innerWidth;
    const cur_x = h_scroll_progress * max_x;

    h_rail.style.transform = `translateX(-${cur_x.toFixed(2)}px)`;

    // 진행 표시바
    if (prog_bar) prog_bar.style.width = `${(h_scroll_progress * 100).toFixed(2)}%`;

    // 섹션 가시성 기반으로 sr-elem 활성화
    h_sections.forEach((sec, i) => {
      const sec_left  = i * 1920;
      const sec_right = (i + 1) * 1920;
      const view_l    = cur_x - 200;   // 약간의 여유
      const view_r    = cur_x + window.innerWidth;

      if (view_r > sec_left && view_l < sec_right) {
        sec.querySelectorAll(".sr-elem:not(.revealed)").forEach(el => {
          el.classList.add("revealed");
        });
      }
    });
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
  const P_W          = 260;   // CSS .penguin-img width 와 일치
  const P_MARGIN     = 40;

  const update_penguin = () => {
    if (!penguin_ready || !penguin_el) return;

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

    penguin_el.classList.add("walking");
    clearTimeout(p_scroll_timer);
    p_scroll_timer = setTimeout(() => penguin_el.classList.remove("walking"), 160);
  };

  window.addEventListener("scroll", update_penguin, { passive: true });
  window.addEventListener("resize", update_penguin);

});
