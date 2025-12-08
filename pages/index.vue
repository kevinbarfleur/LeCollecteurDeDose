<script setup lang="ts">
// SEO
useHead({
  title: "Le Collecteur de Dose - Accueil",
});

// Card fan configuration
const cardCount = 7;
const cards = Array.from({ length: cardCount }, (_, i) => ({
  id: i,
  // Calculate spread angle for each card (-30 to +30 degrees)
  baseRotation: -30 + (60 / (cardCount - 1)) * i,
  // Stagger delay for entrance animation
  delay: i * 0.08,
}));

// Track which card is being hovered
const hoveredCard = ref<number | null>(null);

// Card back logo
const cardBackLogoUrl = "/images/card-back-logo.png";

// Calculate transform for each card
const getCardStyle = (card: (typeof cards)[0], index: number) => {
  const isHovered = hoveredCard.value === index;
  const baseRotation = card.baseRotation;

  // When hovered, lift the card up and reduce rotation
  let translateY = 0;
  let translateX = 0;
  let rotation = baseRotation;
  let scale = 1;
  let zIndex = index + 1;

  if (isHovered) {
    translateY = -20;
    rotation = baseRotation * 0.9;
    scale = 1.02;
    // Keep same z-index - card stays in its position
  }

  return {
    "--rotation": `${rotation}deg`,
    "--translate-y": `${translateY}px`,
    "--translate-x": `${translateX}px`,
    "--scale": scale,
    "--z-index": zIndex,
    "--delay": `${card.delay}s`,
  };
};

// Entrance animation
const isVisible = ref(false);
onMounted(() => {
  setTimeout(() => {
    isVisible.value = true;
  }, 100);
});
</script>

<template>
  <NuxtLayout>
    <div class="home-page">
      <!-- Background ambient effects -->
      <div class="home-bg">
        <div class="home-bg__gradient"></div>
        <div class="home-bg__particles"></div>
      </div>

      <!-- Main content -->
      <div class="home-content">
        <!-- Central box containing all sections -->
        <div class="home-box">
          <!-- Section 1: Hero (mascot + text) -->
          <section class="hero-section">
            <div
              class="hero-mascot"
              :class="{ 'hero-mascot--visible': isVisible }"
            >
              <img
                src="/images/logo.png"
                alt="Le Collecteur de Dose - Grizzly"
                class="hero-mascot__image"
              />
              <div class="hero-mascot__glow"></div>
            </div>

            <div class="hero-text" :class="{ 'hero-text--visible': isVisible }">
              <h1 class="hero-title">
                <span class="hero-title__main">Le Collecteur</span>
                <span class="hero-title__accent">de Dose</span>
              </h1>
              <p class="hero-description">
                Collectionne les reliques les plus rares de Wraeclast. Chaque
                carte raconte une histoire, chaque drop est une légende.
                <span class="hero-description__highlight">
                  Quel trésor vas-tu découvrir ?
                </span>
              </p>
            </div>
          </section>

          <!-- Section 2: Card fan -->
          <section class="card-section">
            <div class="card-fan" :class="{ 'card-fan--visible': isVisible }">
              <div
                v-for="(card, index) in cards"
                :key="card.id"
                class="fan-card"
                :style="getCardStyle(card, index)"
                @mouseenter="hoveredCard = index"
                @mouseleave="hoveredCard = null"
              >
                <div class="fan-card__inner">
                  <div class="fan-card__back">
                    <div class="fan-card__frame">
                      <div class="fan-card__bg"></div>
                      <div class="fan-card__border"></div>
                      <span class="fan-card__rune fan-card__rune--tl">✧</span>
                      <span class="fan-card__rune fan-card__rune--tr">✧</span>
                      <span class="fan-card__rune fan-card__rune--bl">✧</span>
                      <span class="fan-card__rune fan-card__rune--br">✧</span>
                    </div>
                    <div class="fan-card__logo-wrapper">
                      <img
                        :src="cardBackLogoUrl"
                        alt=""
                        class="fan-card__logo"
                      />
                    </div>
                    <div class="fan-card__decoration">
                      <div class="fan-card__line fan-card__line--top"></div>
                      <div class="fan-card__line fan-card__line--bottom"></div>
                    </div>
                    <div class="fan-card__hover-glow"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 3: CTA Buttons -->
          <section
            class="cta-section"
            :class="{ 'cta-section--visible': isVisible }"
          >
            <RunicButton to="/collection" variant="primary">
              Voir ma Collection
            </RunicButton>

            <RunicButton
              to="/catalogue"
              variant="secondary"
              rune-left="✧"
              rune-right="✧"
            >
              Explorer le Catalogue
            </RunicButton>
          </section>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
/* ===========================================
   PAGE LAYOUT
   =========================================== */
