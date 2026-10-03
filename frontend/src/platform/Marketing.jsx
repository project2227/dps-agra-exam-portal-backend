import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  GraduationCap,
  Moon,
  Sun,
} from 'lucide-react';
import {
  Mark,
  HandCircle,
  ProductPreview,
  SharingBadge,
  ConsentPanel,
  ChatBubble,
} from './ProductUI';
import Button from '../components/common/Button';
export function PlatformThemeToggle() {
  const [dark, setDark] = useState(
    document.documentElement.dataset.theme === 'dark',
  );
  return (
    <button
      type="button"
      className="p-icon-button"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.dataset.theme = next ? 'dark' : 'light';
        try {
          localStorage.setItem('dps.ui.theme', next ? 'dark' : 'light');
        } catch {}
      }}
    >
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
export function MarketingNav() {
  return (
    <header className="p-marketing-nav">
      <Link to="/" className="p-wordmark" aria-label="Plinth home">
        <Mark />
        <span>plinth</span>
      </Link>
      <nav aria-label="Main navigation">
        <a href="/#paths" className="p-active-nav">
          Two paths
          <HandCircle />
        </a>
        <a href="/#how">How it works</a>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('plinth-guide-open'))}
        >
          Help
        </button>
      </nav>
      <div>
        <PlatformThemeToggle />
        <Link className="p-nav-signin" to="/login">
          Sign in
        </Link>
        <Link className="p-nav-create" to="/create">
          Create your site <ArrowUpRight size={14} />
        </Link>
      </div>
    </header>
  );
}
const BUILD_STEPS = [
  [
    'Choose your path',
    'A school day or a work day. Your site starts with the right tools.',
  ],
  ['Give it a name', 'Your organisation, at its own address.'],
  ['Make your mark', 'One logo, across your site and app icons.'],
  ['Pick your palette', 'A complete theme, with a light and dark side.'],
  ['Bring your people', 'Invite your team. Teachers create student accounts.'],
];
function MintCard() {
  return (
    <div className="mint-card">
      <div className="card-flood" />
      <div className="mint-card-top">
        <span className="mint-mark">
          <Mark size={46} />
        </span>
        <span className="p-id-chip">
          <svg viewBox="0 0 40 30" aria-hidden="true">
            <rect x="1" y="1" width="38" height="28" rx="5" />
            <path d="M13 1v28M27 1v28M1 10h12M27 10h12M1 20h12M27 20h12" />
          </svg>
        </span>
      </div>
      <div className="mint-card-body">
        <span className="p-id-label">Your organisation</span>
        <strong className="mint-name">
          {'Greenfield'.split('').map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </strong>
        <p className="mint-detail">A place for your people.</p>
      </div>
      <div className="mint-card-bottom">
        <span className="p-id-barcode" aria-hidden="true" />
        <span>
          Built on Plinth <ArrowUpRight size={12} />
        </span>
      </div>
    </div>
  );
}
export default function Marketing() {
  const root = useRef(null),
    [buildStep, setBuildStep] = useState(0),
    [previewPath, setPreviewPath] = useState('institute'),
    [monitorPath, setMonitorPath] = useState('institute');
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;
    let context,
      lenis,
      tick,
      disposed = false;
    const animate = async () => {
      const [{ gsap }, { ScrollTrigger }, { default: Lenis }] =
        await Promise.all([
          import('gsap'),
          import('gsap/ScrollTrigger'),
          import('lenis'),
        ]);
      if (disposed || media.matches) return;
      gsap.registerPlugin(ScrollTrigger);
      lenis = new Lenis({ duration: 0.85, smoothWheel: true, anchors: true });
      lenis.on('scroll', ScrollTrigger.update);
      tick = (t) => lenis.raf(t * 1000);
      gsap.ticker.add(tick);
      context = gsap.context(() => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from('.hero-line span', {
            yPercent: 105,
            opacity: 0,
            duration: 0.65,
            stagger: 0.08,
          })
          .from('.hero-noise', { opacity: 0, duration: 0.45 }, 0.15)
          .from(
            '.mint-card',
            { y: 65, rotate: 2, opacity: 0, duration: 0.65 },
            0.25,
          )
          .from('.p-marketing-nav', { opacity: 0, y: -8, duration: 0.3 }, 0.8);
        gsap.to('.p-scroll-progress', {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
          },
        });
        if (innerWidth >= 900) {
          const mint = gsap.timeline({
            scrollTrigger: {
              trigger: '.mint-hero',
              start: 'top top',
              end: '+=600',
              pin: true,
              scrub: 1,
            },
          });
          mint
            .from('.mint-mark', { opacity: 0, scale: 1.25, duration: 0.2 })
            .from('.mint-name span', {
              opacity: 0,
              stagger: 0.025,
              duration: 0.1,
            })
            .from('.card-flood', {
              scaleY: 0,
              transformOrigin: 'bottom',
              duration: 0.5,
            })
            .from('.mint-detail', { opacity: 0, duration: 0.2 });
          gsap.to('.p-building', {
            scrollTrigger: {
              trigger: '.p-building',
              start: 'top 8%',
              end: '+=850',
              pin: true,
              scrub: 0.6,
              onUpdate: (self) =>
                setBuildStep(Math.min(4, Math.floor(self.progress * 5))),
            },
          });
          gsap.to('.p-shared-engine', {
            scrollTrigger: {
              trigger: '.p-shared-engine',
              start: 'top 10%',
              end: '+=600',
              pin: true,
              scrub: 0.6,
              onUpdate: (self) =>
                setMonitorPath(self.progress > 0.5 ? 'workplace' : 'institute'),
            },
          });
          gsap.utils.toArray('[data-parallax]').forEach((node) =>
            gsap.fromTo(
              node,
              { y: 12 },
              {
                y: -12,
                ease: 'none',
                scrollTrigger: {
                  trigger: node,
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: true,
                },
              },
            ),
          );
        }
        gsap.from('.p-path-institute', {
          x: -35,
          opacity: 0,
          duration: 0.65,
          scrollTrigger: { trigger: '.p-paths', start: 'top 80%', once: true },
        });
        gsap.from('.p-path-workplace', {
          x: 35,
          opacity: 0,
          duration: 0.65,
          scrollTrigger: { trigger: '.p-paths', start: 'top 80%', once: true },
        });
        gsap.from('.p-desktop-laptop', {
          y: 35,
          opacity: 0,
          duration: 0.6,
          scrollTrigger: {
            trigger: '.p-desktop',
            start: 'top 75%',
            once: true,
          },
        });
        gsap.from('.p-desktop .p-sharing-badge', {
          x: 20,
          opacity: 0,
          duration: 0.4,
          scrollTrigger: {
            trigger: '.p-desktop',
            start: 'top 60%',
            once: true,
          },
        });
        gsap.from('.p-chat-scene .p-chat-bubble', {
          y: 12,
          opacity: 0,
          stagger: 0.35,
          duration: 0.4,
          scrollTrigger: {
            trigger: '.p-chat-scene',
            start: 'top 75%',
            once: true,
          },
        });
        gsap.from('.p-footer-wordmark', {
          scale: 0.95,
          opacity: 0.8,
          duration: 0.7,
          scrollTrigger: { trigger: '.p-footer', start: 'top 90%', once: true },
        });
      }, root);
    };
    animate().catch(() => {});
    const stop = () => {
      context?.revert();
      if (tick) import('gsap').then(({ gsap }) => gsap.ticker.remove(tick));
      lenis?.destroy();
    };
    media.addEventListener('change', stop);
    return () => {
      disposed = true;
      stop();
      media.removeEventListener('change', stop);
    };
  }, []);
  const tilt = (e) => {
    if (
      !matchMedia('(pointer: fine)').matches ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty(
      '--tilt-x',
      ((e.clientY - rect.top) / rect.height - 0.5) * -5 + 'deg',
    );
    e.currentTarget.style.setProperty(
      '--tilt-y',
      ((e.clientX - rect.left) / rect.width - 0.5) * 5 + 'deg',
    );
  };
  return (
    <div className="plinth-marketing" ref={root}>
      <div className="p-scroll-progress" aria-hidden="true" />
      <MarketingNav />
      <main id="p-main">
        <section className="mint-hero">
          <div className="p-hero-copy">
            <p className="p-caption">
              <span className="p-small-line" />
              Free, for every organisation
            </p>
            <h1>
              <span className="hero-line">
                <span>A place for</span>
              </span>
              <span className="hero-line">
                <span>your people.</span>
              </span>
            </h1>
            <p className="p-hero-description">
              Your school. Your workplace. Your own site.
              <br />
              Bring the whole day together, in a space that feels like yours.
            </p>
            <div className="p-hero-actions">
              <Link className="p-solid-button" to="/create">
                Create your site <ArrowUpRight size={18} />
              </Link>
              <a className="p-text-link" href="#paths">
                Find your path <ArrowDown size={16} />
              </a>
            </div>
            <small>No subscriptions. No paywalls. Just a place to begin.</small>
          </div>
          <div
            className="p-hero-object"
            onPointerMove={tilt}
            onPointerLeave={(e) => {
              e.currentTarget.style.setProperty('--tilt-x', '0deg');
              e.currentTarget.style.setProperty('--tilt-y', '0deg');
            }}
          >
            <div className="hero-noise" aria-hidden="true" />
            <div className="p-object-orbit" aria-hidden="true" />
            <MintCard />
            <span className="p-object-note">
              Yours, from the first click.
              <svg
                width="76"
                height="54"
                viewBox="0 0 76 54"
                aria-hidden="true"
              >
                <path d="M71 5C44 3 55 46 10 43m0 0 13-11M10 43l15 6" />
              </svg>
            </span>
          </div>
          <div className="p-hero-bottom">
            <span>
              <Mark size={18} />
              An independent platform, built with care.
            </span>
            <span>
              Scroll to make it yours <ArrowDown size={14} />
            </span>
          </div>
        </section>
        <section className="p-paths p-section" id="paths">
          <div className="p-section-heading">
            <p className="p-caption">Two ways to belong</p>
            <h2>
              Different days.
              <br />
              One good foundation.
            </h2>
            <p>
              Start with what your people need.
              <br />
              We’ll bring the right tools along.
            </p>
          </div>
          <div className="p-path-pair">
            <Link
              to="/create?path=institute"
              className="p-path p-path-institute"
            >
              <div className="p-path-top">
                <GraduationCap size={30} />
                <span>
                  For schools & colleges <ArrowUpRight />
                </span>
              </div>
              <h3>Institute</h3>
              <p>A calmer exam. A clearer school day.</p>
              <div className="p-path-illustration">
                <ProductPreview
                  path="institute"
                  scene="exam"
                  name="Your institute"
                />
              </div>
              <ul>
                <li>Exams & consented live monitoring</li>
                <li>Attendance, timetables & class records</li>
                <li>Learning, practice & student profiles</li>
              </ul>
              <span className="p-path-cta">
                Build your institute site <ArrowRight size={18} />
              </span>
            </Link>
            <Link
              to="/create?path=workplace"
              className="p-path p-path-workplace"
            >
              <div className="p-path-top">
                <BriefcaseBusiness size={27} />
                <span>
                  For teams & organisations <ArrowUpRight />
                </span>
              </div>
              <h3>Workplace</h3>
              <p>Stay connected. Keep work moving.</p>
              <div className="p-path-illustration">
                <ProductPreview
                  path="workplace"
                  scene="monitor"
                  name="Your workplace"
                />
              </div>
              <ul>
                <li>Teams, tasks & session attendance</li>
                <li>Consented screen sharing & flag review</li>
                <li>Channels, direct messages & shared files</li>
              </ul>
              <span className="p-path-cta">
                Build your workplace site <ArrowRight size={18} />
              </span>
            </Link>
          </div>
        </section>
        <section className="p-building p-section" id="how">
          <div>
            <p className="p-caption">A few choices. A place of your own.</p>
            <h2>
              Your site
              <br />
              builds itself.
            </h2>
            <div className="p-build-steps">
              {BUILD_STEPS.map(([title, text], i) => (
                <button
                  type="button"
                  key={title}
                  className={buildStep === i ? 'active' : ''}
                  onClick={() => setBuildStep(i)}
                >
                  <span>{buildStep > i ? <Check size={15} /> : i + 1}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="p-build-window" data-parallax>
            <div className="p-preview-label">
              Live interface preview · {BUILD_STEPS[buildStep][0]}
            </div>
            <ProductPreview
              path={previewPath}
              name={buildStep >= 1 ? 'Greenfield' : 'Your organisation'}
              logo={buildStep >= 2 ? '/plinth.svg' : undefined}
              theme={{
                preset:
                  previewPath === 'workplace'
                    ? 'mint'
                    : buildStep >= 3
                      ? 'plum'
                      : 'chalk',
              }}
              scene={buildStep === 4 ? 'erp' : 'dashboard'}
            />
            <div className="p-preview-controls">
              <button
                type="button"
                className={previewPath === 'institute' ? 'active' : ''}
                onClick={() => setPreviewPath('institute')}
              >
                Institute
              </button>
              <button
                type="button"
                className={previewPath === 'workplace' ? 'active' : ''}
                onClick={() => setPreviewPath('workplace')}
              >
                Workplace
              </button>
              <span>Preview only</span>
            </div>
          </div>
        </section>
        <section className="p-shared-engine p-section">
          <div className="p-engine-copy">
            <p className="p-caption">A shared foundation</p>
            <h2>
              One clear view.
              <br />
              Two working worlds.
            </h2>
            <p>
              The same consented sharing engine connects an exam room to a
              teacher, and a work session to a manager.
            </p>
            <div className="p-engine-switch">
              <Button
                variant={monitorPath === 'institute' ? 'primary' : 'secondary'}
                onClick={() => setMonitorPath('institute')}
              >
                Institute
              </Button>
              <Button
                variant={monitorPath === 'workplace' ? 'primary' : 'secondary'}
                onClick={() => setMonitorPath('workplace')}
              >
                Workplace
              </Button>
            </div>
            <p className="p-engine-note">
              <Check size={16} />
              Private to your organisation.
              <br />
              <Check size={16} />
              Flags are observations to review.
            </p>
          </div>
          <div className="p-engine-window">
            <ProductPreview
              path={monitorPath}
              scene="monitor"
              name={
                monitorPath === 'institute'
                  ? 'Your institute'
                  : 'Your workplace'
              }
            />
            <div className="p-engraved-lines" aria-hidden="true" />
          </div>
        </section>
        <section className="p-desktop p-section">
          <div className="p-desktop-scene">
            <div className="p-desktop-laptop">
              <div className="p-laptop-screen">
                <ConsentPanel compact />
              </div>
              <div className="p-laptop-base" />
            </div>
            <div className="p-desktop-connector" aria-hidden="true" />
            <SharingBadge />
            <div className="p-desktop-manager" data-parallax>
              <ProductPreview
                path="workplace"
                scene="monitor"
                name="Your workplace"
              />
            </div>
          </div>
          <div>
            <p className="p-caption">A light app. A clear agreement.</p>
            <h2>
              The web does the work.
              <br />
              You stay in control.
            </h2>
            <p>
              The Workplace app connects your computer to your own site. Sharing
              starts with a clear notice and a choice. A visible badge stays
              with you while you share.
            </p>
            <ul className="p-check-list">
              <li>
                <Check />
                Webcam is optional, and off by default.
              </li>
              <li>
                <Check />
                Pause sharing whenever you need to.
              </li>
              <li>
                <Check />
                Work hours and retention are visible.
              </li>
            </ul>
            <Link className="p-text-link" to="/create?path=workplace">
              Make a place for your team <ArrowRight size={18} />
            </Link>
          </div>
        </section>
        <section className="p-chat-section p-section">
          <div>
            <p className="p-caption">Work, in the same conversation</p>
            <h2>
              Less searching.
              <br />
              More sharing.
            </h2>
            <p>
              Messages, mentions and the file you need.
              <br />
              Keep them close to the work, with channels and direct messages for
              your people.
            </p>
            <div className="p-feature-note">
              Search your history. Pin the important things.
              <br />
              Files belong to the channel, and its members.
            </div>
          </div>
          <div className="p-chat-scene">
            <div className="p-chat-scene-heading">
              <Mark size={20} />
              <span># project-room</span>
              <span>Team channel</span>
            </div>
            <ChatBubble>Here’s the brief for our next project.</ChatBubble>
            <ChatBubble file />
            <ChatBubble mine>
              Found it. Pinned for the whole team.
              <Check size={14} />
            </ChatBubble>
            <div className="p-chat-input">
              Write a message…
              <ArrowUpRight size={18} />
            </div>
            <HandCircle />
          </div>
        </section>
        <section className="p-final-cta p-section">
          <div>
            <p className="p-caption">Your people. Your place.</p>
            <h2>
              Make room
              <br />
              for a better day.
            </h2>
          </div>
          <div>
            <p>
              Choose your path. Add your name.
              <br />
              We’ll help you make it yours.
            </p>
            <Link className="p-solid-button" to="/create">
              Create your free site <ArrowUpRight size={18} />
            </Link>
            <button
              type="button"
              className="p-help-button"
              onClick={() =>
                window.dispatchEvent(new Event('plinth-guide-open'))
              }
            >
              Take a tour
            </button>
          </div>
        </section>
      </main>
      <footer className="p-footer">
        <div className="p-footer-top">
          <span>
            <Mark size={24} />
            Built for places that bring people together.
          </span>
          <div>
            <Link to="/login">Sign in</Link>
            <Link to="/privacy">Privacy & responsible use</Link>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new Event('plinth-guide-open'))
              }
            >
              Replay the tour
            </button>
          </div>
        </div>
        <div className="p-footer-wordmark" aria-hidden="true">
          plinth<span>↗</span>
        </div>
        <div className="p-footer-bottom">
          <span>Free for every organisation.</span>
          <span>Independent, student-built. © {new Date().getFullYear()}</span>
          <a href="#p-main">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}
