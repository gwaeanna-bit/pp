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
      }
      const spw = document.getElementById("splash-penguin-wrap");
      if (spw) {
        spw.style.transition = "none";
        spw.style.transform  = "";
        spw.style.opacity    = "";
        spw.style.cursor     = "grab";
      }
      const sp = document.getElementById("splash-penguin-spin");
      if (sp) { sp.style.transform = ""; }

      // 수중 화면 초기화
      uw_accum    = 0;
      uw_done     = false;
      uw_surfaced = false;
      uw_end_shown = false;
      if (uw_el) {
        uw_el.classList.remove("active", "fade-out");
        uw_el.style.visibility = "";
      }
      // surface-reveal 초기화
      const sr_reset = document.getElementById("surface-reveal");
      if (sr_reset) {
        sr_reset.classList.remove("active", "fade-out");
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

    // 로고 클릭용 — splash_dismissed 체크 없이 강제 복원
    window.goto_main = () => {
      // 플래그 강제 초기화
      splash_dismissed = true; // restore_splash 조건 통과용
      uw_done     = false;
      uw_accum    = 0;
      uw_surfaced = false;
      uw_end_shown = false;
      // 오버레이 정리
      const _sr = document.getElementById("surface-reveal");
      if (_sr) _sr.classList.remove("active", "fade-out");
      if (uw_el) { uw_el.classList.remove("active", "fade-out"); uw_el.style.visibility = ""; }
      // 스플래시 복원
      restore_splash();
    };

    window.addEventListener("scroll", () => {
      // uw_done(수중 완료) 이후에는 스플래시 복원 안 함
      if (window.scrollY === 0 && splash_dismissed && !uw_done) {
        restore_splash();
      }
    }, { passive: true });

    /* ── 스플래시 펭귄 — 드래그앤드롭으로 바다에 빠뜨리기 ── */
    const splash_center = document.getElementById("splash-center");
    const splash_penguin_wrap = document.getElementById("splash-penguin-wrap");
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
      if (splash_penguin_wrap) {
        splash_penguin_wrap.style.transition =
          'transform 0.9s cubic-bezier(0.55,0,1,0.45), opacity 0.7s ease';
        splash_penguin_wrap.style.transform =
          `translate(${(sp_cur_x + window.innerWidth * 0.35).toFixed(0)}px, ${(sp_cur_y + 200).toFixed(0)}px) rotate(95deg)`;
        splash_penguin_wrap.style.opacity = '0';
      }
      setTimeout(() => dismiss_splash(), 900);
    };

    // 마우스 드래그 — 펭귄만 움직이고 텍스트는 고정
    if (splash_center) {
      splash_center.style.cursor = 'grab';

      splash_center.addEventListener("mousedown", (e) => {
        if (splash_dismissed || sp_falling) return;
        sp_drag    = true;
        sp_start_x = e.clientX - sp_cur_x;
        sp_start_y = e.clientY - sp_cur_y;
        splash_center.style.cursor = 'grabbing';
        if (splash_penguin_wrap) {
          splash_penguin_wrap.style.transition = 'none';
          splash_penguin_wrap.style.animation = 'none';
          splash_penguin_wrap.style.opacity = '1';
        }
        e.preventDefault();
      });

      document.addEventListener("mousemove", (e) => {
        if (!sp_drag || splash_dismissed || sp_falling) return;
        const nx = e.clientX - sp_start_x;
        const ny = e.clientY - sp_start_y;
        sp_vx   = nx - sp_cur_x;
        sp_cur_x = nx; sp_cur_y = ny;
        const tilt = Math.min(50, Math.max(-15, sp_cur_x * 0.08));
        splash_penguin_wrap.style.transform =
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
          if (splash_penguin_wrap) {
            splash_penguin_wrap.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
            splash_penguin_wrap.style.transform  = '';
            splash_penguin_wrap.style.opacity    = '1';
          }
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
        if (splash_penguin_wrap) {
          splash_penguin_wrap.style.transition = 'none';
          splash_penguin_wrap.style.animation = 'none';
          splash_penguin_wrap.style.opacity = '1';
        }
      }, { passive: true });

      document.addEventListener("touchmove", (e) => {
        if (!sp_drag || splash_dismissed || sp_falling) return;
        const t  = e.touches[0];
        const nx = t.clientX - sp_start_x;
        const ny = t.clientY - sp_start_y;
        sp_vx    = nx - sp_cur_x;
        sp_cur_x = nx; sp_cur_y = ny;
        const tilt = Math.min(50, Math.max(-15, sp_cur_x * 0.08));
        splash_penguin_wrap.style.transform =
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
          if (splash_penguin_wrap) {
            splash_penguin_wrap.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
            splash_penguin_wrap.style.transform  = '';
          }
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

  // 트랙 높이 = 섹션 수 × 뷰포트 높이 × 6 (스크롤 여유 — 패널당 600vh)
  const setup_h_track = () => {
    if (!h_track || !h_rail) return;
    h_track.style.height = `${section_count * window.innerHeight * 6}px`;
    h_rail.style.width   = `${section_count * window.innerWidth}px`;
  };

  const pp_sec_idx = h_sections.findIndex(s => s.id === "pp-section");

  // 섹션 전환 — 페이드 + 스케일
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
      if (is_video) _skip_btn.classList.add("visible");
      else          _skip_btn.classList.remove("visible");
    }

  };

  const last_video = document.querySelector(".h-section:last-child video");

  // ── 페이지드 휠 네비게이션 ──
  let pg_nav_lock  = false;
  const PG_DELAY   = 1700;

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

  const section_scroll_target = (idx) => {
    const trackTop = h_track ? h_track.offsetTop : 0;
    const trackScrollable = h_track ? (h_track.offsetHeight - window.innerHeight) : 0;
    return trackTop + (idx / Math.max(1, section_count - 1)) * trackScrollable;
  };

  const page_nav = (dir) => {
    const next = current_section_idx + dir;

    // 마지막 섹션에서 아래로 → 수중화면
    if (next >= section_count) {
      if (!uw_end_shown && !pg_nav_lock) {
        uw_end_shown = true;
        if (show_uw_screen) {
          show_uw_screen();
        } else {
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
    // CSS 트랜지션으로 레일 직접 이동 (page scroll과 분리)
    const target_x = next * window.innerWidth;
    if (h_rail) {
      h_rail.style.transition = 'transform 1.8s cubic-bezier(0.77, 0, 0.175, 1)';
      h_rail.style.transform  = `translateX(${-target_x}px)`;
    }
    go_to_section(next);
    // 페이지 스크롤을 즉시 동기화해서 update_h_scroll 기준점 맞춤
    window.scrollTo(0, section_scroll_target(next));
    setTimeout(() => {
      if (h_rail) h_rail.style.transition = '';
      pg_nav_lock = false;
    }, PG_DELAY);
  };

  // 휠 이벤트 — h-track 영역 안에서만 page_nav 작동
  window.addEventListener("wheel", (e) => {
    if (!penguin_ready) return;
    if (uw_el_global && uw_el_global.classList.contains("active")) return;
    if (!h_track) return;
    const hTop    = h_track.offsetTop;
    const hBottom = hTop + h_track.offsetHeight;
    // h-track 범위 밖이면 일반 스크롤 허용
    if (window.scrollY < hTop || window.scrollY >= hBottom) return;
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

  const update_h_scroll = () => {
    if (!h_track || !h_rail) return;
    // 레일 애니메이션 중에는 page scroll이 transform을 덮어쓰지 않도록 차단
    if (pg_nav_lock) return;
    const trackTop        = h_track.offsetTop;
    const trackScrollable = h_track.offsetHeight - window.innerHeight;
    const scrolled        = Math.max(0, window.scrollY - trackTop);
    const progress        = trackScrollable > 0 ? Math.min(1, scrolled / trackScrollable) : 0;
    const maxX            = (section_count - 1) * window.innerWidth;
    h_rail.style.transform = `translateX(${-(progress * maxX).toFixed(1)}px)`;
    h_scroll_progress     = progress;
    const idx = Math.min(section_count - 1, Math.floor(progress * section_count));
    if (idx !== current_section_idx) show_section(idx);
    update_penguin();
  };

  /* ── 섹션 번호로 직접 이동 (헤더 nav용) ── */
  window.scrollToSection = (index) => {
    if (uw_el_global && uw_el_global.classList.contains("active")) {
      uw_el_global.classList.remove("active");
      uw_el_global.classList.add("fade-out");
      const hdr = document.querySelector(".header");
      if (hdr) hdr.classList.remove("uw-visible");
      setTimeout(() => window.scrollTo({ top: section_scroll_target(index), behavior: "smooth" }), 150);
      return;
    }
    window.scrollTo({ top: section_scroll_target(index), behavior: "smooth" });
  };

  // 초기 실행
  show_section(0);
  setup_h_track();
  window.addEventListener("load",   () => { setup_h_track(); update_h_scroll(); update_vi_scroll(); update_ab_scroll(); update_nav_history(); });
  window.addEventListener("resize", () => { setup_h_track(); update_h_scroll(); update_vi_scroll(); update_ab_scroll(); });
  window.addEventListener("scroll", () => { update_h_scroll(); update_vi_scroll(); update_ab_scroll(); update_pf_scroll(); update_nav_history(); }, { passive: true });

  /* ══════════════════════════════════════
     소개 세로 스크롤 섹션 — 스크롤 트래킹
     ══════════════════════════════════════ */
  const vi_section    = document.getElementById("vertical-intro");
  const vi_penguin_el = document.getElementById("vi-penguin");
  const vi_trans_grad = document.getElementById("vi-trans-grad");
  const vi_blocks     = vi_section
    ? Array.from(vi_section.querySelectorAll(".vi-block")) : [];
  const vi_text_panel_el  = document.getElementById("vi-text-panel");
  const vi_image_panel_el = document.getElementById("vi-image-panel");

  const update_vi_scroll = () => {
    if (!vi_section || !vi_penguin_el) return;
    const rect     = vi_section.getBoundingClientRect();
    const total    = vi_section.offsetHeight - window.innerHeight;
    const scrolled = Math.max(0, -rect.top);
    const p        = total > 0 ? Math.min(1, scrolled / total) : 0;

    // 패럴랙스: 글씨는 빠르게, 사진은 느리게 위로 이동
    if (vi_text_panel_el)  vi_text_panel_el.style.transform  = `translateY(${(-p * 100).toFixed(1)}px)`;
    if (vi_image_panel_el) vi_image_panel_el.style.transform = `translateY(${(-p *  50).toFixed(1)}px)`;

    // 펭귄: 화면 위에서 아래로 계속 내려가는 인터렉션
    const penguin_y   = -360 + p * 900;                          // 위(-360px) → 아래(540px)
    const op_in       = Math.min(1, p / 0.10);                   // 0~10% 페이드인
    const op_out      = Math.max(0, 1 - (p - 0.80) / 0.15);     // 80~95% 페이드아웃
    const swim_x = Math.sin(p * Math.PI * 6) * 22;   // 좌우 흔들림
    const swim_r = Math.sin(p * Math.PI * 6) * 10;   // 기울기
    vi_penguin_el.style.opacity   = Math.min(op_in, op_out).toFixed(3);
    vi_penguin_el.style.transform = `translateX(calc(-50% + ${swim_x.toFixed(1)}px)) translateY(${penguin_y.toFixed(1)}px) rotate(${swim_r.toFixed(1)}deg)`;

    // 스크롤 75% 이후 전환 그라데이션
    if (vi_trans_grad) {
      const t = Math.max(0, Math.min(1, (p - 0.75) / 0.25));
      vi_trans_grad.style.opacity = t.toFixed(3);
    }

    // 텍스트 블록: ab-feats 방식 — 아래(+VH*0.6)에서 위(-VH*0.5)로 전체 화면 이동
    const ease_vi     = t => 1 - Math.pow(1 - t, 3);
    const VH_vi       = window.innerHeight;
    const thresholds  = vi_blocks.map(b => parseFloat(b.dataset.at || 0));
    const next_thresh = [...thresholds.slice(1), 1.05];
    vi_blocks.forEach((block, i) => {
      const seg_start = thresholds[i];
      const seg_end   = next_thresh[i];
      const fp = Math.max(0, Math.min(1, (p - seg_start) / (seg_end - seg_start)));
      const ty = VH_vi * 0.6 - ease_vi(fp) * VH_vi * 1.1;
      const op = fp < 0.15 ? fp / 0.15 : (fp > 0.85 ? (1 - fp) / 0.15 : 1);
      block.style.opacity   = Math.max(0, op).toFixed(3);
      block.style.transform = `translateY(${ty.toFixed(1)}px)`;
    });
  };
  update_vi_scroll();

  /* ══════════════════════════════════════
     About 섹션 — 스크롤 트래킹
     ══════════════════════════════════════ */
  const ab_section    = document.getElementById("about-section");
  const ab_penguin_el = document.getElementById("ab-penguin");
  const ab_feats      = ab_section ? Array.from(ab_section.querySelectorAll(".ab-feat")) : [];
  const ab_namecard_el= document.getElementById("ab-namecard");
  const ab_shown      = new Set();

  const update_ab_scroll = () => {
    if (!ab_section || !ab_penguin_el) return;
    const rect    = ab_section.getBoundingClientRect();
    const total   = ab_section.offsetHeight - window.innerHeight;
    const scrolled = Math.max(0, -rect.top);
    const p        = total > 0 ? Math.min(1, scrolled / total) : 0;

    // 펭귄: p=0.05부터 등장, 천천히 떠오름
    const pa = Math.max(0, Math.min(1, (p - 0.05) / 0.25));
    ab_penguin_el.style.opacity   = pa.toFixed(3);
    ab_penguin_el.style.transform = `translateX(-50%) translateY(${((1 - pa) * 220).toFixed(1)}px)`;

    // 피처 블록: 하나씩 아래→위 전체 화면 이동 (vi-block 방식)
    const ease = t => 1 - Math.pow(1 - t, 3);
    const N   = ab_feats.length;
    const VH  = window.innerHeight;
    ab_feats.forEach((feat, i) => {
      const seg_start = i / N;          // 0 / 0.33 / 0.67
      const seg_end   = (i + 1) / N;    // 0.33 / 0.67 / 1.0
      const fp = Math.max(0, Math.min(1, (p - seg_start) / (seg_end - seg_start)));
      // 아래(+VH*0.6)에서 위(-VH*0.5) 로 이동
      const ty = VH * 0.6 - ease(fp) * VH * 1.1;
      // 입장 페이드인(0~15%), 퇴장 페이드아웃(85~100%)
      const op = fp < 0.15 ? fp / 0.15 : (fp > 0.85 ? (1 - fp) / 0.15 : 1);
      feat.style.opacity   = Math.max(0, op).toFixed(3);
      feat.style.transform = `translateY(${ty.toFixed(1)}px)`;
    });

    // 이름 카드: p=0.90부터 등장
    if (ab_namecard_el) {
      const np = ease(Math.max(0, Math.min(1, (p - 0.90) / 0.08)));
      ab_namecard_el.style.opacity   = np.toFixed(3);
      ab_namecard_el.style.transform = `translateX(-50%) translateY(${(40 * (1 - np)).toFixed(1)}px)`;
    }

    // About 배경 이미지 패럴랙스 (배경이 콘텐츠보다 느리게 이동)
    const ab_sticky_el = document.getElementById("about-sticky");
    if (ab_sticky_el) ab_sticky_el.style.backgroundPositionY = `${50 + p * 25}%`;
  };
  update_ab_scroll();

  /* ══════════════════════════════════════
     포트폴리오 섹션 — 스크롤 트래킹
     ══════════════════════════════════════ */
  const pf_section_el = document.getElementById("portfolio-section");
  const pf_cards      = pf_section_el
    ? Array.from(pf_section_el.querySelectorAll(".pf-card")) : [];
  const pf_penguin_el = document.getElementById("pf-penguin");

  const update_pf_scroll = () => {
    if (!pf_section_el || pf_cards.length === 0) return;
    const rect     = pf_section_el.getBoundingClientRect();
    const total    = pf_section_el.offsetHeight - window.innerHeight;
    const scrolled = Math.max(0, -rect.top);
    const p        = total > 0 ? Math.min(1, scrolled / total) : 0;

    const ease = t => 1 - Math.pow(1 - t, 3);
    const N  = pf_cards.length;
    const VH = window.innerHeight;

    // 펭귄: 화면 위쪽(-VH*0.25)에서 아래로 계속 내려가며 h-track 직전 페이드아웃
    if (pf_penguin_el) {
      const py     = -VH * 0.25 + ease(p) * VH * 1.3;
      const op_in  = Math.min(1, p / 0.08);
      const op_out = Math.max(0, 1 - (p - 0.82) / 0.10);
      const pf_swim_x = Math.sin(p * Math.PI * 6) * 22;
      const pf_swim_r = Math.sin(p * Math.PI * 6) * 10;
      pf_penguin_el.style.opacity   = Math.min(op_in, op_out).toFixed(3);
      pf_penguin_el.style.transform = `translateX(calc(-50% + ${pf_swim_x.toFixed(1)}px)) translateY(${py.toFixed(1)}px) rotate(${pf_swim_r.toFixed(1)}deg)`;
    }

    pf_cards.forEach((card, i) => {
      const seg_start = i / N;
      const seg_end   = (i + 1) / N;
      const fp = Math.max(0, Math.min(1, (p - seg_start) / (seg_end - seg_start)));
      const ty = VH * 0.65 - ease(fp) * VH * 1.15;
      const op = fp < 0.12 ? fp / 0.12 : (fp > 0.88 ? (1 - fp) / 0.12 : 1);
      card.style.opacity   = Math.max(0, op).toFixed(3);
      card.style.transform = `translateY(${ty.toFixed(1)}px)`;
    });
  };
  update_pf_scroll();


  /* ══════════════════════════════════════
     뒤로가기 내비게이션 (History API)
     ══════════════════════════════════════ */
  let _nav_key          = 'intro';
  let _nav_programmatic = false; // 프로그래밍 스크롤 중 push 억제
  history.replaceState({ nav: 'intro' }, '');

  const push_nav = (key) => {
    if (_nav_programmatic) return; // 자동 스크롤 중에는 push 안 함
    if (_nav_key === key) return;
    _nav_key = key;
    history.pushState({ nav: key }, '');
  };

  const update_nav_history = () => {
    if (_nav_programmatic) return;
    const sy        = window.scrollY;
    const aboutTop  = ab_section ? ab_section.offsetTop  : Infinity;
    const hTrackTop = h_track    ? h_track.offsetTop     : Infinity;
    if      (sy < aboutTop)   push_nav('intro');
    else if (sy < hTrackTop)  push_nav('about');
    else                      push_nav('h-' + current_section_idx);
  };

  window.addEventListener('popstate', (e) => {
    const key = e.state?.nav || 'intro';
    _nav_key          = key;    // 목표 섹션으로 즉시 설정 (중복 push 방지)
    _nav_programmatic = true;   // 스크롤 중 push 억제

    if (key === 'intro') {
      window.scrollTo({ top: vi_section ? vi_section.offsetTop : 0, behavior: 'smooth' });
    } else if (key === 'about') {
      window.scrollTo({ top: ab_section ? ab_section.offsetTop : 0, behavior: 'smooth' });
    } else if (key.startsWith('h-')) {
      const idx = parseInt(key.slice(2));
      if (!isNaN(idx)) window.scrollTo({ top: section_scroll_target(idx), behavior: 'smooth' });
    }

    // 스크롤 완료 후 억제 해제 (smooth scroll 여유 시간)
    setTimeout(() => { _nav_programmatic = false; }, 1600);
  });

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

    // h-track 진입 후에만 표시 (세로 스크롤 섹션에서는 숨김)
    const in_h_track = h_track && window.scrollY >= h_track.offsetTop - window.innerHeight * 0.3;
    if (in_h_track && current_section_idx >= 0) {
      if (!p_shown) p_shown = true;
      penguin_el.classList.add("visible");
    } else {
      penguin_el.classList.remove("visible");
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

    // 왼쪽 펭귄(glitch-img-switch) 클릭 → 증명사진 모달 팝업
    const id_modal      = document.getElementById("id-photo-modal");
    const id_modal_close = document.getElementById("id-photo-close");

    const open_id_modal  = () => { if (id_modal) { id_modal.classList.add("open"); id_modal.setAttribute("aria-hidden","false"); } };
    const close_id_modal = () => { if (id_modal) { id_modal.classList.remove("open"); id_modal.setAttribute("aria-hidden","true"); } };

    if (id_modal_close) id_modal_close.addEventListener("click", close_id_modal);
    if (id_modal) id_modal.addEventListener("click", (e) => { if (e.target === id_modal) close_id_modal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close_id_modal(); });

    const glitch_switch = orora_section.querySelector(".glitch-img-switch");

    if (glitch_switch) {
      glitch_switch.addEventListener("click", (e) => {
        e.stopPropagation();
        open_id_modal();
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

    // 드래그로 슬라이드
    let drag_start_x = null;
    let drag_moved = false;
    orora_hobby_track.addEventListener("mousedown", (e) => {
      drag_start_x = e.clientX;
      drag_moved = false;
      orora_hobby_track.style.cursor = "grabbing";
      orora_hobby_track.style.transition = "none";
    });
    window.addEventListener("mousemove", (e) => {
      if (drag_start_x === null) return;
      const dx = e.clientX - drag_start_x;
      if (Math.abs(dx) > 6) drag_moved = true;
      const first_img = orora_hobby_track.querySelector("img");
      if (!first_img) return;
      const gap = parseFloat(getComputedStyle(orora_hobby_track).columnGap) || 24;
      const step = first_img.getBoundingClientRect().width + gap;
      const base = -hobby_slide * step;
      orora_hobby_track.style.setProperty("--slide-x", `${(base + dx).toFixed(1)}px`);
    });
    window.addEventListener("mouseup", (e) => {
      if (drag_start_x === null) return;
      const dx = e.clientX - drag_start_x;
      orora_hobby_track.style.cursor = "grab";
      orora_hobby_track.style.transition = "";
      if (Math.abs(dx) > 50) {
        hobby_slide += dx < 0 ? 1 : -1;
      }
      update_hobby_slide();
      drag_start_x = null;
    });

    // 터치 드래그
    let touch_start_x = null;
    orora_hobby_track.addEventListener("touchstart", (e) => {
      touch_start_x = e.touches[0].clientX;
      orora_hobby_track.style.transition = "none";
    }, { passive: true });
    orora_hobby_track.addEventListener("touchmove", (e) => {
      if (touch_start_x === null) return;
      const dx = e.touches[0].clientX - touch_start_x;
      const first_img = orora_hobby_track.querySelector("img");
      if (!first_img) return;
      const gap = parseFloat(getComputedStyle(orora_hobby_track).columnGap) || 24;
      const step = first_img.getBoundingClientRect().width + gap;
      orora_hobby_track.style.setProperty("--slide-x", `${(-hobby_slide * step + dx).toFixed(1)}px`);
    }, { passive: true });
    orora_hobby_track.addEventListener("touchend", (e) => {
      if (touch_start_x === null) return;
      const dx = e.changedTouches[0].clientX - touch_start_x;
      orora_hobby_track.style.transition = "";
      if (Math.abs(dx) > 50) hobby_slide += dx < 0 ? 1 : -1;
      update_hobby_slide();
      touch_start_x = null;
    }, { passive: true });

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

  // pp-section 반짝이 → 취미 갤러리 공개
  const pp_star_btn = document.getElementById("pp-star-btn");
  const pp_hobby_gallery = document.querySelector("#pp-section .hobby-gallery");
  if (pp_star_btn && pp_hobby_gallery) {
    pp_star_btn.addEventListener("click", (e) => {
      e.stopPropagation();

      // 파티클 버스트
      const rect = pp_star_btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      for (let i = 0; i < 18; i++) {
        const p = document.createElement("div");
        const angle = (i / 18) * Math.PI * 2;
        const dist = 50 + Math.random() * 70;
        const size = 3 + Math.random() * 5;
        const hue = 40 + Math.round(Math.random() * 40);
        p.style.cssText = `
          position:fixed;left:${cx}px;top:${cy}px;
          width:${size}px;height:${size}px;border-radius:50%;
          background:hsl(${hue},100%,80%);
          pointer-events:none;z-index:9999;
          box-shadow:0 0 6px 2px hsla(${hue},100%,70%,0.8);
          transform:translate(-50%,-50%);
          transition:transform 0.7s cubic-bezier(0.16,1,0.3,1),opacity 0.7s ease;
        `;
        document.body.appendChild(p);
        p.getBoundingClientRect(); // reflow
        p.style.transform = `translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist}px))`;
        p.style.opacity = "0";
        setTimeout(() => p.remove(), 750);
      }

      // 갤러리 공개 & 버튼 숨김
      pp_hobby_gallery.classList.add("revealed");
      pp_star_btn.classList.add("hide");
    });
  }

  // ── section06 펭귄 변신 glitch-img-switch ──
  const s06_glitch = document.getElementById("section06-glitch");
  if (s06_glitch) {
    const s06_switch = s06_glitch.querySelector(".glitch-img-switch");
    if (s06_switch) {
      const s06_canvas = document.getElementById("hair-sweep-canvas");
      if (s06_canvas) {
        const s06_ctx = s06_canvas.getContext("2d");
        let s06_particles = [];
        let s06_raf = null;
        let s06_sweeping = false;

        const s06_resize = () => {
          s06_canvas.width  = s06_switch.offsetWidth;
          s06_canvas.height = s06_switch.offsetHeight;
        };
        s06_resize();
        window.addEventListener("resize", s06_resize);

        const s06_spawn = () => {
          const W = s06_canvas.width, H = s06_canvas.height;
          for (let i = 0; i < 28; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const startX = W * 0.5 + (Math.random() - 0.5) * W * 0.18;
            const startY = H * (0.05 + Math.random() * 0.30);
            const speed = 3.5 + Math.random() * 4;
            const angle = side * (Math.PI * (0.05 + Math.random() * 0.25));
            s06_particles.push({
              x: startX, y: startY,
              vx: Math.cos(angle) * speed * side,
              vy: Math.sin(angle) * speed * 0.4 + 0.5,
              life: 1.0, decay: 0.025 + Math.random() * 0.02,
              width: 1.2 + Math.random() * 1.8, len: 18 + Math.random() * 28,
              color: `hsla(${220 + Math.random() * 40}, 15%, ${88 + Math.random() * 12}%, `,
            });
          }
        };

        const s06_draw = () => {
          const W = s06_canvas.width, H = s06_canvas.height;
          s06_ctx.clearRect(0, 0, W, H);
          s06_particles = s06_particles.filter(p => p.life > 0);
          s06_particles.forEach(p => {
            s06_ctx.save();
            s06_ctx.beginPath();
            s06_ctx.moveTo(p.x, p.y);
            s06_ctx.lineTo(p.x + p.vx * (p.len / 5), p.y + p.vy * (p.len / 5));
            s06_ctx.strokeStyle = p.color + (p.life * 0.7) + ")";
            s06_ctx.lineWidth = p.width * p.life;
            s06_ctx.lineCap = "round";
            s06_ctx.stroke();
            s06_ctx.restore();
            p.x += p.vx; p.y += p.vy; p.life -= p.decay;
          });
          if (s06_particles.length > 0 || s06_sweeping) {
            s06_raf = requestAnimationFrame(s06_draw);
          } else {
            s06_ctx.clearRect(0, 0, W, H);
            s06_raf = null;
          }
        };

        s06_switch.addEventListener("mouseenter", () => {
          s06_sweeping = true;
          s06_resize();
          s06_spawn();
          if (!s06_raf) s06_raf = requestAnimationFrame(s06_draw);
          setTimeout(() => { if (s06_sweeping) s06_spawn(); }, 480);
        });

        s06_switch.addEventListener("mouseleave", () => {
          s06_sweeping = false;
        });
      }
    }
  }


});
