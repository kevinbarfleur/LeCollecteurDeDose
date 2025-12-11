<script setup lang="ts">
const { t } = useI18n();

useHead({ title: t("meta.home.title") });

const isVisible = ref(false);
onMounted(() => {
  setTimeout(() => {
    isVisible.value = true;
  }, 100);
});
</script>

<template>
  <NuxtLayout>
    <div class="hero-page">
      <div class="home-bg">
        <div class="home-bg__gradient"></div>
        <div class="home-bg__particles"></div>
      </div>

      <div class="hero-page__content">
        <div class="hero-page__inner">
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
                <span class="hero-title__main">{{ t("home.hero.title") }}</span>
                <span class="hero-title__accent">{{
                  t("home.hero.accent")
                }}</span>
              </h1>
              <p class="hero-description">
                {{ t("home.hero.description") }}
                <span class="hero-description__highlight">
                  {{ t("home.hero.highlight") }}
                </span>
              </p>
            </div>
          </section>

          <!-- Card animation - Desktop only (hidden on mobile) -->
          <section
            class="carousel-section my-12"
            :class="{ 'carousel-section--visible': isVisible }"
          >
            <HomeHeroCarousel />
          </section>

          <section
            class="cta-section"
            :class="{ 'cta-section--visible': isVisible }"
          >
            <RunicButton to="/collection" variant="primary">
              {{ t("home.cta.collection") }}
            </RunicButton>

            <RunicButton
              to="/catalogue"
              variant="secondary"
              rune-left="✧"
              rune-right="✧"
            >
              {{ t("home.cta.catalogue") }}
            </RunicButton>
          </section>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
/* Hero page container */
.hero-page {
  position: relative;
  width: 100%;
  min-height: 500px;
  overflow: hidden;
}

/* On desktop with sufficient height, fit exactly in viewport 
   100vh - header(~80px) - main margins(~48px) - footer(~110px) = ~100vh - 240px */
@media (min-width: 1024px) and (min-height: 800px) {
  .hero-page {
    height: calc(100vh - 240px);
    min-height: 500px;
    max-height: calc(100vh - 240px);
    overflow: hidden;
  }
}

/* For larger screens with more space */
@media (min-width: 1024px) and (min-height: 900px) {
  .hero-page {
    height: calc(100vh - 240px);
    min-height: 550px;
  }
}

.hero-page__content {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

@media (min-width: 768px) {
  .hero-page__content {
    padding: 1rem 2rem;
  }
}

.hero-page__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  max-width: 56rem;
  width: 100%;
  overflow: visible;
}

@media (min-width: 768px) {
  .hero-page__inner {
    gap: 1.25rem;
  }
}

@media (min-width: 1024px) {
  .hero-page__inner {
    gap: 0.75rem;
  }
}

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

.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  text-align: center;
}

@media (min-width: 768px) {
  .hero-section {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 1.5rem;
    text-align: left;
  }
}

@media (min-width: 1024px) {
  .hero-section {
    gap: 1.25rem;
  }
}

.hero-mascot {
  position: relative;
  width: 100px;
  height: 100px;
  opacity: 0;
  transform: scale(0.8) translateY(20px);
  transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .hero-mascot {
    width: 120px;
    height: 120px;
  }
}

@media (min-width: 768px) {
  .hero-mascot {
    width: 130px;
    height: 130px;
  }
}

@media (min-width: 1024px) {
  .hero-mascot {
    width: 120px;
    height: 120px;
  }
}

@media (min-width: 1280px) {
  .hero-mascot {
    width: 140px;
    height: 140px;
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
  margin-bottom: 0.5rem;
}

@media (min-width: 1024px) {
  .hero-title {
    margin-bottom: 0.375rem;
  }
}

.hero-title__main {
  display: block;
  font-family: "Cinzel", serif;
  font-size: 2rem;
  font-weight: 700;
  color: #e8e8e8;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

@media (min-width: 640px) {
  .hero-title__main {
    font-size: 2.5rem;
  }
}

@media (min-width: 768px) {
  .hero-title__main {
    display: inline;
    font-size: 2.5rem;
  }
}

@media (min-width: 1024px) {
  .hero-title__main {
    font-size: 2.75rem;
  }
}

@media (min-width: 1280px) {
  .hero-title__main {
    font-size: 3rem;
  }
}

.hero-title__accent {
  display: block;
  font-family: "Crimson Text", serif;
  font-size: 1.5rem;
  font-style: italic;
  color: #af6025;
  text-shadow: 0 2px 10px rgba(175, 96, 37, 0.3);
}

@media (min-width: 768px) {
  .hero-title__accent {
    display: inline;
    font-size: 1.75rem;
    margin-left: 0.5rem;
  }
}

.hero-description {
  font-family: "Crimson Text", serif;
  font-size: 1.125rem;
  line-height: 1.7;
  color: #9a9a9a;
  max-width: 500px;
}

@media (min-width: 768px) {
  .hero-description {
    font-size: 1.25rem;
    max-width: none;
  }
}

@media (min-width: 1024px) {
  .hero-description {
    font-size: 1.3125rem;
  }
}

.hero-description__highlight {
  display: block;
  margin-top: 0.75rem;
  color: #c9a227;
  font-style: italic;
}

/* Carousel Section - Hidden on mobile, visible on desktop only */
.carousel-section {
  display: none;
  position: relative;
  width: 100%;
  max-width: 700px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.8s ease 0.4s;
  z-index: 1;
  overflow: visible;
}

/* Show carousel only on desktop (1024px+) */
@media (min-width: 1024px) {
  .carousel-section {
    display: block;
  }
}

.carousel-section--visible {
  opacity: 1;
  transform: translateY(0);
}

.cta-section {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s ease 0.8s;
  z-index: 2;
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
</style>
