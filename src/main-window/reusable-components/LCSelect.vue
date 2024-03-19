<template>
  <select v-bind:name="props.name" v-model="modelValue">
    <option
      v-for="{ label, value, disabled } in props.options"
      v-bind:value="value"
      v-bind:selected="value === modelValue"
      v-bind:disabled="disabled === true"
    >
      {{ label }}
    </option>
  </select>
</template>

<script setup lang="ts" generic="T extends string">
import { ref, watch, toRef } from 'vue'
// Using a "T extends string" means that we have a generic that can take a few
// pre-defined options (as in a Select). The component won't care about what it
// is, the component only says: The modelValue needs to conform to that Type,
// each option must have a value that conforms to it, and our emit likewise will
// only emit values that conform to it. The implementing parent component will
// provide the concrete values for it via the modelValue.
export interface LCSelectOption<T = string> {
  label: string
  value: T
  disabled?: boolean
}

const props = defineProps<{
  name: string
  modelValue: T
  options: LCSelectOption[]
}>()

const emit = defineEmits<(e: 'update:modelValue', value: T) => void>()

const modelValue = ref(props.modelValue)

watch(toRef(props, 'modelValue'), (value) => {
  modelValue.value = value
})

watch(modelValue, (value) => {
  // @ts-expect-error "value" is of type T, but due to limitations in the Types, it detects UnwrapRef<T>
  emit('update:modelValue', value)
})
</script>

<style>
</style>
