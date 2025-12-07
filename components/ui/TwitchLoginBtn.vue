<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()

const handleLogout = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  navigateTo('/')
}
</script>

<template>
  <div class="twitch-auth">
    <!-- Logged in state -->
    <div v-if="loggedIn && user" class="twitch-auth__user">
      <img 
        :src="user.avatar" 
        :alt="user.displayName"
        class="twitch-auth__avatar"
      />
      <span class="twitch-auth__name">{{ user.displayName }}</span>
      <button 
        class="twitch-auth__logout"
        title="Déconnexion"
        @click="handleLogout"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>

    <!-- Logged out state -->
    <a v-else href="/auth/twitch" class="twitch-auth__login">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>
      <span>Connexion</span>
    </a>
  </div>
</template>

<style scoped>
.twitch-auth__user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.twitch-auth__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #9146FF;
}

.twitch-auth__name {
  font-family: 'Cinzel', serif;
  font-size: 0.875rem;
  color: #c8c8c8;
  display: none;
}

@media (min-width: 640px) {
  .twitch-auth__name {
    display: block;
  }
}

.twitch-auth__logout {
  padding: 0.5rem;
  color: #7f7f7f;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.twitch-auth__logout:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.twitch-auth__logout svg {
  width: 18px;
  height: 18px;
}

.twitch-auth__login {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: white;
  background: #9146FF;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.twitch-auth__login:hover {
  background: #7c3aed;
  box-shadow: 0 4px 15px rgba(145, 70, 255, 0.3);
}

.twitch-auth__login svg {
  width: 16px;
  height: 16px;
}
</style>

