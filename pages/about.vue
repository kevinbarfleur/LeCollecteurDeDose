<script setup lang="ts">
useHead({
  title: 'À propos - Le Collecteur de Dose'
})

const socialLinks = [
  {
    name: 'Twitch',
    url: 'https://www.twitch.tv/les_doseurs',
    label: 'Les Doseurs',
    icon: 'twitch',
    color: '#9146FF'
  },
  {
    name: 'YouTube',
    url: 'https://www.youtube.com/@LesDoseurs',
    label: 'Les Doseurs',
    icon: 'youtube',
    color: '#FF0000'
  },
  {
    name: 'YouTube',
    url: 'https://www.youtube.com/@LesDoseursPOE',
    label: 'Les Doseurs POE',
    icon: 'youtube',
    color: '#FF0000'
  }
]
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
        <p class="about-hero__description">
          Collectionnez les cartes, dominez le jeu
        </p>
      </section>

      <!-- Social links -->
      <section class="about-socials">
        <h2 class="about-socials__title">Retrouvez-nous</h2>
        
        <div class="about-socials__grid">
          <a
            v-for="link in socialLinks"
            :key="link.url"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="social-card"
            :style="{ '--accent-color': link.color }"
          >
            <!-- Icon -->
            <div class="social-card__icon">
              <svg v-if="link.icon === 'twitch'" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
              </svg>
              <svg v-else-if="link.icon === 'youtube'" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>

            <!-- Content -->
            <div class="social-card__content">
              <span class="social-card__platform">{{ link.name }}</span>
              <span class="social-card__label">{{ link.label }}</span>
            </div>

            <!-- Arrow -->
            <svg class="social-card__arrow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </section>

      <!-- CTA -->
      <section class="about-cta">
        <NuxtLink to="/" class="about-cta__btn">
          <span>Voir le Catalogue</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </NuxtLink>
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
  background: radial-gradient(circle, rgba(175, 96, 37, 0.15) 0%, transparent 70%);
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
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
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
  font-family: 'Cinzel', serif;
  font-size: 3rem;
  font-weight: 700;
  color: #e0e0e0;
  letter-spacing: 2px;
  margin: 0;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
}

.about-hero__subtitle {
  font-family: 'Crimson Text', serif;
  font-size: 1.5rem;
  font-style: italic;
  color: #af6025;
  margin-top: 0.25rem;
}

.about-hero__description {
  position: relative;
  z-index: 1;
  font-family: 'Crimson Text', serif;
  font-size: 1.25rem;
  color: #7f7f7f;
  margin-top: 1rem;
}

/* Social Links */
.about-socials {
  width: 100%;
  max-width: 600px;
  margin-top: 3rem;
}

.about-socials__title {
  font-family: 'Cinzel', serif;
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
  gap: 1rem;
}

.social-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: rgba(21, 21, 24, 0.8);
  border: 1px solid rgba(42, 42, 48, 0.6);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.3s ease;
}

.social-card:hover {
  background: rgba(30, 30, 34, 0.9);
  border-color: var(--accent-color);
  transform: translateX(8px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.social-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  color: var(--accent-color);
  transition: all 0.3s ease;
}

.social-card:hover .social-card__icon {
  background: var(--accent-color);
  color: white;
  transform: scale(1.1);
}

.social-card__icon svg {
  width: 24px;
  height: 24px;
}

.social-card__content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.social-card__platform {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: #5a5a5a;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.social-card__label {
  font-family: 'Crimson Text', serif;
  font-size: 1.25rem;
  color: #c8c8c8;
  margin-top: 0.125rem;
}

.social-card__arrow {
  width: 20px;
  height: 20px;
  color: #4a4a55;
  transition: all 0.3s ease;
}

.social-card:hover .social-card__arrow {
  color: var(--accent-color);
  transform: translateX(4px);
}

/* CTA */
.about-cta {
  margin-top: 3rem;
}

.about-cta__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1c;
  background: linear-gradient(135deg, #c9a227 0%, #af6025 100%);
  border: none;
  border-radius: 8px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(175, 96, 37, 0.3);
}

.about-cta__btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(175, 96, 37, 0.4);
}

.about-cta__btn svg {
  width: 20px;
  height: 20px;
  transition: transform 0.3s ease;
}

.about-cta__btn:hover svg {
  transform: translateX(4px);
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

