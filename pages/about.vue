<script setup lang="ts">
useHead({
  title: "À propos - Le Collecteur de Dose",
});
</script>

<template>
  <NuxtLayout>
    <div class="min-h-[80vh] flex flex-col items-center px-4 py-8">
      <!-- Hero section -->
      <section class="relative flex flex-col items-center text-center py-12">
        <div class="about-hero__glow"></div>

        <!-- Logo -->
        <div class="relative z-10 mb-6">
          <img
            :src="'/images/logo.png'"
            alt="Logo Le Collecteur de Dose"
            class="about-hero__logo"
          />
        </div>

        <!-- Title -->
        <div class="relative z-10 flex flex-col leading-none mb-4">
          <h1
            class="font-display text-5xl md:text-6xl font-bold text-white/90 tracking-wide m-0 drop-shadow-lg"
          >
            Le Collecteur
          </h1>
          <span class="font-body text-2xl md:text-3xl italic text-accent mt-1"
            >de Dose</span
          >
        </div>

        <!-- Description -->
        <p class="relative z-10 font-body text-xl text-poe-text-dim mt-4">
          Seuls les plus dignes survivront.
        </p>
      </section>

      <!-- Social links -->
      <section class="w-full max-w-lg mt-12">
        <h2
          class="font-display text-xl font-semibold text-poe-text-dim text-center mb-6 uppercase tracking-widest"
        >
          Rejoins la cave
        </h2>

        <div class="flex flex-col items-center gap-4">
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
/* Glow effect behind logo */
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

/* Logo with float animation */
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

/* Responsive logo size */
@media (min-width: 768px) {
  .about-hero__logo {
    width: 220px;
    height: 220px;
  }
}
</style>
