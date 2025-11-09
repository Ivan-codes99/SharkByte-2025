import { logger } from "../lib/logger";
import { useEffect } from "react";
import { useTilt } from "../hooks/useTilt";
import "../styles/home.css";

function FeatureCard({ 
  emoji, 
  title, 
  description 
}: {
  emoji: string; 
  title: string; 
  description: string;
}) {
  const { cardRef, innerRef } = useTilt<HTMLElement>();

  return (
    <article className="feature-card" ref={cardRef}>
      <div className="tilt-inner" ref={innerRef}>
        <div className="feature-illustration">{emoji}</div>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
    </article>
  );
}

export function Home() {
  useEffect(() => {
    logger.info("Home page mounted", undefined, "Home");
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-inner container">
          <h1 className="hero-title">Make the most out of every student's education</h1>
          <p className="hero-sub">
            Degree management with SharkScholar makes forging the path towards graduation smarter and simpler for students and the leaders that support them.
          </p>
        </div>
      </section>

      {/* Image Gallery */}
      <main className="container">
        <section className="image-gallery" aria-label="Gallery of features">
          <img src="https://picsum.photos/id/1011/1600/1000" alt="Student studying" />
          <img src="https://picsum.photos/id/1005/1600/1000" alt="Graduation ceremony" />
          <img src="https://picsum.photos/id/1003/1600/1000" alt="Career planning" />
          <img src="https://picsum.photos/id/1025/1600/1000" alt="Academic success" />
        </section>
      </main>

      {/* Features / Why Section */}
      <section className="features-section">
        <div className="features-inner container">
          <div className="features-header">
            <div className="kicker">WHY SHARKSCHOLAR</div>
            <h2 className="features-title">Imagine a college experience where every moment is meaningful</h2>
          </div>

          <div className="feature-cards">
            <FeatureCard
              emoji="🎓"
              title="For students"
              description="Build an enriched academic journey that accounts for degree requirements and courses that support your unique priorities."
            />
            <FeatureCard
              emoji="🙌"
              title="For advisors"
              description="Get back the time spent on administrative tasks and give your students tailored guidance that truly impacts their success."
            />
            <FeatureCard
              emoji="🔍"
              title="For administrators"
              description="See how students, staff, and resources are working together and uncover opportunities for worthwhile change."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <small>Local-only. Your data is stored in your browser. No account required.</small>
      </footer>
    </div>
  );
}
