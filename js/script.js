document.addEventListener("DOMContentLoaded", () => {

  /* ══════════════════════════════════════
     스플래시 화면 – 마우스 패럴랙스 + 펭귄 스크롤 진입
     ══════════════════════════════════════ */
  const splash      = document.getElementById("splash");
  const splash_bg   = document.getElementById("splash-bg");
  const splash_text = document.getElementById("splash-text");

  let penguin_ready  = false;
  let uw_end_shown   = false;   // 최상위 스코프 — dismiss_underwater에서도 리셋 가능
  // 전역 접근용 수중화면 참조
  const uw_el_global = document.getElementById("underwater");
  // 외부 스코프에서 수중화면 표시 함수 참조
  let show_uw_screen = null;

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

      // 스플래시 페이드아웃 → 바로 메인으로
      splash.classList.add("fade-out");
      document.body.classList.remove("splash-active");

      setTimeout(() => {
        splash.style.visibility = "hidden";
        splash.style.pointerEvents = "none";
      }, 950);

      // 수중 화면은 건너뛰고 메인 콘텐츠 직행
      // restore_splash 트리거 방지: scrollY=0 이벤트가 와도 복원 안 하도록 플래그 해제
      setTimeout(() => {
        splash_dismissed = false;
        uw_done = true;
        init_main();
      }, 400);
    };

    /* ── 수중 화면 ── */
    const uw_el = document.getElementById("underwater");
    let uw_surfaced = false;  // 외부 스코프로 이동

    /* ── 수중 화면 표시 함수 (영상 끝에서 호출) ── */
    show_uw_screen = () => {
      if (!uw_el) return;
      uw_done     = false;
      uw_accum    = 0;
      uw_surfaced = false;
      // 수중화면 진입 시 영상 스킵 버튼 숨기기
      const _sb = document.getElementById("video-skip-btn");
      if (_sb) _sb.classList.remove("visible");
      // 펭귄 위치·상태 초기화
      const pg = document.getElementById("uw-penguin");
      if (pg) {
        pg.style.transition = "";
        pg.style.transform  = "";
        pg.style.filter     = "";
        pg.style.opacity    = "";
      }
      // surface-reveal 초기화
      const sr = document.getElementById("surface-reveal");
      if (sr) {
        sr.style.display = "";
        sr.classList.remove("active", "fade-out");
      }
      uw_el.classList.remove("active", "fade-out");
      uw_el.style.visibility = "";
      requestAnimationFrame(() => {
        uw_el.classList.add("active");
        const hdr = document.querySelector(".header");
        if (hdr) hdr.classList.add("uw-visible");
      });
    };

    /* ── 수중 펭귄 드래그 ── */
    const uw_pg = document.getElementById("uw-penguin");
    if (uw_pg) {
      let uw_pg_x = 0, uw_pg_y = 0;
      let uw_drag = false, uw_dx = 0, uw_dy = 0;
      let uw_vx = 0, uw_vy = 0;
      let uw_raf = null;

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

          // img11 오버레이 등장 — 최종 화면으로 고정
          setTimeout(() => {
            const sr = document.getElementById("surface-reveal");
            dismiss_underwater();
            if (sr) {
              sr.classList.add("active");
              // 더 이상 페이드아웃 없음 — 마지막 화면
            } else {
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
    const UW_TOTAL = 2000;
    let uw_done = false;

    const dismiss_underwater = () => {
      if (uw_done) return;
      uw_done = true;
      splash_dismissed = false;
      // nav 수중 모드 해제
      const hdr = document.querySelector(".header");
      if (hdr) hdr.classList.remove("uw-visible");
      if (uw_el) {
        uw_el.classList.remove("active");
        uw_el.classList.add("fade-out");
        setTimeout(() => {
          uw_el.style.visibility = "hidden";
          // 다음 방문을 위해 uw_end_shown 리셋 (영상 끝에서만)
          if (penguin_ready) uw_end_shown = false;
        }, 950);
      }
      // 영상 끝 수중화면이면 스크롤 유지, 아니면 메인 초기화
      if (!penguin_ready) init_main();
    };

    // 수중화면 스크롤 시 펭귄 위로 끌어올리기
    const uw_scroll_rise = (delta) => {
      if (!uw_el || !uw_el.classList.contains("active") || uw_done || uw_surfaced) return;
      uw_accum = Math.max(0, Math.min(UW_TOTAL, uw_accum + delta));

      // 펭귄을 스크롤 진행도에 따라 위로 이동
      const pg = document.getElementById("uw-penguin");
      if (pg) {
        const progress = uw_accum / UW_TOTAL;
        const rise = progress * (window.innerHeight * 0.52);
        const tilt = -(progress * 18);
        pg.style.animation = "none";
        pg.style.transform = `translate(-50%, calc(-50% - ${rise.toFixed(1)}px)) rotate(${tilt.toFixed(1)}deg)`;
      }

      // 끝까지 올라가면 수면 돌파
      if (uw_accum >= UW_TOTAL) {
        uw_surfaced = true;
        if (pg) {
          pg.style.transition = "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), filter 0.4s ease, opacity 0.4s ease";
          pg.style.transform  = `translate(-50%, calc(-50% - ${(window.innerHeight * 0.6).toFixed(0)}px)) rotate(0deg) scale(1.4)`;
          pg.style.filter     = "drop-shadow(0 0 60px rgba(160,220,255,1)) brightness(1.5)";
          pg.style.opacity    = "0";
        }
        setTimeout(() => {
          const sr = document.getElementById("surface-reveal");
          dismiss_underwater();
          if (sr) {
            sr.classList.add("active");
            // img11은 최종 화면 — 페이드아웃 없이 그대로 유지
          }
        }, 350);
      }
    };

    // window 레벨에서 수중 화면 스크롤 처리
    window.addEventListener("wheel", (e) => {
      if (!uw_el || !uw_el.classList.contains("active") || uw_done) return;
      e.preventDefault();
      uw_scroll_rise(e.deltaY);
    }, { passive: false });

    let uw_touch_y = 0;
    window.addEventListener("touchstart", (e) => {
      if (!uw_el || !uw_el.classList.contains("active")) return;
      uw_touch_y = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener("touchmove", (e) => {
      if (!uw_el || !uw_el.classList.contains("active") || uw_done) return;
      const dy = uw_touch_y - e.touches[0].clientY;
      uw_touch_y = e.touches[0].clientY;
      uw_scroll_rise(dy * 3);
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

      // 얼음 리셋 트리거
      window.dispatchEvent(new CustomEvent('splash-restored'));
      // 패럴랙스 재시작
      raf_id = requestAnimationFrame(tick);
    };

    window.restore_splash = restore_splash;

    window.addEventListener("scroll", () => {
      // uw_done(수중 완료) 이후에는 스플래시 복원 안 함
      if (window.scrollY === 0 && splash_dismissed && !uw_done) {
        restore_splash();
      }
    }, { passive: true });

    /* ── 스플래시 펭귄 — 드래그앤드롭으로 바다에 빠뜨리기 ── */
    const splash_center = document.getElementById("splash-center");
    let sp_accum  = 0; // restore_splash 호환용
    let sp_falling = false;

    let sp_drag = false;
    let sp_start_x = 0, sp_start_y = 0;
    let sp_cur_x = 0, sp_cur_y = 0;
    let sp_vx = 0;

    const sp_do_fall = () => {
      if (sp_falling) return;
      sp_falling = true;
      sp_drag = false;
      // 얼음 폭발 트리거
      window.dispatchEvent(new CustomEvent('penguin-splash'));
      if (splash_center) {
        splash_center.style.transition =
          'transform 0.9s cubic-bezier(0.55,0,1,0.45), opacity 0.7s ease';
        splash_center.style.transform =
          `translate(${(sp_cur_x + window.innerWidth * 0.35).toFixed(0)}px, ${(sp_cur_y + 200).toFixed(0)}px) rotate(95deg)`;
        splash_center.style.opacity = '0';
      }
      setTimeout(() => dismiss_splash(), 900);
    };

    // 마우스 드래그
    if (splash_center) {
      splash_center.style.cursor = 'grab';

      splash_center.addEventListener("mousedown", (e) => {
        if (splash_dismissed || sp_falling) return;
        sp_drag    = true;
        sp_start_x = e.clientX - sp_cur_x;
        sp_start_y = e.clientY - sp_cur_y;
        splash_center.style.cursor = 'grabbing';
        splash_center.style.transition = 'none';
        e.preventDefault();
      });

      document.addEventListener("mousemove", (e) => {
        if (!sp_drag || splash_dismissed || sp_falling) return;
        const nx = e.clientX - sp_start_x;
        const ny = e.clientY - sp_start_y;
        sp_vx   = nx - sp_cur_x;
        sp_cur_x = nx; sp_cur_y = ny;
        const tilt = Math.min(50, Math.max(-15, sp_cur_x * 0.08));
        splash_center.style.transform =
          `translate(${sp_cur_x.toFixed(1)}px, ${sp_cur_y.toFixed(1)}px) rotate(${tilt.toFixed(1)}deg)`;
        // 오른쪽 바다 영역 진입 시 자동 낙하
        if (sp_cur_x > window.innerWidth * 0.28) sp_do_fall();
      });

      document.addEventListener("mouseup", () => {
        if (!sp_drag) return;
        sp_drag = false;
        splash_center.style.cursor = 'grab';
        if (sp_falling) return;
        // 충분히 오른쪽이면 낙하, 아니면 원위치
        if (sp_cur_x > 120 && sp_vx > 0) {
          sp_do_fall();
        } else {
          splash_center.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease';
          splash_center.style.transform  = '';
          splash_center.style.opacity    = '';
          sp_cur_x = 0; sp_cur_y = 0;
        }
      });

      // 터치 드래그
      splash_center.addEventListener("touchstart", (e) => {
        if (splash_dismissed || sp_falling) return;
        const t = e.touches[0];
        sp_drag    = true;
        sp_start_x = t.clientX - sp_cur_x;
        sp_start_y = t.clientY - sp_cur_y;
        splash_center.style.transition = 'none';
      }, { passive: true });

      document.addEventListener("touchmove", (e) => {
        if (!sp_drag || splash_dismissed || sp_falling) return;
        const t  = e.touches[0];
        const nx = t.clientX - sp_start_x;
        const ny = t.clientY - sp_start_y;
        sp_vx    = nx - sp_cur_x;
        sp_cur_x = nx; sp_cur_y = ny;
        const tilt = Math.min(50, Math.max(-15, sp_cur_x * 0.08));
        splash_center.style.transform =
          `translate(${sp_cur_x.toFixed(1)}px, ${sp_cur_y.toFixed(1)}px) rotate(${tilt.toFixed(1)}deg)`;
        if (sp_cur_x > window.innerWidth * 0.28) sp_do_fall();
      }, { passive: true });

      document.addEventListener("touchend", () => {
        if (!sp_drag) return;
        sp_drag = false;
        if (sp_falling) return;
        if (sp_cur_x > 120 && sp_vx > 0) {
          sp_do_fall();
        } else {
          splash_center.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
          splash_center.style.transform  = '';
          sp_cur_x = 0; sp_cur_y = 0;
        }
      });
    }
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
    });
    current_section_idx = idx;

    // 영상 스킵 버튼: 비디오 섹션일 때만 표시
    const _skip_btn = document.getElementById("video-skip-btn");
    if (_skip_btn) {
      const is_video = h_sections[idx] && h_sections[idx].id === "video-section";
      if (is_video) {
        _skip_btn.classList.add("visible");
      } else {
        _skip_btn.classList.remove("visible");
      }
    }
  };

  const last_video = document.querySelector(".h-section:last-child video");

  // ── 페이지드 휠 네비게이션 ──
  let pg_nav_lock  = false;
  const PG_DELAY   = 650;

  const go_to_section = (idx) => {
    idx = Math.max(0, Math.min(section_count - 1, idx));
    show_section(idx);
    h_scroll_progress = section_count > 1 ? idx / (section_count - 1) : 0;
    if (prog_bar) prog_bar.style.width = `${(h_scroll_progress * 100).toFixed(2)}%`;
    update_penguin();
    // 비디오 섹션 진입 시 재생
    if (last_video) {
      if (idx === section_count - 1) {
        last_video.style.transform = "";
        last_video.style.opacity   = "";
        last_video.play && last_video.play().catch(() => {});
      }
    }
  };

  const page_nav = (dir) => {
    const next = current_section_idx + dir;

    // 마지막 섹션에서 아래로 → 수중화면 (lock이 풀린 후에만 전환)
    if (next >= section_count) {
      if (!uw_end_shown && !pg_nav_lock) {
        uw_end_shown = true;
        // show_uw_screen 함수 직접 호출 또는 uw_el_global로 직접 처리
        if (show_uw_screen) {
          show_uw_screen();
        } else {
          // fallback: 직접 수중화면 활성화
          const _uw = document.getElementById("underwater");
          const _pg = document.getElementById("uw-penguin");
          if (_uw) {
            if (_pg) { _pg.style.transform = ""; _pg.style.opacity = ""; _pg.style.filter = ""; }
            _uw.classList.remove("active","fade-out");
            _uw.style.visibility = "";
            requestAnimationFrame(() => {
              _uw.classList.add("active");
              const hdr = document.querySelector(".header");
              if (hdr) hdr.classList.add("uw-visible");
            });
          }
        }
      }
      return;
    }

    if (next < 0 || pg_nav_lock) return;
    pg_nav_lock = true;
    go_to_section(next);
    setTimeout(() => { pg_nav_lock = false; }, PG_DELAY);
  };

  // 휠 이벤트 — 1회 = 1섹션
  window.addEventListener("wheel", (e) => {
    if (!penguin_ready) return;
    if (uw_el_global && uw_el_global.classList.contains("active")) return;
    e.preventDefault();
    page_nav(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  // 터치 스와이프 — 1회 = 1섹션
  let main_touch_y = 0;
  window.addEventListener("touchstart", (e) => {
    if (!penguin_ready) return;
    main_touch_y = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener("touchend", (e) => {
    if (!penguin_ready) return;
    if (uw_el_global && uw_el_global.classList.contains("active")) return;
    const dy = main_touch_y - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) page_nav(dy > 0 ? 1 : -1);
  }, { passive: true });

  const update_h_scroll = () => {}; // 레거시 호환용 빈 함수

  /* ── 섹션 번호로 직접 이동 (헤더 nav용) ── */
  window.scrollToSection = (index) => {
    if (uw_el_global && uw_el_global.classList.contains("active")) {
      // 수중화면 닫기
      uw_el_global.classList.remove("active");
      uw_el_global.classList.add("fade-out");
      const hdr = document.querySelector(".header");
      if (hdr) hdr.classList.remove("uw-visible");
      setTimeout(() => go_to_section(index), 150);
      return;
    }
    go_to_section(index);
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

  /* 스핀 변신 상태 — 0: 어린펭귄, 1: 자전거, 2: 황제펭귄 */
  let penguin_stage   = 0;   // 현재 단계
  let penguin_spinning = false;

  const spin_to_stage = (stage) => {
    if (penguin_spinning || !penguin_el || stage === penguin_stage) return;
    penguin_spinning = true;
    penguin_el.classList.add("spinning");

    setTimeout(() => {
      // 클래스 초기화 후 단계별 적용
      penguin_el.classList.remove("grown", "fully-grown");
      if (stage === 1) penguin_el.classList.add("grown");
      else if (stage === 2) penguin_el.classList.add("fully-grown");
    }, 300);

    setTimeout(() => {
      penguin_el.classList.remove("spinning");
      penguin_spinning = false;
      penguin_stage    = stage;
    }, 560);
  };

  // 하위호환 래퍼 (기존 spin_to 호출 대비)
  const spin_to = (to_grown) => spin_to_stage(to_grown ? 1 : 0);
  const get_P_W = () => penguin_el ? penguin_el.offsetWidth : Math.round(window.innerHeight / 3 * 0.6);

  /* 드래그 상태 */
  let p_drag_active  = false;
  let p_drag_start_x = 0;
  let p_drag_origin  = 0;
  let p_manual_x     = null; // null이면 스크롤 기반, 숫자면 수동 위치

  const update_penguin = () => {
    if (!penguin_ready || !penguin_el) return;
    if (p_drag_active || p_manual_x !== null) return;

    const progress = h_scroll_progress;
    const P_W      = get_P_W();
    const travel   = window.innerWidth - P_W - P_MARGIN * 2;
    const x        = P_MARGIN + progress * travel;

    // 수평 이동만 — Y, 회전 없음
    penguin_el.style.transform = `translateX(${x.toFixed(1)}px)`;

    if (!p_shown) {
      p_shown = true;
      penguin_el.classList.add("visible");
    }

    // 섹션 기반 변신: 0~5→어린펭귄 / 6~→황제펭귄
    const idx = current_section_idx;
    const target_stage = idx < 6 ? 0 : 2;
    if (target_stage !== penguin_stage) spin_to_stage(target_stage);

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

    // 섹션 기반 변신: 0~5→어린펭귄 / 6~→황제펭귄
    const drag_idx = Math.min(section_count - 1, Math.floor(prog * section_count));
    const target_stage = drag_idx < 6 ? 0 : 2;
    if (target_stage !== penguin_stage) spin_to_stage(target_stage);
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
      // 드래그 끝난 위치를 h_scroll_progress에 반영 → 제자리 고정
      if (p_manual_x !== null) {
        const P_W    = get_P_W();
        const travel = window.innerWidth - P_W - P_MARGIN * 2;
        h_scroll_progress = Math.max(0, Math.min(1, (p_manual_x - P_MARGIN) / travel));
      }
      p_scroll_timer = setTimeout(() => {
        penguin_el.classList.remove("walking");
        p_manual_x = null;
        // update_penguin 호출 안 함 → 펭귄 현재 위치 유지
      }, 300);
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
      // 드래그 끝난 위치를 h_scroll_progress에 반영 → 제자리 고정
      if (p_manual_x !== null) {
        const P_W    = get_P_W();
        const travel = window.innerWidth - P_W - P_MARGIN * 2;
        h_scroll_progress = Math.max(0, Math.min(1, (p_manual_x - P_MARGIN) / travel));
      }
      clearTimeout(p_scroll_timer);
      p_scroll_timer = setTimeout(() => {
        penguin_el.classList.remove("walking");
        p_manual_x = null;
        // update_penguin 호출 안 함 → 펭귄 현재 위치 유지
      }, 300);
    });
  }

  window.addEventListener("scroll", update_penguin, { passive: true });
  window.addEventListener("resize", update_penguin);

  /* ── 영상 스킵 버튼: 누르면 수중화면(img9/10/11)으로 ── */
  const video_skip_btn = document.getElementById("video-skip-btn");

  if (video_skip_btn) {
    video_skip_btn.addEventListener("click", () => {
      // 버튼 숨기기
      video_skip_btn.classList.remove("visible");
      // uw_end_shown 플래그 세팅 (page_nav 중복 방지)
      uw_end_shown = true;
      if (show_uw_screen) {
        show_uw_screen();
      } else {
        const _uw = document.getElementById("underwater");
        const _pg = document.getElementById("uw-penguin");
        if (_uw) {
          if (_pg) { _pg.style.transform = ""; _pg.style.opacity = ""; _pg.style.filter = ""; }
          _uw.classList.remove("active", "fade-out");
          _uw.style.visibility = "";
          requestAnimationFrame(() => {
            _uw.classList.add("active");
            const hdr = document.querySelector(".header");
            if (hdr) hdr.classList.add("uw-visible");
          });
        }
      }
    });
  }

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
        if (vid_idx_global !== -1) {
          show_section(vid_idx_global);
          // 포트폴리오 줌 경로에서도 영상 재생
          if (last_video) {
            last_video.style.transform = "";
            last_video.style.opacity   = "";
            last_video.play && last_video.play().catch(() => {});
          }
        }
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

  /* ══════════════════════════════════════
     스플래시 얼음 조각 — 집결 후 펭귄 낙하 시 폭발
     ══════════════════════════════════════ */
  const sp_ice_els = Array.from(document.querySelectorAll('.sp-ice'));
  if (sp_ice_els.length) {
    const ICE_PAD = 60;
    let ice_mx = -999, ice_my = -999;
    let ice_mode = 'gather'; // 'gather' | 'explode'

    document.addEventListener('mousemove', e => { ice_mx = e.clientX; ice_my = e.clientY; });

    // 클러스터 형태로 모여있는 배치
    const GATHER_PRESETS = [
      [0.58, 0.22], [0.70, 0.18], [0.82, 0.24],   // 상단 행
      [0.62, 0.42], [0.76, 0.38], [0.88, 0.44],   // 중간 행
      [0.70, 0.60],                                  // 하단
    ];
    const calc_gather_targets = (count) => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      return Array.from({ length: count }, (_, i) => {
        const [px, py] = GATHER_PRESETS[i % GATHER_PRESETS.length];
        return {
          tx: W * px + (Math.random() - 0.5) * W * 0.03,
          ty: H * py + (Math.random() - 0.5) * H * 0.04,
        };
      });
    };

    const gather_targets = calc_gather_targets(sp_ice_els.length);

    const ice_chunks = sp_ice_els.map((el, i) => {
      // 초기 위치: gather 타겟(우측 바다) 근처에서 시작
      const ox = gather_targets[i].tx + (Math.random() - 0.5) * 60;
      const oy = gather_targets[i].ty + (Math.random() - 0.5) * 60;
      el.style.left      = '0';
      el.style.top       = '0';
      el.style.transform = `translate(${ox.toFixed(0)}px, ${oy.toFixed(0)}px)`;
      return {
        el,
        x: ox, y: oy,
        ox, oy,
        vx: 0, vy: 0,
        tx: gather_targets[i].tx,
        ty: gather_targets[i].ty,
        spd:   0.09 + Math.random() * 0.07,
        phase: Math.random() * Math.PI * 2,
        rot:   (Math.random() - 0.5) * 14,
      };
    });

    // 펭귄이 바다에 빠지면 → 얼음 위로 팡!
    window.addEventListener('penguin-splash', () => {
      ice_mode = 'explode';
      ice_chunks.forEach(f => {
        f.vx += (Math.random() - 0.5) * 22;
        f.vy -= 16 + Math.random() * 13;   // 강하게 위로
      });
    });

    // 스플래시 복원 → 얼음 초기 위치 리셋
    window.addEventListener('splash-restored', () => {
      ice_mode = 'gather';
      const gt = calc_gather_targets(sp_ice_els.length);
      ice_chunks.forEach((f, i) => {
        f.tx = gt[i].tx;
        f.ty = gt[i].ty;
        f.x  = f.ox + (Math.random() - 0.5) * 160;
        f.y  = f.oy + (Math.random() - 0.5) * 160;
        f.vx = 0;
        f.vy = 0;
      });
    });

    const ice_tick = (ts) => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const sp_active = document.body.classList.contains('splash-active');

      ice_chunks.forEach(f => {
        if (!sp_active) return;

        if (ice_mode === 'explode') {
          // 폭발 물리 — 위로 날아가며 중력 약간
          f.vx *= 0.965;
          f.vy *= 0.965;
          f.vy += 0.18;        // 중력 (너무 오래 날면 다시 내려오게)
          f.x  += f.vx;
          f.y  += f.vy;
          const bob  = Math.sin(ts * 0.00045 + f.phase) * 4;
          const tilt = f.rot + f.vx * 10;
          f.el.style.transform =
            `translate(${f.x.toFixed(1)}px, ${(f.y + bob).toFixed(1)}px) rotate(${tilt.toFixed(1)}deg)`;
          return;
        }

        // ── gather 모드: 펭귄 주변 집결 ──

        /* 마우스 회피 — 약하게 */
        const relX  = ice_mx - f.x - 50;
        const relY  = ice_my - f.y - 50;
        const mDist = Math.sqrt(relX * relX + relY * relY);
        if (mDist < 100 && mDist > 1) {
          const push = (1 - mDist / 100) * 0.6;
          f.vx -= (relX / mDist) * push;
          f.vy -= (relY / mDist) * push;
        }

        /* 집결 목표로 이동 — 강한 인력 */
        const dx   = f.tx - f.x;
        const dy   = f.ty - f.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 12) {
          // 도착 — 거의 정지, 아주 미세한 떨림만
          f.vx += (Math.random() - 0.5) * 0.008;
          f.vy += (Math.random() - 0.5) * 0.008;
        } else {
          f.vx += ((dx / dist) * f.spd - f.vx) * 0.045;
          f.vy += ((dy / dist) * f.spd - f.vy) * 0.045;
        }

        /* 강한 감쇠 & 위치 */
        f.vx *= 0.955;
        f.vy *= 0.955;
        f.x  += f.vx;
        f.y  += f.vy;

        /* 경계 반사 — 우측 바다 안으로만 */
        const SEA_X_MIN = W * 0.54;
        const SEA_X_MAX = W * 0.97;
        const SEA_Y_MIN = H * 0.33;
        const SEA_Y_MAX = H * 0.84;
        if (f.x < SEA_X_MIN) { f.x = SEA_X_MIN; f.vx =  Math.abs(f.vx) * 0.5; }
        if (f.x > SEA_X_MAX) { f.x = SEA_X_MAX; f.vx = -Math.abs(f.vx) * 0.5; }
        if (f.y < SEA_Y_MIN) { f.y = SEA_Y_MIN; f.vy =  Math.abs(f.vy) * 0.5; }
        if (f.y > SEA_Y_MAX) { f.y = SEA_Y_MAX; f.vy = -Math.abs(f.vy) * 0.5; }

        /* 둥실 + 회전 — 잔잔하게 */
        const bob  = Math.sin(ts * 0.00030 + f.phase) * 4;
        const tilt = f.rot + f.vx * 3;

        f.el.style.transform =
          `translate(${f.x.toFixed(1)}px, ${(f.y + bob).toFixed(1)}px) rotate(${tilt.toFixed(1)}deg)`;
      });

      requestAnimationFrame(ice_tick);
    };

    requestAnimationFrame(ice_tick);
  }

  /* ══════════════════════════════════════
     메인 눈보라 시스템
     ══════════════════════════════════════ */
  const main_snow_canvas = document.getElementById("main-snow-canvas");
  const main_snow_ctx    = main_snow_canvas ? main_snow_canvas.getContext("2d") : null;

  if (main_snow_canvas && main_snow_ctx) {
    let msw = window.innerWidth;
    let msh = window.innerHeight;
    main_snow_canvas.width  = msw;
    main_snow_canvas.height = msh;

    let ms_wind_target = 0, ms_wind = 0, ms_gust = 0, ms_last_mx = msw / 2;

    document.addEventListener("mousemove", (e) => {
      const speed   = Math.abs(e.clientX - ms_last_mx);
      ms_wind_target = (e.clientX - msw / 2) / (msw / 2) * 2.8;
      ms_gust        = Math.min(speed * 0.05, 3.0);
      ms_last_mx     = e.clientX;
    });

    // 큰 눈송이 + 작은 눈송이 혼합
    const ms_flakes = Array.from({ length: 220 }, (_, i) => ({
      x:      Math.random() * msw,
      y:      Math.random() * msh,
      r:      i < 40 ? Math.random() * 3.5 + 1.2   // 큰 눈송이
                     : Math.random() * 1.8 + 0.3,   // 작은 눈송이
      speed:  i < 40 ? Math.random() * 1.2 + 0.6
                     : Math.random() * 2.2 + 0.4,
      drift:  (Math.random() - 0.5) * 0.6,
      flut:   Math.random() * Math.PI * 2,
      flut_sp:Math.random() * 0.022 + 0.006,
      alpha:  i < 40 ? Math.random() * 0.55 + 0.25
                     : Math.random() * 0.35 + 0.10,
      wobble: Math.random() * 0.8 + 0.2,  // 좌우 흔들림 강도
    }));

    const tick_main_snow = () => {
      const is_active = penguin_ready &&
                        current_section_idx === 0 &&
                        !(uw_el_global && uw_el_global.classList.contains("active"));

      // 첫 섹션(홈)에서만 표시
      if (is_active) {
        main_snow_canvas.classList.add("visible");
      } else {
        main_snow_canvas.classList.remove("visible");
      }

      main_snow_ctx.clearRect(0, 0, msw, msh);
      ms_wind += (ms_wind_target - ms_wind) * 0.035;
      ms_gust *= 0.92;
      const tw = ms_wind + ms_gust;

      ms_flakes.forEach(f => {
        f.flut += f.flut_sp;
        f.x    += f.drift + tw + Math.sin(f.flut) * f.wobble;
        f.y    += f.speed + Math.abs(tw) * 0.12;

        // 화면 밖으로 나가면 위에서 재등장
        if (f.y > msh + 8)  { f.y = -8;  f.x = Math.random() * msw; }
        if (f.x > msw + 8)  f.x = -8;
        if (f.x < -8)        f.x = msw + 8;

        // 큰 눈송이 — 별 모양
        if (f.r > 2.5) {
          main_snow_ctx.save();
          main_snow_ctx.translate(f.x, f.y);
          main_snow_ctx.rotate(f.flut * 0.3);
          main_snow_ctx.strokeStyle = `rgba(210,230,255,${f.alpha})`;
          main_snow_ctx.lineWidth   = 0.8;
          for (let a = 0; a < 6; a++) {
            main_snow_ctx.beginPath();
            main_snow_ctx.moveTo(0, 0);
            main_snow_ctx.lineTo(
              Math.cos((a / 6) * Math.PI * 2) * f.r * 2.2,
              Math.sin((a / 6) * Math.PI * 2) * f.r * 2.2
            );
            main_snow_ctx.stroke();
          }
          // 중심 원
          main_snow_ctx.beginPath();
          main_snow_ctx.arc(0, 0, f.r * 0.45, 0, Math.PI * 2);
          main_snow_ctx.fillStyle = `rgba(230,240,255,${f.alpha * 0.9})`;
          main_snow_ctx.fill();
          main_snow_ctx.restore();
        } else {
          // 작은 눈송이 — 원
          main_snow_ctx.beginPath();
          main_snow_ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          main_snow_ctx.fillStyle = `rgba(220,235,255,${f.alpha})`;
          main_snow_ctx.fill();
        }
      });

      requestAnimationFrame(tick_main_snow);
    };

    window.addEventListener("resize", () => {
      msw = window.innerWidth; msh = window.innerHeight;
      main_snow_canvas.width = msw; main_snow_canvas.height = msh;
    });

    tick_main_snow();
  }

  /* ══════════════════════════════════════
     수중 해파리 자유 수영 시스템
     ══════════════════════════════════════ */
  const uw_jellies = Array.from(document.querySelectorAll('.uw-jelly'));
  if (uw_jellies.length) {
    const JPAD  = 72;
    let   jmx   = -999, jmy = -999;

    document.addEventListener('mousemove', e => { jmx = e.clientX; jmy = e.clientY; });

    // 초기 위치 픽셀 변환 & CSS 드리프트 해제
    const jfish = uw_jellies.map((el, i) => {
      const lp = parseFloat(el.style.left) || (8 + i * 9);
      const tp = parseFloat(el.style.top)  || (10 + i * 8);
      const x  = lp / 100 * window.innerWidth;
      const y  = tp / 100 * window.innerHeight;
      el.style.left      = '0';
      el.style.top       = '0';
      el.style.animation = 'none';
      el.style.transform = `translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`;
      return {
        el, x, y, vx: 0, vy: 0,
        tx:    JPAD + Math.random() * (window.innerWidth  - JPAD * 2),
        ty:    JPAD + Math.random() * (window.innerHeight - JPAD * 2),
        spd:   0.55 + Math.random() * 0.75,
        idle:  Math.floor(Math.random() * 100),
        phase: Math.random() * Math.PI * 2,
      };
    });

    const jelly_tick = (ts) => {
      const W      = window.innerWidth;
      const H      = window.innerHeight;
      const active = uw_el_global && uw_el_global.classList.contains('active');

      jfish.forEach(f => {
        if (!active) return;

        /* 마우스 회피 */
        const relX  = jmx - f.x - 34;
        const relY  = jmy - f.y - 34;
        const mDist = Math.sqrt(relX * relX + relY * relY);
        if (mDist < 150 && mDist > 1) {
          const push = (1 - mDist / 150) * 2.4;
          f.vx -= (relX / mDist) * push;
          f.vy -= (relY / mDist) * push;
        }

        /* 목표 지점 추적 */
        const dx   = f.tx - f.x;
        const dy   = f.ty - f.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 40) {
          f.idle--;
          if (f.idle <= 0) {
            f.tx   = JPAD + Math.random() * (W - JPAD * 2);
            f.ty   = JPAD + Math.random() * (H - JPAD * 2.5);
            f.idle = 60 + Math.floor(Math.random() * 180);
          }
        } else {
          f.vx += ((dx / dist) * f.spd - f.vx) * 0.026;
          f.vy += ((dy / dist) * f.spd - f.vy) * 0.026;
        }

        /* 속도 감쇠 & 위치 갱신 */
        f.vx *= 0.965;
        f.vy *= 0.965;
        f.x  += f.vx;
        f.y  += f.vy;

        /* 경계 반사 */
        if (f.x < JPAD)           { f.x = JPAD;           f.vx =  Math.abs(f.vx) * 0.7; }
        if (f.x > W - JPAD)       { f.x = W - JPAD;       f.vx = -Math.abs(f.vx) * 0.7; }
        if (f.y < JPAD * 0.4)     { f.y = JPAD * 0.4;     f.vy =  Math.abs(f.vy) * 0.7; }
        if (f.y > H - JPAD * 1.6) { f.y = H - JPAD * 1.6; f.vy = -Math.abs(f.vy) * 0.7; }

        /* 둥실 (사인파) + 이동 방향 기울기 */
        const bob  = Math.sin(ts * 0.00072 + f.phase) * 9;
        const tilt = Math.max(-22, Math.min(22, f.vx * 8));

        f.el.style.transform =
          `translate(${f.x.toFixed(1)}px, ${(f.y + bob).toFixed(1)}px) rotate(${tilt.toFixed(1)}deg)`;
      });

      requestAnimationFrame(jelly_tick);
    };

    requestAnimationFrame(jelly_tick);
  }

  const orora_section = document.getElementById("orora-section");
  const img17_trigger = document.querySelector(".orora-center-img17");
  const orora_hobby_roll = document.querySelector(".orora-hobby-roll");
  const orora_hobby_close = document.querySelector(".orora-hobby-close");
  const orora_hobby_track = document.querySelector(".orora-hobby-track");
  const orora_hobby_prev = document.querySelector(".orora-hobby-prev");
  const orora_hobby_next = document.querySelector(".orora-hobby-next");

  if (orora_section && img17_trigger && orora_hobby_roll && orora_hobby_track) {
    let hobby_slide = 0;
    let hobby_auto_timer = null;

    const update_hobby_slide = () => {
      const first_img = orora_hobby_track.querySelector("img");
      if (!first_img) return;
      const gap = parseFloat(getComputedStyle(orora_hobby_track).columnGap) || 24;
      const step = first_img.getBoundingClientRect().width + gap;
      const max_slide = Math.max(0, orora_hobby_track.children.length - 3);
      hobby_slide = Math.max(0, Math.min(max_slide, hobby_slide));
      orora_hobby_track.style.setProperty("--slide-x", `${(-hobby_slide * step).toFixed(1)}px`);
    };

    const stop_hobby_auto = () => {
      if (!hobby_auto_timer) return;
      clearInterval(hobby_auto_timer);
      hobby_auto_timer = null;
    };

    const start_hobby_auto = () => {
      stop_hobby_auto();
      hobby_auto_timer = setInterval(() => {
        if (!orora_section.classList.contains("hobby-open")) {
          stop_hobby_auto();
          return;
        }
        const max_slide = Math.max(0, orora_hobby_track.children.length - 3);
        hobby_slide = hobby_slide >= max_slide ? 0 : hobby_slide + 1;
        update_hobby_slide();
      }, 3200);
    };

    const set_orora_hobbies = (is_open) => {
      orora_section.classList.toggle("hobby-open", is_open);
      orora_hobby_roll.setAttribute("aria-hidden", is_open ? "false" : "true");
      const penguin_el2 = document.getElementById("penguin");
      if (penguin_el2) penguin_el2.classList.toggle("hobby-mode", is_open);
      if (is_open) {
        hobby_slide = 0;
        requestAnimationFrame(update_hobby_slide);
        start_hobby_auto();
      } else {
        stop_hobby_auto();
      }
    };

    const toggle_orora_hobbies = () => set_orora_hobbies(!orora_section.classList.contains("hobby-open"));

    img17_trigger.addEventListener("click", toggle_orora_hobbies);
    img17_trigger.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      toggle_orora_hobbies();
    });

    // 왼쪽 펭귄(glitch-img-switch) 클릭 → 증명사진 인라인 토글
    const glitch_switch = orora_section.querySelector(".glitch-img-switch");

    if (glitch_switch) {
      glitch_switch.addEventListener("click", () => {
        glitch_switch.classList.toggle("id-shown");
      });

      // 머리 쓸어넘기기 캔버스 파티클
      const hair_canvas = document.getElementById("hair-sweep-canvas");
      if (hair_canvas) {
        const hctx = hair_canvas.getContext("2d");
        let hair_particles = [];
        let hair_raf = null;
        let is_sweeping = false;

        const resize_hair_canvas = () => {
          hair_canvas.width  = glitch_switch.offsetWidth;
          hair_canvas.height = glitch_switch.offsetHeight;
        };
        resize_hair_canvas();
        window.addEventListener("resize", resize_hair_canvas);

        const spawn_sweep = () => {
          const W = hair_canvas.width;
          const H = hair_canvas.height;
          // 머리 위쪽(상단 40%) 에서 양쪽으로 퍼지는 선들
          for (let i = 0; i < 28; i++) {
            const side   = Math.random() > 0.5 ? 1 : -1; // 좌우
            const startX = W * 0.5 + (Math.random() - 0.5) * W * 0.18;
            const startY = H * (0.05 + Math.random() * 0.30);
            const speed  = 3.5 + Math.random() * 4;
            const angle  = side * (Math.PI * (0.05 + Math.random() * 0.25));
            hair_particles.push({
              x: startX, y: startY,
              vx: Math.cos(angle) * speed * side,
              vy: Math.sin(angle) * speed * 0.4 + 0.5,
              life: 1.0,
              decay: 0.025 + Math.random() * 0.02,
              width: 1.2 + Math.random() * 1.8,
              len: 18 + Math.random() * 28,
              color: `hsla(${220 + Math.random() * 40}, 15%, ${88 + Math.random() * 12}%, `,
            });
          }
          // 광택 포인트들
          for (let i = 0; i < 12; i++) {
            hair_particles.push({
              x: W * (0.3 + Math.random() * 0.4),
              y: H * (0.02 + Math.random() * 0.25),
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.3) * 1.5,
              life: 1.0,
              decay: 0.04 + Math.random() * 0.03,
              width: 2 + Math.random() * 3,
              len: 0,   // dot
              color: `hsla(200, 80%, 95%, `,
              dot: true,
            });
          }
        };

        const draw_hair = () => {
          const W = hair_canvas.width;
          const H = hair_canvas.height;
          hctx.clearRect(0, 0, W, H);

          hair_particles = hair_particles.filter(p => p.life > 0);
          hair_particles.forEach(p => {
            hctx.save();
            if (p.dot) {
              hctx.beginPath();
              hctx.arc(p.x, p.y, p.width, 0, Math.PI * 2);
              hctx.fillStyle = p.color + p.life + ")";
              hctx.fill();
            } else {
              hctx.beginPath();
              hctx.moveTo(p.x, p.y);
              hctx.lineTo(p.x + p.vx * (p.len / 5), p.y + p.vy * (p.len / 5));
              hctx.strokeStyle = p.color + (p.life * 0.7) + ")";
              hctx.lineWidth = p.width * p.life;
              hctx.lineCap = "round";
              hctx.stroke();
            }
            hctx.restore();
            p.x    += p.vx;
            p.y    += p.vy;
            p.life -= p.decay;
          });

          if (hair_particles.length > 0 || is_sweeping) {
            hair_raf = requestAnimationFrame(draw_hair);
          } else {
            hctx.clearRect(0, 0, W, H);
            hair_raf = null;
          }
        };

        glitch_switch.addEventListener("mouseenter", () => {
          if (glitch_switch.classList.contains("id-shown")) return;
          is_sweeping = true;
          resize_hair_canvas();
          spawn_sweep();
          if (!hair_raf) hair_raf = requestAnimationFrame(draw_hair);
          // 0.5초 후 한 번 더 스폰 (양손 느낌)
          setTimeout(() => { if (is_sweeping) spawn_sweep(); }, 480);
        });

        glitch_switch.addEventListener("mouseleave", () => {
          is_sweeping = false;
        });
      }

      // 별 버튼 → 취미 사진 열기
      const star_btn = document.getElementById("orora-star-btn");
      if (star_btn) {
        star_btn.addEventListener("click", (e) => {
          e.stopPropagation();
          toggle_orora_hobbies();
        });
      }
    }

    if (orora_hobby_close) {
      orora_hobby_close.addEventListener("click", () => set_orora_hobbies(false));
    }

    if (orora_hobby_prev) {
      orora_hobby_prev.addEventListener("click", (e) => {
        e.stopPropagation();
        hobby_slide -= 1;
        update_hobby_slide();
      });
    }

    if (orora_hobby_next) {
      orora_hobby_next.addEventListener("click", (e) => {
        e.stopPropagation();
        hobby_slide += 1;
        update_hobby_slide();
      });
    }

    orora_hobby_roll.addEventListener("click", (e) => {
      if (e.target === orora_hobby_roll) set_orora_hobbies(false);
    });

    orora_hobby_roll.addEventListener("wheel", (e) => {
      if (!orora_section.classList.contains("hobby-open")) return;
      e.preventDefault();
      e.stopPropagation();
      hobby_slide += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) > 0 ? 1 : -1;
      update_hobby_slide();
    }, { passive: false });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") set_orora_hobbies(false);
      if (!orora_section.classList.contains("hobby-open")) return;
      if (e.key === "ArrowLeft") {
        hobby_slide -= 1;
        update_hobby_slide();
      }
      if (e.key === "ArrowRight") {
        hobby_slide += 1;
        update_hobby_slide();
      }
    });

    window.addEventListener("resize", update_hobby_slide);
  }

});
