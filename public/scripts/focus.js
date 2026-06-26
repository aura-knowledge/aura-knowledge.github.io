(() => {
  const articleBody = document.querySelector(".article-body");

  const prepareArticleSections = () => {
    if (!articleBody || articleBody.dataset.sectionsReady) return;
    articleBody.dataset.sectionsReady = "true";

    const headings = Array.from(articleBody.querySelectorAll(":scope > h2[id]"));
    headings.forEach((heading, index) => {
      const section = document.createElement("section");
      section.className = "article-section";
      section.dataset.articleSection = "";
      const content = document.createElement("div");
      content.className = "article-section-content";
      content.id = `${heading.id}-content`;

      articleBody.insertBefore(section, heading);
      section.append(heading, content);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "article-section-toggle";
      button.setAttribute("aria-expanded", "true");
      button.setAttribute("aria-controls", content.id);

      const label = document.createElement("span");
      label.textContent = heading.textContent.trim();
      const indicator = document.createElement("span");
      indicator.className = "article-section-indicator";
      indicator.setAttribute("aria-hidden", "true");
      indicator.textContent = "-";
      button.append(label, indicator);
      heading.textContent = "";
      heading.append(button);

      let next = section.nextSibling;
      while (next && !(next.nodeType === Node.ELEMENT_NODE && next.matches("h2[id], .claim-audit, .source-ledger, .provenance-panel, .related-reading, .agent-packet-link"))) {
        const current = next;
        next = next.nextSibling;
        content.append(current);
      }

      button.addEventListener("click", () => {
        const collapsed = section.toggleAttribute("data-collapsed");
        button.setAttribute("aria-expanded", String(!collapsed));
        indicator.textContent = collapsed ? "+" : "-";
      });
    });
  };

  prepareArticleSections();

  const progress = document.querySelector("[data-reading-progress]");
  const railLinks = Array.from(document.querySelectorAll("[data-focus-link]"));
  const markers = Array.from(document.querySelectorAll(".claim-marker[id]"));
  const articleLayout = document.querySelector(".article-layout");
  const focusRail = document.querySelector("[data-focus-rail]");
  const claimAudit = document.querySelector(".claim-audit");
  const claimCarousel = document.querySelector("[data-claim-carousel]");
  const carouselPrevious = document.querySelector("[data-claim-carousel-prev]");
  const carouselNext = document.querySelector("[data-claim-carousel-next]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const claimTextById = new Map(
    railLinks
      .map((link) => [
        link.getAttribute("data-focus-link"),
        link.querySelector("em")?.textContent.trim()
      ])
      .filter(([id, text]) => id && text)
  );

  markers.forEach((marker) => {
    if (!marker.textContent.trim()) {
      const number = marker.id.replace(/^claim-0*/, "");
      marker.textContent = `Claim C${number}`;
    }

    if (!marker.dataset.claim) {
      marker.dataset.claim = marker.id;
    }

    const claimText = claimTextById.get(marker.id);
    const parent = marker.parentElement;
    if (claimText && parent?.matches("p") && parent.textContent.trim() === marker.textContent.trim()) {
      parent.append(" ", claimText);
    }
  });

  const setActive = (id) => {
    railLinks.forEach((link) => {
      const active = link.getAttribute("data-focus-link") === id;
      link.toggleAttribute("aria-current", active);
      if (active) {
        link.scrollIntoView({
          block: "nearest",
          inline: "center",
          behavior: prefersReducedMotion ? "auto" : "smooth"
        });
      }
    });

    markers.forEach((marker) => {
      marker.toggleAttribute("data-active-claim", marker.id === id);
    });
  };

  if (markers.length > 0 && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible?.target?.id) {
          setActive(visible.target.id);
        }
      },
      {
        rootMargin: "-28% 0px -58% 0px",
        threshold: [0.1, 0.35, 0.7]
      }
    );

    markers.forEach((marker) => observer.observe(marker));
    setActive(markers[0].id);
  }

  const updateAnchorOffset = () => {
    if (!articleLayout || !focusRail) return;
    const railRect = focusRail.getBoundingClientRect();
    const railTop = Number.parseFloat(window.getComputedStyle(focusRail).top) || 0;
    const offset = Math.ceil(railTop + railRect.height + 24);
    articleLayout.style.setProperty("--article-anchor-offset", `${offset}px`);
  };

  const updateRailVisibility = () => {
    if (!focusRail || !claimAudit) return;
    const rect = claimAudit.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const active = rect.top < viewportHeight * 0.72 && rect.bottom > viewportHeight * 0.18;
    focusRail.toggleAttribute("data-audit-active", active);
  };

  const updateCarouselControls = () => {
    if (!claimCarousel || !carouselPrevious || !carouselNext) return;
    const maxScroll = claimCarousel.scrollWidth - claimCarousel.clientWidth;
    carouselPrevious.disabled = claimCarousel.scrollLeft <= 4;
    carouselNext.disabled = claimCarousel.scrollLeft >= maxScroll - 4;
  };

  const scrollClaimCarousel = (direction) => {
    if (!claimCarousel) return;
    const card = claimCarousel.querySelector(".claim-audit-card");
    const cardWidth = card?.getBoundingClientRect().width ?? claimCarousel.clientWidth * 0.85;
    const gap = Number.parseFloat(window.getComputedStyle(claimCarousel).columnGap) || 16;
    const distance = Math.min(cardWidth + gap, claimCarousel.clientWidth * 0.88);
    claimCarousel.scrollBy({
      left: direction * distance,
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });
  };

  carouselPrevious?.addEventListener("click", () => scrollClaimCarousel(-1));
  carouselNext?.addEventListener("click", () => scrollClaimCarousel(1));
  claimCarousel?.addEventListener("scroll", updateCarouselControls, { passive: true });
  claimCarousel?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    scrollClaimCarousel(event.key === "ArrowRight" ? 1 : -1);
  });

  const updateProgress = () => {
    if (!progress) return;
    const target = articleBody || document.documentElement;
    const rect = target.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const scrollable = Math.max(1, target.scrollHeight - window.innerHeight);
    const ratio = (window.scrollY - top) / scrollable;
    progress.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
  };

  updateAnchorOffset();
  updateRailVisibility();
  updateCarouselControls();
  updateProgress();
  window.addEventListener(
    "scroll",
    () => {
      updateProgress();
      updateRailVisibility();
    },
    { passive: true }
  );
  window.addEventListener("resize", () => {
    updateAnchorOffset();
    updateRailVisibility();
    updateCarouselControls();
    updateProgress();
  });
})();
