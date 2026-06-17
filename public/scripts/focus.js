(() => {
  const progress = document.querySelector("[data-reading-progress]");
  const railLinks = Array.from(document.querySelectorAll("[data-focus-link]"));
  const markers = Array.from(document.querySelectorAll(".claim-marker[id]"));
  const articleBody = document.querySelector(".article-body");

  const setActive = (id) => {
    railLinks.forEach((link) => {
      const active = link.getAttribute("data-focus-link") === id;
      link.toggleAttribute("aria-current", active);
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

  const updateProgress = () => {
    if (!progress) return;
    const target = articleBody || document.documentElement;
    const rect = target.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const scrollable = Math.max(1, target.scrollHeight - window.innerHeight);
    const ratio = (window.scrollY - top) / scrollable;
    progress.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
})();
