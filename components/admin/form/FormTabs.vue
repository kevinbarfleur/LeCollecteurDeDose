<script setup lang="ts">
/**
 * FormTabs
 *
 * Vertical tab navigation.
 * Desktop: vertical list
 * Mobile: dropdown/accordion
 */

interface TabItem {
  key: string
  label: string
  icon?: string
}

interface Props {
  tabs: TabItem[]
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Mobile dropdown state
const isOpen = ref(false)

// Current tab label for mobile display
const currentTabLabel = computed(() => {
  const tab = props.tabs.find((t) => t.key === props.modelValue)
  return tab?.label || ''
})

const currentTabIcon = computed(() => {
  const tab = props.tabs.find((t) => t.key === props.modelValue)
  return tab?.icon || ''
})

const selectTab = (key: string) => {
  emit('update:modelValue', key)
  isOpen.value = false
}

// Close dropdown on outside click
const tabsRef = ref<HTMLElement | null>(null)

const handleClickOutside = (e: MouseEvent) => {
  if (tabsRef.value && !tabsRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <nav ref="tabsRef" class="form-tabs">
    <!-- Desktop: vertical list -->
    <div class="form-tabs__desktop">
      <FormTabItem
        v-for="tab in tabs"
        :key="tab.key"
        :label="tab.label"
        :icon="tab.icon"
        :active="tab.key === modelValue"
        @click="selectTab(tab.key)"
      />
    </div>

    <!-- Mobile: dropdown -->
    <div class="form-tabs__mobile">
      <button
        class="form-tabs__dropdown-trigger"
        type="button"
        @click="isOpen = !isOpen"
      >
        <span v-if="currentTabIcon" class="form-tabs__dropdown-icon">{{ currentTabIcon }}</span>
        <span class="form-tabs__dropdown-label">{{ currentTabLabel }}</span>
        <span class="form-tabs__dropdown-arrow" :class="{ 'form-tabs__dropdown-arrow--open': isOpen }">
          ▼
        </span>
      </button>

      <Transition name="dropdown">
        <div v-if="isOpen" class="form-tabs__dropdown-menu">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="form-tabs__dropdown-item"
            :class="{ 'form-tabs__dropdown-item--active': tab.key === modelValue }"
            type="button"
            @click="selectTab(tab.key)"
          >
            <span v-if="tab.icon" class="form-tabs__dropdown-item-icon">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        </div>
      </Transition>
    </div>
  </nav>
</template>

<style scoped>
.form-tabs {
  display: flex;
  flex-direction: column;
}

/* Desktop vertical list */
.form-tabs__desktop {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Mobile dropdown - hidden on desktop */
.form-tabs__mobile {
  display: none;
}

/* Mobile: show dropdown, hide vertical list */
@media (max-width: 768px) {
  .form-tabs__desktop {
    display: none;
  }

  .form-tabs__mobile {
    display: block;
    position: relative;
  }

  .form-tabs__dropdown-trigger {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.875rem 1rem;
    cursor: pointer;
    text-align: left;
    overflow: hidden;

    /* Deep carved groove effect */
    background: linear-gradient(
      180deg,
      rgba(8, 8, 10, 0.95) 0%,
      rgba(14, 14, 16, 0.9) 40%,
      rgba(10, 10, 12, 0.95) 100%
    );

    /* Deep inset shadow */
    box-shadow:
      inset 0 3px 10px rgba(0, 0, 0, 0.8),
      inset 0 1px 3px rgba(0, 0, 0, 0.9),
      inset 0 -1px 1px rgba(60, 55, 50, 0.08),
      0 1px 0 rgba(45, 40, 35, 0.3);

    /* Worn stone border */
    border: 1px solid rgba(35, 32, 28, 0.8);
    border-top-color: rgba(25, 22, 18, 0.9);
    border-bottom-color: rgba(55, 50, 45, 0.35);
    border-radius: 4px;

    transition: all 0.3s ease;
  }

  .form-tabs__dropdown-trigger:hover {
    border-color: rgba(175, 96, 37, 0.4);
    box-shadow:
      inset 0 3px 10px rgba(0, 0, 0, 0.8),
      inset 0 1px 3px rgba(0, 0, 0, 0.9),
      inset 0 -1px 1px rgba(175, 96, 37, 0.1),
      0 0 15px rgba(175, 96, 37, 0.1),
      0 1px 0 rgba(45, 40, 35, 0.3);
  }

  .form-tabs__dropdown-icon {
    font-size: 1rem;
  }

  .form-tabs__dropdown-label {
    flex: 1;
    font-family: 'Cinzel', serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: #c97a3a;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .form-tabs__dropdown-arrow {
    font-size: 0.625rem;
    color: rgba(175, 96, 37, 0.6);
    transition: transform 0.2s ease;
  }

  .form-tabs__dropdown-arrow--open {
    transform: rotate(180deg);
  }

  .form-tabs__dropdown-menu {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    right: 0;
    z-index: 100;
    display: flex;
    flex-direction: column;
    padding: 4px;
    background: linear-gradient(
      180deg,
      rgba(18, 18, 22, 0.99) 0%,
      rgba(12, 12, 15, 1) 100%
    );
    border: 1px solid rgba(60, 55, 50, 0.5);
    border-radius: 4px;
    box-shadow:
      0 12px 40px rgba(0, 0, 0, 0.7),
      0 6px 16px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(80, 75, 70, 0.15);
    overflow: hidden;
  }

  .form-tabs__dropdown-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: pointer;
    text-align: left;
    font-family: 'Cinzel', serif;
    font-size: 0.8125rem;
    font-weight: 500;
    color: rgba(180, 170, 155, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    transition: all 0.2s ease;
  }

  .form-tabs__dropdown-item:hover {
    border-color: rgba(175, 135, 80, 0.3);
    color: rgba(200, 190, 175, 0.85);
    box-shadow:
      inset 0 0 0 1px rgba(175, 135, 80, 0.1),
      0 0 8px rgba(175, 135, 80, 0.05);
  }

  .form-tabs__dropdown-item--active {
    background: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 4px,
      rgba(175, 135, 80, 0.06) 4px,
      rgba(175, 135, 80, 0.06) 8px
    );
    border-color: rgba(175, 135, 80, 0.2);
    color: #c97a3a;
  }

  .form-tabs__dropdown-item--active:hover {
    background: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 4px,
      rgba(175, 135, 80, 0.08) 4px,
      rgba(175, 135, 80, 0.08) 8px
    );
    border-color: rgba(175, 135, 80, 0.35);
  }

  .form-tabs__dropdown-item-icon {
    font-size: 1rem;
  }
}

/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
