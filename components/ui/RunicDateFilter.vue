<script setup lang="ts">
const { t } = useI18n()

interface Props {
  modelValue: string // ISO date string for start date, empty string for "all"
  size?: 'sm' | 'md' | 'lg'
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
  placeholder: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Date filter options
const dateFilterOptions = computed(() => [
  { value: '', label: 'Toutes les dates' },
  { value: '3d', label: '3 derniers jours' },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: '90d', label: '90 derniers jours' },
  { value: 'custom', label: 'Période personnalisée' },
])

// Current selected period (e.g., '3d', '7d', etc.)
const selectedPeriod = ref<string>('3d') // Default to 3 days

// Custom date range
const customStartDate = ref<string>('')
const customEndDate = ref<string>('')
const showCustomDates = ref(false)

// Calculate start date from period
const calculateStartDate = (period: string): string => {
  if (!period || period === '') return ''
  if (period === 'custom') {
    // For custom, return the date as ISO string (with time)
    if (customStartDate.value) {
      const date = new Date(customStartDate.value)
      date.setHours(0, 0, 0, 0)
      return date.toISOString()
    }
    return ''
  }
  
  const now = new Date()
  const days = parseInt(period.replace('d', ''))
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)
  return startDate.toISOString()
}

// Watch selected period and emit start date
watch(selectedPeriod, (newPeriod) => {
  if (newPeriod === 'custom') {
    showCustomDates.value = true
    if (customStartDate.value) {
      emit('update:modelValue', customStartDate.value)
    }
  } else {
    showCustomDates.value = false
    const startDate = calculateStartDate(newPeriod)
    emit('update:modelValue', startDate)
  }
})

// Watch custom dates
watch([customStartDate, customEndDate], () => {
  if (selectedPeriod.value === 'custom' && customStartDate.value) {
    const date = new Date(customStartDate.value)
    date.setHours(0, 0, 0, 0)
    emit('update:modelValue', date.toISOString())
  }
})

// Initialize from modelValue or set default
onMounted(() => {
  if (props.modelValue) {
    // Check if modelValue matches a predefined period
    const now = new Date()
    const modelDate = new Date(props.modelValue)
    const diffMs = now.getTime() - modelDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    // Allow some tolerance (±1 day) for matching periods
    if (diffDays >= 2 && diffDays <= 4) {
      selectedPeriod.value = '3d'
    } else if (diffDays >= 6 && diffDays <= 8) {
      selectedPeriod.value = '7d'
    } else if (diffDays >= 29 && diffDays <= 31) {
      selectedPeriod.value = '30d'
    } else if (diffDays >= 89 && diffDays <= 91) {
      selectedPeriod.value = '90d'
    } else {
      selectedPeriod.value = 'custom'
      customStartDate.value = props.modelValue.split('T')[0] // Format YYYY-MM-DD for date input
      showCustomDates.value = true
    }
  } else {
    // Default to 3 days - emit immediately
    selectedPeriod.value = '3d'
    const startDate = calculateStartDate('3d')
    emit('update:modelValue', startDate)
  }
})

// Format date for display
const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="runic-date-filter">
    <RunicSelect
      v-model="selectedPeriod"
      :options="dateFilterOptions"
      :placeholder="placeholder || 'Période'"
      :size="size"
      class="runic-date-filter__select"
    />
    
    <!-- Custom date inputs -->
    <div v-if="showCustomDates" class="runic-date-filter__custom">
      <div class="runic-date-filter__custom-inputs">
        <div class="runic-date-filter__custom-input-wrapper">
          <label class="runic-date-filter__custom-label">Du</label>
          <input
            v-model="customStartDate"
            type="date"
            class="runic-date-filter__custom-input"
          />
        </div>
        <div class="runic-date-filter__custom-input-wrapper">
          <label class="runic-date-filter__custom-label">Au</label>
          <input
            v-model="customEndDate"
            type="date"
            class="runic-date-filter__custom-input"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.runic-date-filter {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.runic-date-filter__select {
  flex: 1;
  min-width: 150px;
}

.runic-date-filter__custom {
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-radius: 4px;
}

.runic-date-filter__custom-inputs {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.runic-date-filter__custom-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.runic-date-filter__custom-label {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(140, 130, 120, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.runic-date-filter__custom-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.95) 0%,
    rgba(14, 14, 16, 0.9) 40%,
    rgba(10, 10, 12, 0.95) 100%
  );
  border: 1px solid rgba(35, 32, 28, 0.8);
  border-radius: 4px;
  color: #c8c8c8;
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.6),
    inset 0 1px 2px rgba(0, 0, 0, 0.8);
  transition: all 0.2s ease;
}

.runic-date-filter__custom-input:focus {
  outline: none;
  border-color: rgba(175, 96, 37, 0.4);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.6),
    inset 0 1px 2px rgba(0, 0, 0, 0.8),
    0 0 8px rgba(175, 96, 37, 0.1);
}

.runic-date-filter__custom-input::-webkit-calendar-picker-indicator {
  filter: invert(0.5);
  cursor: pointer;
}

@media (max-width: 768px) {
  .runic-date-filter__custom-inputs {
    flex-direction: column;
  }
}
</style>
