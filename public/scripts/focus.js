(() => {
  const articleBody = document.querySelector(".article-body");

  const railLinks = Array.from(document.querySelectorAll("[data-focus-link]"));
  const markers = Array.from(document.querySelectorAll(".claim-marker[id]"));
  const articleLayout = document.querySelector(".article-layout");
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
    if (!articleLayout) return;
    const header = document.querySelector(".site-header");
    const headerHeight = header?.getBoundingClientRect().height ?? 64;
    const offset = Math.ceil(headerHeight + 24);
    articleLayout.style.setProperty("--article-anchor-offset", `${offset}px`);
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

  updateAnchorOffset();
  updateCarouselControls();
  window.addEventListener("resize", () => {
    updateAnchorOffset();
    updateCarouselControls();
  });
})();
