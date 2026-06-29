(() => {
  const links = Array.from(document.querySelectorAll("[data-page-index-link]"));
  if (links.length === 0) return;

  const sections = links
    .map((link) => {
      const id = link.getAttribute("href")?.replace(/^#/, "");
      return id ? document.getElementById(id) : null;
    })
    .filter(Boolean);

  if (sections.length === 0) return;

  const setActive = (id) => {
    links.forEach((link) => {
      const active = link.getAttribute("href") === `#${id}`;
      if (active) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  if (!("IntersectionObserver" in window)) {
    setActive(sections[0].id);
    return;
  }

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
      rootMargin: "-22% 0px -62% 0px",
      threshold: [0.1, 0.28, 0.55]
    }
  );

  sections.forEach((section) => observer.observe(section));
  setActive(sections[0].id);
})();
