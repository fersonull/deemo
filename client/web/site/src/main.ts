import "./base.css";
import "./sections.css";

import { createDeemo } from "./deemo";
import { initFaq } from "./sections/faq";
import { initFeatures } from "./sections/features";
import { initFooter } from "./sections/footer";
import { initHero } from "./sections/hero";
import { initHowItWorks } from "./sections/how-it-works";
import { initPlans } from "./sections/plans";
import { initScope } from "./sections/scope";
import { initReveal, stagger } from "./utils/reveal";

initHero();
initHowItWorks();
initFeatures();
initScope();
initPlans();
initFaq();
initFooter();

// The footer owl just waves hello once it's on screen; no speech bubble down here.
const footerDeemoRoot = document.getElementById("footer-deemo");
if (footerDeemoRoot) {
  const say = createDeemo(footerDeemoRoot);
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        say("cheering");
        io.disconnect();
      }
    },
    { threshold: 0.4 },
  );
  io.observe(footerDeemoRoot);
}

stagger(document.getElementById("feature-grid")!, 70, 5);
initReveal();