.home-page {
  position: relative;
  min-height: calc(100vh - 80px);
  overflow-x: hidden;
  width: 100%;
}

/* ===========================================
   BACKGROUND EFFECTS
   =========================================== */
.home-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.home-bg__gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(
      ellipse at 30% 20%,
      rgba(175, 96, 37, 0.08) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at 70% 80%,
      rgba(122, 106, 138, 0.06) 0%,
      transparent 40%
    ),
    radial-gradient(
      ellipse at 50% 100%,
      rgba(201, 162, 39, 0.04) 0%,
      transparent 30%
    );
}

.home-bg__particles {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(
      circle at 20% 30%,
      rgba(175, 96, 37, 0.3) 0%,
      transparent 2px
    ),
    radial-gradient(
      circle at 80% 20%,
      rgba(201, 162, 39, 0.2) 0%,
      transparent 2px
    ),
    radial-gradient(
      circle at 60% 70%,
      rgba(122, 106, 138, 0.2) 0%,
      transparent 1.5px
    ),
    radial-gradient(
      circle at 30% 80%,
      rgba(175, 96, 37, 0.15) 0%,
      transparent 1px
    ),
    radial-gradient(
      circle at 90% 60%,
      rgba(201, 162, 39, 0.15) 0%,
      transparent 1px
    );
  animation: particles-drift 20s ease-in-out infinite;
}

@keyframes particles-drift {
  0%,
  100% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(-5px, 10px);
  }
  50% {
    transform: translate(5px, -5px);
  }
  75% {
    transform: translate(-3px, -8px);
  }
}

/* ===========================================
   MAIN CONTENT
   =========================================== */
.home-content {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

/* ===========================================
   HOME BOX - Container for all sections
   =========================================== */
.home-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.5rem;
  max-width: 1000px;
  width: 100%;
}

@media (min-width: 768px) {
  .home-box {
    gap: 1rem;
  }
}

/* ===========================================
   HERO SECTION
   =========================================== */
.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  width: 100%;
  text-align: center;
}

@media (min-width: 768px) {
  .hero-section {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 2rem;
    text-align: left;
  }
}

/* Mascot (Grizzly) */
.hero-mascot {
  position: relative;
  width: 140px;
  height: 140px;
  opacity: 0;
  transform: scale(0.8) translateY(20px);
  transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .hero-mascot {
    width: 180px;
    height: 180px;
  }
}

.hero-mascot--visible {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.hero-mascot__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5));
  transition: transform 0.4s ease;
}

.hero-mascot:hover .hero-mascot__image {
  transform: scale(1.05) rotate(-3deg);
}

.hero-mascot__glow {
  position: absolute;
  inset: -20%;
  background: radial-gradient(
    ellipse at center,
    rgba(175, 96, 37, 0.2) 0%,
    transparent 70%
  );
  filter: blur(20px);
  z-index: -1;
  animation: glow-pulse 3s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

/* Hero text */
.hero-text {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s ease 0.2s;
}

.hero-text--visible {
  opacity: 1;
  transform: translateY(0);
}

.hero-title {
  margin-bottom: 1rem;
}

.hero-title__main {
  display: block;
  font-family: "Cinzel", serif;
  font-size: 2rem;
  font-weight: 700;
  color: #e8e8e8;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

@media (min-width: 768px) {
  .hero-title__main {
    display: inline;
    font-size: 2.5rem;
  }
}

.hero-title__accent {
  display: block;
  font-family: "Crimson Text", serif;
  font-size: 1.25rem;
  font-style: italic;
  color: #af6025;
  text-shadow: 0 2px 10px rgba(175, 96, 37, 0.3);
}

@media (min-width: 768px) {
  .hero-title__accent {
    display: inline;
    font-size: 1.5rem;
    margin-left: 0.5rem;
  }
}

.hero-description {
  font-family: "Crimson Text", serif;
  font-size: 1rem;
  line-height: 1.7;
  color: #9a9a9a;
  max-width: 500px;
}

@media (min-width: 768px) {
  .hero-description {
    font-size: 1.125rem;
    max-width: none;
  }
}

.hero-description__highlight {
  display: block;
  margin-top: 0.75rem;
  color: #c9a227;
  font-style: italic;
}

/* ===========================================
   CARD SECTION
   =========================================== */
.card-section {
  display: flex;
  justify-content: center;
  width: 100%;
  margin-bottom: 10%;
}

.card-fan {
  position: relative;
  width: 100%;
  max-width: 600px;
  height: 260px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  perspective: 1000px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease 0.4s;
}

.card-fan--visible {
  opacity: 1;
  transform: translateY(0);
}

/* Individual card in fan */
.fan-card {
  position: absolute;
  bottom: 0;
  width: 140px;
  height: 196px;
  transform-origin: bottom center;
  transform: rotate(var(--rotation)) translateY(var(--translate-y))
    translateX(var(--translate-x)) scale(var(--scale));
  z-index: var(--z-index);
  cursor: pointer;
  transition: all 0.3s ease-out;
  animation: card-entrance 0.6s ease backwards;
  animation-delay: calc(0.5s + var(--delay));
}

@keyframes card-entrance {
  from {
    opacity: 0;
    transform: rotate(var(--rotation)) translateY(50px) scale(0.8);
  }
}

.fan-card__inner {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.3s ease;
}

.fan-card:hover .fan-card__inner {
  transform: rotateY(2deg) rotateX(-2deg);
}

/* Card back design */
.fan-card__back {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(60, 50, 45, 0.3);
  transition: box-shadow 0.3s ease;
}

.fan-card:hover .fan-card__back {
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.6), 0 0 15px rgba(175, 96, 37, 0.1),
    0 0 0 1px rgba(175, 96, 37, 0.3);
}

.fan-card__frame {
  position: absolute;
  inset: 0;
}

.fan-card__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    160deg,
    #0a0908 0%,
    #060505 30%,
    #030303 60%,
    #080706 100%
  );
}

