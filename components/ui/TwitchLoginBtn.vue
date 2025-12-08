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
      <RunicButton
        variant="danger"
        size="sm"
        icon="logout"
        class="twitch-auth__logout-btn"
        title="Déconnexion"
        @click="handleLogout"
      >
        <span class="sr-only">Déconnexion</span>
      </RunicButton>
    </div>

    <!-- Logged out state -->
    <RunicButton
      v-else
      href="/auth/twitch"
      :external="false"
      variant="twitch"
      size="sm"
      icon="twitch"
    >
      Connexion
    </RunicButton>
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

/* Logout button - icon only version */
.twitch-auth__logout-btn {
  padding: 0.5rem !important;
}

.twitch-auth__logout-btn :deep(.runic-button__text) {
  display: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>

