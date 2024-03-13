<template>
  <div
    v-for="[ label, value ] in Object.entries(props.options)"
    class="radio-element"
    v-key="value"
  >
    <label v-bind:for="`${name}-${value}`" class="radio-element-input">
      <input
        type="radio"
        v-bind:name="props.name"
        v-bind:value="value"
        v-bind:id="`${name}-${value}`"
        v-on:change="emit('update:modelValue', value)"
        v-bind:checked="props.modelValue === value"
      >
      <div class="radio-toggle"></div>
    </label>
    <label v-bind:for="`${name}-${value}`">{{ label }}</label>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
// Using a "T extends string" means that we have a generic that can take a few
// pre-defined options (as in a Radio button). The component won't care about
// what it is, the component only says: The modelValue needs to conform to that
// Type, each option must have a value that conforms to it, and our emit
// likewise will only emit values that conform to it.
// The implementing parent component will provide the concrete values for it
// via the modelValue.
const props = defineProps<{
  name: string
  modelValue: T
  options: { [key: string]: T }
}>()

const emit = defineEmits<(e: 'update:modelValue', value: T) => void>()
</script>

<style>
div.radio-element {
  margin: 5px 0;
  display: flex;
  align-items: center;
}

div.radio-element label.radio-element-input {
  display: inline-block;
  width: 15px;
  height: 15px;
  margin-right: 10px;
}

div.radio-element label.radio-element-input div.radio-toggle {
  width: 15px;
  height: 15px;
  border: 1px solid black;
  border-radius: 50%;
}

div.radio-element label.radio-element-input input:checked + div.radio-toggle {
  background-color: var(--accent-color);
}

div.radio-element label.radio-element-input input[type="radio"] {
  display: none;
}

@media (prefers-color-scheme: dark) {
  div.radio-element label.radio-element-input div.radio-toggle {
    border-color: white;
  }
}
</style>
