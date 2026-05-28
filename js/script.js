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
          `translate(${(-cur_x * TEXT_RANGE).toFixed(2)}px, ${(-cur_y * TEXT_RANGE).toFixed(2)}px)`;
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

    /* ── 메인 콘텐츠 초기화 ── */
    const init_main = () => {
      window.scrollTo({ top: 0, behavior: "instant" });
      penguin_ready = true;
      update_penguin();
    };

    /* ── 스플래시 해제 → 수중 화면으로 ── */
    let splash_dismissed = false;
    const dismiss_splash = () => {
      if (splash_dismissed) return;
      splash_dismissed = true;
      if (raf_id) cancelAnimationFrame(raf_id);

      // 스플래시 페이드아웃
      splash.classList.add("fade-out");
      document.body.classList.remove("splash-active");

      // 수중 화면 — splash fade-out 직후 표시
      requestAnimationFrame(() => {
        const uw = document.getElementById("underwater");
        if (uw) uw.classList.add("active");
        // nav 수중 화면 위로 노출
        const hdr = document.querySelector(".header");
        if (hdr) hdr.classList.add("uw-visible");
      });

      setTimeout(() => {
        splash.style.visibility = "hidden";
        splash.style.pointerEvents = "none";
      }, 950);
    };

    /* ── 수중 화면 → 메인 콘텐츠 ── */
    const uw_el = document.getElementById("underwater");

    /* ── 수중 펭귄 드래그 ── */
    const uw_pg = document.getElementById("uw-penguin");
    if (uw_pg) {
      let uw_pg_x = 0, uw_pg_y = 0;
      let uw_drag = false, uw_dx = 0, uw_dy = 0;
      let uw_vx = 0, uw_vy = 0;
      let uw_raf = null;
      let uw_surfaced = false;

      const uw_pg_apply = (x, y, tilt) => {
        uw_pg.style.transform =
          `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) rotate(${tilt.toFixed(1)}deg)`;

        // 펭귄을 물 위로 올리면 → img11 화면 등장 후 메인으로 전환
        const pgCenterY = window.innerHeight * 0.55 + y;
        if (pgCenterY < 80 && !uw_surfaced) {
          uw_surfaced = true;
          // 펭귄 수면 돌파 이펙트
          uw_pg.style.transition = "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), filter 0.4s ease, opacity 0.4s ease";
          uw_pg.style.transform =
            `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) rotate(0deg) scale(1.5)`;
          uw_pg.style.filter = "drop-shadow(0 0 60px rgba(160,220,255,1)) brightness(1.5)";
          uw_pg.style.opacity = "0";

          // img11 오버레이 등장
          setTimeout(() => {
            const sr = document.getElementById("surface-reveal");
            if (sr) {
              sr.classList.add("active");
              // 수중 화면 페이드아웃
              dismiss_underwater();
              // img11 일정 시간 후 페이드아웃
              setTimeout(() => {
                sr.classList.remove("active");
                sr.classList.add("fade-out");
                setTimeout(() => {
                  sr.style.display = "none";
                }, 1000);
              }, 1800);
            } else {
              dismiss_underwater();
            }
          }, 350);
        }
      };

      const uw_inertia = () => {
        if (uw_drag) return;
        uw_vx *= 0.92; uw_vy *= 0.92;
        uw_pg_x += uw_vx; uw_pg_y += uw_vy;
        const tilt = Math.max(-20, Math.min(20, uw_vx * 0.8));
        uw_pg_apply(uw_pg_x, uw_pg_y, tilt);
        if (Math.abs(uw_vx) > 0.3 || Math.abs(uw_vy) > 0.3) {
          uw_raf = requestAnimationFrame(uw_inertia);
        } else {
          uw_pg.classList.remove("dragging");
        }
      };

      uw_pg.addEventListener("mousedown", (e) => {
        uw_drag = true;
        uw_dx = e.clientX - uw_pg_x;
        uw_dy = e.clientY - uw_pg_y;
        uw_pg.classList.add("dragging");
        if (uw_raf) cancelAnimationFrame(uw_raf);
        document.body.style.userSelect = "none";
        e.preventDefault();
      });

      document.addEventListener("mousemove", (e) => {
        if (!uw_drag) return;
        const nx = e.clientX - uw_dx, ny = e.clientY - uw_dy;
        uw_vx = nx - uw_pg_x; uw_vy = ny - uw_pg_y;
        uw_pg_x = nx; uw_pg_y = ny;
        const tilt = Math.max(-25, Math.min(25, uw_vx * 1.2));
        uw_pg_apply(uw_pg_x, uw_pg_y, tilt);
      });

      document.addEventListener("mouseup", () => {
        if (!uw_drag) return;
        uw_drag = false;
        document.body.style.userSelect = "";
        uw_raf = requestAnimationFrame(uw_inertia);
      });

      uw_pg.addEventListener("touchstart", (e) => {
        const t = e.touches[0];
        uw_drag = true;
        uw_dx = t.clientX - uw_pg_x;
        uw_dy = t.clientY - uw_pg_y;
        uw_pg.classList.add("dragging");
        if (uw_raf) cancelAnimationFrame(uw_raf);
      }, { passive: true });

      document.addEventListener("touchmove", (e) => {
        if (!uw_drag) return;
        const t = e.touches[0];
        const nx = t.clientX - uw_dx, ny = t.clientY - uw_dy;
        uw_vx = nx - uw_pg_x; uw_vy = ny - uw_pg_y;
        uw_pg_x = nx; uw_pg_y = ny;
        const tilt = Math.max(-25, Math.min(25, uw_vx * 1.2));
        uw_pg_apply(uw_pg_x, uw_pg_y, tilt);
      }, { passive: true });

      document.addEventListener("touchend", () => {
        if (!uw_drag) return;
        uw_drag = false;
        uw_raf = requestAnimationFrame(uw_inertia);
      });
    }
    let uw_accum = 0;
    const UW_TOTAL = 600;
    let uw_done = false;

    const dismiss_underwater = () => {
      if (uw_done) return;
      uw_done = true;
      // 스크롤 0으로 리셋 시 restore_splash 재진입 방지
      splash_dismissed = false;
      // nav 수중 모드 해제
      const hdr = document.querySelector(".header");
      if (hdr) hdr.classList.remove("uw-visible");
      if (uw_el) {
        uw_el.classList.remove("active");
        uw_el.classList.add("fade-out");
        setTimeout(() => { uw_el.style.visibility = "hidden"; }, 950);
      }
      init_main();
    };

    // window 레벨에서 수중 화면 스크롤 처리 (splash wheel 간섭 방지)
    window.addEventListener("wheel", (e) => {
      if (!uw_el || !uw_el.classList.contains("active") || uw_done) return;
      e.preventDefault();
      uw_accum = Math.max(0, Math.min(UW_TOTAL, uw_accum + e.deltaY));
      if (uw_accum >= UW_TOTAL) dismiss_underwater();
    }, { passive: false });

    let uw_touch_y = 0;
    window.addEventListener("touchstart", (e) => {
      if (!uw_el || !uw_el.classList.contains("active")) return;
      uw_touch_y = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener("touchmove", (e) => {
      if (!uw_el || !uw_el.classList.contains("active") || uw_done) return;
      const dy = uw_touch_y - e.touches[0].clientY;
      uw_accum = Math.max(0, Math.min(UW_TOTAL, uw_accum + dy * 3));
      uw_touch_y = e.touches[0].clientY;
      if (uw_accum >= UW_TOTAL) dismiss_underwater();
    }, { passive: true });

    /* ── 스플래시 복원 (맨 위로 스크롤 시) ── */
    const restore_splash = () => {
      if (!splash_dismissed) return;
      splash_dismissed = false;
      sp_accum  = 0;
      sp_falling = false;
      penguin_ready = false;

      // 펭귄 위치 초기화
      const sc = document.getElementById("splash-center");
      if (sc) {
        sc.style.transition = "none";
        sc.style.transform  = "";
        sc.style.opacity    = "";
        sc.style.cursor     = "grab";
      }
      const sp = document.getElementById("splash-penguin-spin");
      if (sp) { sp.style.transform = ""; }

      // 수중 화면 초기화
      uw_accum = 0;
      uw_done  = false;
      if (uw_el) {
        uw_el.classList.remove("active", "fade-out");
        uw_el.style.visibility = "";
      }

      splash.style.visibility = "";
      splash.style.pointerEvents = "";
      splash.classList.remove("fade-out");
      document.body.classList.add("splash-active");

      // 패럴랙스 재시작
      raf_id = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", () => {
      // uw_done(수중 완료) 이후에는 스플래시 복원 안 함
      if (window.scrollY === 0 && splash_dismissed && !uw_done) {
        restore_splash();
      }
    }, { passive: true });

    /* ── 스플래시 펭귄 — 스크롤로 오른쪽 바다로 밀기 ── */
    const splash_center  = document.getElementById("splash-center");
    const SP_TOTAL       = 1600;
    let   sp_accum       = 0;
    let   sp_falling     = false;

    const update_splash_pos = () => {
      if (splash_dismissed || sp_falling) return;
      const progress = Math.min(1, sp_accum / SP_TOTAL);
      const travel_x = window.innerWidth * 0.55;
      const tilt     = progress * 38;

      if (splash_center) {
        splash_center.style.transition = 'none';
        splash_center.style.transform  =
          `translateX(${(progress * travel_x).toFixed(1)}px) rotate(${tilt.toFixed(1)}deg)`;
        splash_center.style.opacity = Math.max(0, 1 - progress * 1.2).toFixed(3);
      }

      if (progress >= 1 && !sp_falling) {
        sp_falling = true;
        if (splash_center) {
          splash_center.style.transition =
            'transform 1.1s cubic-bezier(0.55,0,1,0.45), opacity 0.9s ease';
          splash_center.style.transform =
            `translateX(${(travel_x * 1.5).toFixed(1)}px) translateY(120px) rotate(90deg)`;
          splash_center.style.opacity = '0';
        }
        setTimeout(() => dismiss_splash(), 1000);
      }
    };

    // 마우스 휠 스크롤
    splash.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (splash_dismissed || sp_falling) return;
      sp_accum = Math.max(0, Math.min(SP_TOTAL, sp_accum + e.deltaY));
      update_splash_pos();
    }, { passive: false });

    // 터치 스와이프 (위로 올리면 펭귄 밀기)
    let touch_y = 0;
    splash.addEventListener("touchstart", (e) => {
      touch_y = e.touches[0].clientY;
    }, { passive: true });
    splash.addEventListener("touchmove", (e) => {
      if (splash_dismissed || sp_falling) return;
      const dy = touch_y - e.touches[0].clientY;
      sp_accum = Math.max(0, Math.min(SP_TOTAL, sp_accum + dy * 3));
      touch_y  = e.touches[0].clientY;
      update_splash_pos();
    }, { passive: true });
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

  // 섹션 전환 — 위에서 아래로 슬라이드
  const show_section = (idx) => {
    h_sections.forEach((sec, i) => {
      sec.classList.remove("active", "past");
      if (i === idx)       sec.classList.add("active");
      else if (i < idx)    sec.classList.add("past");
      // i > idx → 위에 대기 (translateY(-100%))
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

    // 섹션 전환 (포트폴리오 섹션에서는 줌인 중 자동 전환 차단)
    const idx = Math.min(section_count - 1,
      Math.floor(h_scroll_progress * section_count));
    const pf_idx = h_sections.findIndex(s => s.id === "portfolio-section");
    if (idx !== current_section_idx) {
      // 포트폴리오 → 비디오 전환은 줌인 완료 후에만 허용
      if (current_section_idx === pf_idx && idx > pf_idx) return;
      show_section(idx);
    }

    // 펭귄도 같은 progress로 즉시 업데이트
    update_penguin();

    // 마지막 동영상: 섹션 후반부 스크롤로 줌아웃+페이드
    if (last_video) {
      const vid_start  = (section_count - 1) / section_count; // 0.80 (동영상 섹션 시작)
      const zoom_start = vid_start + (1 - vid_start) * 0.55;  // 0.91 (동영상 55% 지점부터 효과 시작)
      if (h_scroll_progress >= zoom_start) {
        const t       = (h_scroll_progress - zoom_start) / (1.0 - zoom_start);
        const scale   = 1 - t * 0.5;
        const opacity = 1 - t;
        last_video.style.transform = `scale(${scale.toFixed(3)})`;
        last_video.style.opacity   = opacity.toFixed(3);
      } else {
        last_video.style.transform = "";
        last_video.style.opacity   = "";
      }
    }
  };

  /* ── 섹션 번호로 직접 이동 (헤더 nav용) ── */
  window.scrollToSection = (index) => {
    // 수중 화면 중이면 바로 건너뜀
    if (uw_el && uw_el.classList.contains("active")) {
      dismiss_underwater();
      setTimeout(() => {
        if (!h_track) return;
        const scroll_max = h_track.offsetHeight - window.innerHeight;
        const target_sy  = (index / section_count) * scroll_max;
        window.scrollTo({ top: target_sy, behavior: "smooth" });
      }, 100);
      return;
    }
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

  /* 스핀 변신 상태 */
  let penguin_is_grown  = false;
  let penguin_spinning  = false;

  const spin_to = (to_grown) => {
    if (penguin_spinning || !penguin_el) return;
    penguin_spinning = true;
    penguin_el.classList.add("spinning");

    // 발광 정점(300ms)에 이미지 교체 → 자연스러운 크로스페이드
    setTimeout(() => {
      if (to_grown) penguin_el.classList.add("grown");
      else          penguin_el.classList.remove("grown");
    }, 300);

    // 변신 완료 후 정리
    setTimeout(() => {
      penguin_el.classList.remove("spinning");
      penguin_spinning  = false;
      penguin_is_grown  = to_grown;
    }, 560);
  };
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

    // 50% 지점에서 3D 스핀으로 어른 황제펭귄 변신
    const should_grow = progress >= 0.5;
    if (should_grow !== penguin_is_grown) {
      spin_to(should_grow);
    }

    penguin_el.classList.add("walking");
    clearTimeout(p_scroll_timer);
    p_scroll_timer = setTimeout(() => penguin_el.classList.remove("walking"), 160);
  };

  /* ── 펭귄 X 위치 → 섹션 전환 ── */
  const update_section_from_x = (x) => {
    const P_W    = get_P_W();
    const travel = window.innerWidth - P_W - P_MARGIN * 2;
    const prog   = Math.max(0, Math.min(1, (x - P_MARGIN) / travel));
    const idx    = Math.min(section_count - 1, Math.floor(prog * section_count));
    if (idx !== current_section_idx) show_section(idx);

    // 50% 기준 변신
    const should_grow = prog >= 0.5;
    if (should_grow !== penguin_is_grown) spin_to(should_grow);
  };

  /* ── 드래그로 자유 이동 ── */
  if (penguin_el) {
    penguin_el.addEventListener("mousedown", (e) => {
      p_drag_active  = true;
      p_drag_start_x = e.clientX;
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
      // 펭귄 위치에 맞는 배경으로 전환
      update_section_from_x(new_x);
    });

    document.addEventListener("mouseup", () => {
      if (!p_drag_active) return;
      p_drag_active = false;
      penguin_el.classList.remove("dragging");
      document.body.style.userSelect = "";
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
      update_section_from_x(new_x);
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

  /* ══════════════════════════════════════
     눈보라 (스플래시 전용)
     ══════════════════════════════════════ */
  const snow_canvas = document.getElementById("snow-canvas");
  const snow_ctx    = snow_canvas ? snow_canvas.getContext("2d") : null;

  if (snow_canvas && snow_ctx) {
    let sw = window.innerWidth;
    let sh = window.innerHeight;
    snow_canvas.width  = sw;
    snow_canvas.height = sh;

    let wind_target = 0, wind = 0, gust = 0, last_mx = sw / 2;

    document.addEventListener("mousemove", (e) => {
      const speed = Math.abs(e.clientX - last_mx);
      wind_target = (e.clientX - sw / 2) / (sw / 2) * 2.5;
      gust        = Math.min(speed * 0.04, 2.5);
      last_mx     = e.clientX;
    });

    const flakes = Array.from({ length: 180 }, () => ({
      x: Math.random() * sw, y: Math.random() * sh,
      r: Math.random() * 2.5 + 0.4,
      speed: Math.random() * 1.8 + 0.5,
      drift: (Math.random() - 0.5) * 0.8,
      flut: Math.random() * Math.PI * 2,
      flut_sp: Math.random() * 0.025 + 0.008,
      alpha: Math.random() * 0.45 + 0.15,
    }));

    const tick_snow = () => {
      snow_ctx.clearRect(0, 0, sw, sh);
      wind += (wind_target - wind) * 0.03;
      gust *= 0.93;
      const tw = wind + gust;

      flakes.forEach(f => {
        f.flut += f.flut_sp;
        f.x += f.drift + tw + Math.sin(f.flut) * 0.5;
        f.y += f.speed + Math.abs(tw) * 0.1;
        if (f.y > sh + 6) { f.y = -6; f.x = Math.random() * sw; }
        if (f.x > sw + 6) f.x = -6;
        if (f.x < -6)     f.x = sw + 6;

        snow_ctx.beginPath();
        snow_ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        snow_ctx.fillStyle = `rgba(220,235,255,${f.alpha})`;
        snow_ctx.fill();
      });
      requestAnimationFrame(tick_snow);
    };

    window.addEventListener("resize", () => {
      sw = window.innerWidth; sh = window.innerHeight;
      snow_canvas.width = sw; snow_canvas.height = sh;
    });

    tick_snow();
  }

  /* ══════════════════════════════════════
     section11 스크롤 줌인 → 영상 전환
     ══════════════════════════════════════ */
  const portfolio_sc   = document.getElementById("portfolio-section");
  const portfolio_idx  = h_sections.findIndex(s => s.id === "portfolio-section");
  const vid_idx_global = h_sections.findIndex(s => s.id === "video-section");

  let pz_accum   = 0;
  const PZ_TOTAL = 900;
  let pz_done    = false;

  const portfolio_bg = portfolio_sc ? portfolio_sc.querySelector(".bg-img") : null;

  const do_portfolio_zoom = (delta) => {
    if (pz_done || current_section_idx !== portfolio_idx) return;
    if (delta <= 0) {
      // 위로 스크롤 시 줌 리셋
      pz_accum = Math.max(0, pz_accum + delta * 0.5);
      const prog = pz_accum / PZ_TOTAL;
      if (portfolio_bg) {
        portfolio_bg.style.transition = "none";
        portfolio_bg.style.transform  = prog > 0 ? `scale(${1 + prog * 9})` : "";
        portfolio_bg.style.opacity    = prog > 0 ? Math.max(0, 1 - prog * 2) : "";
      }
      return;
    }

    pz_accum = Math.min(PZ_TOTAL, pz_accum + delta);
    const progress = pz_accum / PZ_TOTAL;

    // 점진적 줌인
    if (portfolio_bg) {
      const scale = 1 + progress * 9;          // 1 → 10
      const alpha = Math.max(0, 1 - progress * 2.2);
      portfolio_bg.style.transition = "none";
      portfolio_bg.style.transform  = `scale(${scale.toFixed(3)})`;
      portfolio_bg.style.opacity    = alpha.toFixed(3);
    }

    if (progress >= 1 && !pz_done) {
      pz_done = true;
      // 마지막 빨려들기 애니메이션
      if (portfolio_bg) {
        portfolio_bg.style.transition =
          "transform 0.45s cubic-bezier(0.4,0,0.8,1), opacity 0.35s ease";
        portfolio_bg.style.transform = "scale(15)";
        portfolio_bg.style.opacity   = "0";
      }
      setTimeout(() => {
        if (vid_idx_global !== -1) show_section(vid_idx_global);
        // 복원
        setTimeout(() => {
          if (portfolio_bg) {
            portfolio_bg.style.transition = "";
            portfolio_bg.style.transform  = "";
            portfolio_bg.style.opacity    = "";
          }
          pz_accum = 0;
          pz_done  = false;
        }, 300);
      }, 430);
    }
  };

  // 마우스 휠
  window.addEventListener("wheel", (e) => {
    if (current_section_idx !== portfolio_idx) return;
    e.preventDefault();
    do_portfolio_zoom(e.deltaY);
  }, { passive: false });

  // 터치
  let pz_touch_y = 0;
  window.addEventListener("touchstart", (e) => {
    if (current_section_idx === portfolio_idx) pz_touch_y = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (current_section_idx !== portfolio_idx) return;
    const dy = pz_touch_y - e.touches[0].clientY;
    pz_touch_y = e.touches[0].clientY;
    do_portfolio_zoom(dy * 3);
  }, { passive: true });


});
