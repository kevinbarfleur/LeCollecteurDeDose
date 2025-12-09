<script setup lang="ts">
interface StatItem {
  value: number | string;
  label: string;
  color?: "default" | "t0" | "t1" | "t2" | "t3";
}

interface Props {
  stats: StatItem[];
  attached?: boolean;
}

withDefaults(defineProps<Props>(), {
  attached: false,
});
</script>

<template>
  <div
    class="runic-stats"
    :class="{ 'runic-stats--attached': attached }"
  >
    <RunicBox padding="md">
      <div class="runic-stats__items">
        <RunicNumber
          v-for="(stat, index) in stats"
          :key="index"
          :value="stat.value"
          :label="stat.label"
          :color="stat.color || 'default'"
          size="lg"
        />
      </div>
    </RunicBox>
  </div>
</template>

<style scoped>
.runic-stats {
  position: relative;
  display: inline-flex;
  width: 100%;
}

.runic-stats--attached :deep(.runic-box) {
  border-radius: 0 0 6px 6px;
  border-top: none;
}

.runic-stats__items {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

@media (min-width: 640px) {
  .runic-stats__items { gap: 1.5rem; }
}

@media (min-width: 768px) {
  .runic-stats__items { gap: 2rem; }
}
</style>
