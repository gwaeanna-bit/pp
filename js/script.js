document.addEventListener("DOMContentLoaded", () => {

  /* ══════════════════════════════════════
     스플래시 화면 – 마우스 패럴랙스 + 클릭 해제
     ══════════════════════════════════════ */
  const splash      = document.getElementById("splash");
  const splash_bg   = document.getElementById("splash-bg");
  const splash_text = document.getElementById("splash-text");

  // 펭귄은 스플래시가 완전히 사라진 뒤에만 활성화
  let penguin_ready = false;

  if (splash && splash_bg) {
    // 마우스 목표 위치 (-1 ~ +1 정규화)
    let target_x = 0, target_y = 0;
    // 현재 보간 위치
    let cur_x = 0, cur_y = 0;
    let raf_id = null;

    const BG_RANGE   = 38;  // 배경 최대 이동 px
    const TEXT_RANGE = 10;  // 텍스트 최대 이동 px (반대 방향 → 깊이감)

    // ── 매 프레임 부드럽게 lerp ──
    const tick = () => {
      cur_x += (target_x - cur_x) * 0.07;
      cur_y += (target_y - cur_y) * 0.07;

      // 배경: 마우스 방향으로 이동 (카메라 팬 효과)
      splash_bg.style.transform =
        `translate(calc(-50% + ${(cur_x * BG_RANGE).toFixed(2)}px),
                   calc(-50% + ${(cur_y * BG_RANGE).toFixed(2)}px))`;

      // 텍스트: 반대 방향으로 미세 이동 (레이어 깊이감)
      if (splash_text) {
        splash_text.style.transform =
          `translate(calc(-50% + ${(-cur_x * TEXT_RANGE).toFixed(2)}px),
                     calc(-50% + ${(-cur_y * TEXT_RANGE).toFixed(2)}px))`;
      }

      raf_id = requestAnimationFrame(tick);
    };

    // ── 마우스 이동: 정규화된 위치 저장 ──
    splash.addEventListener("mousemove", (e) => {
      const cx = window.innerWidth  / 2;
      const cy = window.innerHeight / 2;
      target_x = (e.clientX - cx) / cx;
      target_y = (e.clientY - cy) / cy;
    });

    // ── 마우스가 나가면 중앙으로 복귀 ──
    splash.addEventListener("mouseleave", () => {
      target_x = 0;
      target_y = 0;
    });

    // ── 애니메이션 시작 ──
    raf_id = requestAnimationFrame(tick);

    // ── 클릭: 페이드 아웃 후 본 페이지 진입 ──
    splash.addEventListener("click", () => {
      if (raf_id) cancelAnimationFrame(raf_id);

      // 스플래시가 아직 보이는 동안 페이지 준비 (스크롤 점프 숨기기)
      document.body.classList.remove("content-locked");
      const chapter_start = document.getElementById("chapter-start");
      if (chapter_start) {
        window.scrollTo({ top: chapter_start.offsetTop, behavior: "instant" });
      }

      // 페이드 아웃
      splash.classList.add("fade-out");
      document.body.classList.remove("splash-active");

      setTimeout(() => {
        splash.remove();
        penguin_ready = true; // 스플래시 제거 후 펭귄 활성화
      }, 950);
    });
  }

  const open_buttons = document.querySelectorAll(".modal_btn");
  const modals = document.querySelectorAll(".modal");
  const close_buttons = document.querySelectorAll(".close_btn");

  open_buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const modal_id = button.getAttribute("data-modal");
      const target_modal = document.getElementById(modal_id);

      if (target_modal) {
        target_modal.classList.add("active");
      }
    });
  });

  close_buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const parent_modal = button.closest(".modal");
      if (parent_modal) {
        parent_modal.classList.remove("active");
      }
    });
  });

  modals.forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });
  });

  const intro = document.querySelector(".intro_reveal");
  const intro_start_button = document.querySelector(".intro_start_btn");
  const story_unlock_link = document.querySelector(".story_unlock_link");

  if (intro) {
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    let ticking = false;

    const updateIntroReveal = () => {
      const scroll_range = intro.offsetHeight - window.innerHeight;
      const progress = clamp((window.scrollY - intro.offsetTop) / scroll_range, 0, 1);

      intro.style.setProperty("--intro-progress", progress.toFixed(3));
      intro.style.setProperty("--intro-bg-scale", (1.04 - progress * 0.04).toFixed(3));
      intro.style.setProperty("--intro-bg-y", `${(-progress * 360).toFixed(1)}px`);
      intro.style.setProperty("--intro-overlay-alpha", (progress * 0.28).toFixed(3));
      intro.style.setProperty("--intro-content-offset", `${((1 - progress) * 48).toFixed(1)}px`);
      ticking = false;
    };

    const requestIntroRevealUpdate = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateIntroReveal);
    };

    updateIntroReveal();
    window.addEventListener("scroll", requestIntroRevealUpdate, { passive: true });
    window.addEventListener("resize", requestIntroRevealUpdate);
  }

  const unlockStory = () => {
    document.body.classList.remove("content-locked");

    const first_chapter = document.getElementById("chapter-start");
    if (first_chapter) {
      first_chapter.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (intro_start_button) {
    intro_start_button.addEventListener("click", unlockStory);
  }

  if (story_unlock_link) {
    story_unlock_link.addEventListener("click", (e) => {
      e.preventDefault();
      unlockStory();
    });
  }

  /* ══════════════════════════════════════
     스크롤 펭귄 캐릭터
     - 스크롤 진행도 0→1 에 따라 화면 왼쪽 → 오른쪽으로 이동
     - 스크롤 중 걷기 애니메이션 재생, 멈추면 정지
     ══════════════════════════════════════ */
  const penguin_el = document.getElementById("penguin");

  if (penguin_el) {
    let p_scroll_timer = null;
    let p_shown        = false;
    const P_W          = 280;  // 이미지 표시 너비 (px) — .penguin-img width 와 일치
    const P_MARGIN     = 40;   // 좌우 여백 (px)

    const update_penguin = () => {
      // 스플래시 제거 전에는 동작 안 함
      if (!penguin_ready) return;

      const max_scroll = document.documentElement.scrollHeight - window.innerHeight;
      if (max_scroll <= 0) return;

      // 스크롤 진행도 (0 ~ 1)
      const progress = Math.max(0, Math.min(1, window.scrollY / max_scroll));

      // 화면 가로 이동 거리
      const travel = window.innerWidth - P_W - P_MARGIN * 2;
      const x      = P_MARGIN + progress * travel;

      penguin_el.style.transform = `translateX(${x.toFixed(1)}px)`;

      // 첫 스크롤 시 페이드인 등장
      if (!p_shown) {
        p_shown = true;
        penguin_el.classList.add("visible");
      }

      // 걷기 애니메이션 ON
      penguin_el.classList.add("walking");
      clearTimeout(p_scroll_timer);

      // 스크롤 멈추면 애니메이션 OFF
      p_scroll_timer = setTimeout(() => {
        penguin_el.classList.remove("walking");
      }, 160);
    };

    window.addEventListener("scroll", update_penguin, { passive: true });
    window.addEventListener("resize", update_penguin);
  }

});