.fan-card__bg::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 50%,
    rgba(20, 15, 12, 0.3) 0%,
    transparent 70%
  );
}

.fan-card__bg::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.04;
  mix-blend-mode: overlay;
}

.fan-card__border {
  position: absolute;
  inset: 6px;
  border: 1px solid rgba(60, 50, 45, 0.25);
  border-radius: 5px;
  pointer-events: none;
}

.fan-card__border::before {
  content: "";
  position: absolute;
  inset: 3px;
  border: 1px solid rgba(50, 40, 35, 0.2);
  border-radius: 3px;
}

.fan-card__rune {
  position: absolute;
  font-size: 10px;
  color: rgba(80, 65, 55, 0.4);
  z-index: 2;
  transition: color 0.3s ease;
}

.fan-card:hover .fan-card__rune {
  color: rgba(175, 96, 37, 0.6);
}

.fan-card__rune--tl {
  top: 10px;
  left: 10px;
}
.fan-card__rune--tr {
  top: 10px;
  right: 10px;
}
.fan-card__rune--bl {
  bottom: 10px;
  left: 10px;
}
.fan-card__rune--br {
  bottom: 10px;
  right: 10px;
}

.fan-card__logo-wrapper {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  padding: 18%;
}

.fan-card__logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.9;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fan-card:hover .fan-card__logo {
  opacity: 1;
  transform: scale(1.05);
}

.fan-card__decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.fan-card__line {
  position: absolute;
  left: 15%;
  right: 15%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(50, 40, 35, 0.3) 20%,
    rgba(60, 50, 45, 0.4) 50%,
    rgba(50, 40, 35, 0.3) 80%,
    transparent 100%
  );
  transition: background 0.3s ease;
}

.fan-card:hover .fan-card__line {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(175, 96, 37, 0.3) 20%,
    rgba(175, 96, 37, 0.5) 50%,
    rgba(175, 96, 37, 0.3) 80%,
    transparent 100%
  );
}

.fan-card__line--top {
  top: 30px;
}
.fan-card__line--bottom {
  bottom: 30px;
}

/* Hover glow */
.fan-card__hover-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    rgba(175, 96, 37, 0.15) 0%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.fan-card:hover .fan-card__hover-glow {
  opacity: 1;
}

/* ===========================================
   CTA SECTION
   =========================================== */
.cta-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s ease 0.8s;
}

.cta-section--visible {
  opacity: 1;
  transform: translateY(0);
}

@media (min-width: 640px) {
  .cta-section {
    flex-direction: row;
    gap: 1.5rem;
  }
}

/* ===========================================
   RESPONSIVE
   =========================================== */
@media (min-width: 640px) {
  .hero-mascot {
    width: 160px;
    height: 160px;
  }

  .hero-title__main {
    font-size: 2.5rem;
  }

  .card-fan {
    height: 300px;
  }

  .fan-card {
    width: 165px;
    height: 231px;
  }
}

@media (min-width: 1024px) {
  .hero-mascot {
    width: 180px;
    height: 180px;
  }

  .hero-title__main {
    font-size: 2.75rem;
  }

  .hero-description {
    font-size: 1.125rem;
  }

  .card-fan {
    height: 350px;
    max-width: 750px;
  }

  .fan-card {
    width: 190px;
    height: 266px;
  }
}

@media (min-width: 1280px) {
  .home-box {
    gap: 3.5rem;
  }

  .hero-mascot {
    width: 200px;
    height: 200px;
  }

  .hero-title__main {
    font-size: 3rem;
  }

  .card-fan {
    height: 400px;
    max-width: 850px;
  }

  .fan-card {
    width: 220px;
    height: 308px;
  }
}
</style>
