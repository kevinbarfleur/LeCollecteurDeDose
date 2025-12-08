<script setup lang="ts">
useHead({
  title: "À propos - Le Collecteur de Dose",
});
</script>

<template>
  <NuxtLayout>
    <div class="about-page">
      <!-- Hero section -->
      <section class="about-hero">
        <div class="about-hero__glow"></div>

        <!-- Logo -->
        <div class="about-hero__logo-wrapper">
          <img
            :src="'/images/logo.png'"
            alt="Logo Le Collecteur de Dose"
            class="about-hero__logo"
          />
        </div>

        <!-- Title -->
        <div class="about-hero__title-wrapper">
          <h1 class="about-hero__title">Le Collecteur</h1>
          <span class="about-hero__subtitle">de Dose</span>
        </div>

        <!-- Description -->
        <p class="about-hero__description">Seuls les plus dignes survivront.</p>
      </section>

      <!-- Social links -->
      <section class="about-socials">
        <h2 class="about-socials__title">Rejoins la cave</h2>

        <div class="about-socials__grid">
          <RunicButton
            href="https://www.twitch.tv/les_doseurs"
            variant="twitch"
            size="lg"
            icon="twitch"
          >
            Les Doseurs
          </RunicButton>

          <RunicButton
            href="https://www.youtube.com/@LesDoseurs"
            variant="youtube"
            size="lg"
            icon="youtube"
          >
            Les Doseurs
          </RunicButton>

          <RunicButton
            href="https://www.youtube.com/@LesDoseursPOE"
            variant="youtube"
            size="lg"
            icon="youtube"
          >
            Les Doseurs POE
          </RunicButton>
        </div>
      </section>
    </div>
  </NuxtLayout>
</template>

<style scoped>
.about-page {
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem;
}

/* Hero Section */
.about-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3rem 0;
}

.about-hero__glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  height: 400px;
  background: radial-gradient(
    circle,
    rgba(175, 96, 37, 0.15) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 0;
}

.about-hero__logo-wrapper {
  position: relative;
  z-index: 1;
  margin-bottom: 1.5rem;
}

.about-hero__logo {
  width: 180px;
  height: 180px;
  object-fit: contain;
  filter: drop-shadow(0 0 30px rgba(175, 96, 37, 0.3));
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.about-hero__title-wrapper {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  line-height: 1;
  margin-bottom: 1rem;
}

.about-hero__title {
  font-family: "Cinzel", serif;
  font-size: 3rem;
  font-weight: 700;
  color: #e0e0e0;
  letter-spacing: 2px;
  margin: 0;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
}

.about-hero__subtitle {
  font-family: "Crimson Text", serif;
  font-size: 1.5rem;
  font-style: italic;
  color: #af6025;
  margin-top: 0.25rem;
}

.about-hero__description {
  position: relative;
  z-index: 1;
  font-family: "Crimson Text", serif;
  font-size: 1.25rem;
  color: #7f7f7f;
  margin-top: 1rem;
}

/* Social Links */
.about-socials {
  width: 100%;
  max-width: 500px;
  margin-top: 3rem;
}

.about-socials__title {
  font-family: "Cinzel", serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #7f7f7f;
  text-align: center;
  margin-bottom: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.about-socials__grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

/* Responsive */
@media (min-width: 768px) {
  .about-hero__logo {
    width: 220px;
    height: 220px;
  }

  .about-hero__title {
    font-size: 4rem;
  }

  .about-hero__subtitle {
    font-size: 2rem;
  }
}
</style>
