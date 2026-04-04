<script setup lang="ts">
import type { PitLoadoutSlot } from '~/types/pit'

const props = defineProps<{
  slotData: PitLoadoutSlot
}>()

const emit = defineEmits<{
  remove: []
}>()
</script>

<template>
  <div class="pit-eslot">
    <!-- Header -->
    <div class="pit-eslot__header">
      <span class="pit-eslot__icon" v-html="slotData.icon" />
      <span class="pit-eslot__label">{{ slotData.label }}</span>
      <span v-if="slotData.card" class="pit-eslot__check">&#10003;</span>
    </div>
    <!-- Empty -->
    <div v-if="!slotData.card" class="pit-eslot__empty" :class="{ 'pit-eslot__empty--disabled': slotData.isDisabled }">
      <span v-if="slotData.disabledReason" class="pit-eslot__disabled-reason">{{ slotData.disabledReason }}</span>
      <span v-else class="pit-eslot__placeholder">—</span>
    </div>
    <!-- Filled -->
    <div v-else class="pit-eslot__filled" @click="emit('remove')" :title="`Retirer ${slotData.card.name}`">
      <span class="pit-eslot__tier" :class="`pit-eslot__tier--${slotData.card.tier.toLowerCase()}`">{{ slotData.card.tier }}</span>
      <span class="pit-eslot__name">{{ slotData.card.name }}</span>
    </div>
  </div>
</template>

<style scoped>
.pit-eslot {
  min-width: 0;
}

.pit-eslot__header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 3px;
}

.pit-eslot__icon {
  font-size: 0.75rem;
  color: rgba(175, 96, 37, 0.35);
  flex-shrink: 0;
}

.pit-eslot__label {
  font-family: 'Cinzel', serif;
  font-size: 0.6rem;
  font-weight: 600;
  color: rgba(200, 196, 183, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pit-eslot__check {
  margin-left: auto;
  font-size: 0.65rem;
  color: #27ae60;
  flex-shrink: 0;
}

.pit-eslot__empty {
  background: rgba(10, 10, 12, 0.5);
  border: 1px dashed rgba(42, 42, 53, 0.35);
  border-radius: 4px;
  padding: 8px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  transition: border-color 0.2s;
}

.pit-eslot__empty:hover {
  border-color: rgba(175, 96, 37, 0.25);
}

.pit-eslot__empty--disabled {
  opacity: 0.2;
  pointer-events: none;
}

.pit-eslot__disabled-reason {
  font-family: 'Crimson Text', serif;
  font-size: 0.6rem;
  color: rgba(200, 50, 50, 0.4);
  text-align: center;
}

.pit-eslot__placeholder {
  color: rgba(90, 90, 96, 0.3);
  font-size: 0.75rem;
}

.pit-eslot__filled {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 8px;
  background: rgba(10, 10, 12, 0.5);
  border: 1px solid rgba(42, 42, 53, 0.45);
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s;
  min-height: 36px;
}

.pit-eslot__filled:hover {
  border-color: rgba(200, 50, 50, 0.3);
}

.pit-eslot__tier {
  font-family: 'Cinzel', serif;
  font-size: 0.5rem;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
}

.pit-eslot__tier--t0 { color: #c9a227; border: 1px solid rgba(201, 162, 39, 0.3); }
.pit-eslot__tier--t1 { color: #7a6a8a; border: 1px solid rgba(122, 106, 138, 0.3); }
.pit-eslot__tier--t2 { color: #5a7080; border: 1px solid rgba(90, 112, 128, 0.3); }
.pit-eslot__tier--t3 { color: #5a5a5d; border: 1px solid rgba(90, 90, 93, 0.3); }

.pit-eslot__name {
  font-family: 'Crimson Text', serif;
  font-size: 0.7rem;
  color: rgba(232, 230, 227, 0.75);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
