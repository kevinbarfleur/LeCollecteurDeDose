<script setup lang="ts">
const { t } = useI18n();

useHead({
  title: t("meta.about.title"),
});
</script>

<template>
  <NuxtLayout>
    <div class="page-container">
      <section class="about-hero mb-8 sm:mb-12">
        <div class="about-hero__glow"></div>

        <div class="about-hero__logo-container">
          <img
            :src="'/images/logo.png'"
            :alt="`Logo ${t('app.name')}`"
            class="about-hero__logo"
          />
        </div>

        <div class="about-hero__text">
          <h1 class="about-hero__title">
            {{ t("about.title") }}
            <span class="about-hero__accent">{{ t("about.tagline") }}</span>
          </h1>
          <p class="about-hero__subtitle">{{ t("about.hero.subtitle") }}</p>
        </div>
      </section>

      <div class="grid gap-6 md:gap-8 lg:grid-cols-2">
        <div>
          <RunicHeader
            :title="t('about.rules.title')"
            :subtitle="t('about.rules.subtitle')"
            attached
          />
          <RunicBox padding="lg" attached centered>
            <div class="about-section__content">
              <p class="about-section__description">
                {{ t("about.description") }}
              </p>
              <RunicButton
                href="/documents/TCG Collector Rules.pdf"
                variant="primary"
                size="lg"
                icon="document"
              >
                {{ t("about.rules.button") }}
              </RunicButton>
            </div>
          </RunicBox>
        </div>

        <div>
          <RunicHeader
            :title="t('about.socials.title')"
            :subtitle="t('about.socials.subtitle')"
            attached
          />
          <RunicBox padding="lg" attached centered>
            <div class="about-section__content">
              <div class="about-socials">
                <RunicButton
                  href="https://www.twitch.tv/les_doseurs"
                  variant="twitch"
                  size="lg"
                  icon="twitch"
                  class="about-socials__btn"
                >
                  {{ t("about.socials.twitch") }}
                </RunicButton>

                <RunicButton
                  href="https://www.youtube.com/@LesDoseurs"
                  variant="youtube"
                  size="lg"
                  icon="youtube"
                  class="about-socials__btn"
                >
                  {{ t("about.socials.youtube") }}
                </RunicButton>

                <RunicButton
                  href="https://www.youtube.com/@LesDoseursPOE"
                  variant="youtube"
                  size="lg"
                  icon="youtube"
                  class="about-socials__btn"
                >
                  {{ t("about.socials.youtubePoe") }}
                </RunicButton>
              </div>
            </div>
          </RunicBox>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
.about-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem 1rem;
}

@media (min-width: 768px) {
  .about-hero {
    padding: 3rem 2rem;
  }
}

.about-hero__glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 350px;
  height: 350px;
  background: radial-gradient(
    circle,
    rgba(175, 96, 37, 0.12) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 0;
}

@media (min-width: 768px) {
  .about-hero__glow {
    width: 450px;
    height: 450px;
  }
}

.about-hero__logo-container {
  position: relative;
  z-index: 1;
  margin-bottom: 1.5rem;
}

.about-hero__logo {
  width: 140px;
  height: 140px;
  object-fit: contain;
  filter: drop-shadow(0 0 25px rgba(175, 96, 37, 0.25));
  animation: float 6s ease-in-out infinite;
}

@media (min-width: 768px) {
  .about-hero__logo {
    width: 180px;
    height: 180px;
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.about-hero__text {
  position: relative;
  z-index: 1;
}

.about-hero__title {
  font-family: "Cinzel", serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}

@media (min-width: 768px) {
  .about-hero__title {
    font-size: 3.5rem;
  }
}

.about-hero__accent {
  display: block;
  font-family: "Cormorant Garamond", serif;
  font-size: 1.5rem;
  font-style: italic;
  font-weight: 400;
  color: #c97a3a;
  margin-top: 0.25rem;
}

@media (min-width: 768px) {
  .about-hero__accent {
    font-size: 2rem;
  }
}

.about-hero__subtitle {
  font-family: "Cormorant Garamond", serif;
  font-size: 1.125rem;
  font-style: italic;
  color: rgba(160, 150, 135, 0.8);
  margin: 1rem 0 0;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

@media (min-width: 768px) {
  .about-hero__subtitle {
    font-size: 1.25rem;
  }
}

.about-section__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.about-section__description {
  font-family: "Cormorant Garamond", serif;
  font-size: 1.0625rem;
  font-style: italic;
  color: rgba(160, 150, 135, 0.85);
  margin: 0;
  max-width: 280px;
  line-height: 1.6;
}

.about-socials {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 280px;
}

.about-socials__btn {
  width: 100%;
}
</style>
