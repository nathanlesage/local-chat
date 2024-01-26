<template>
  <button
    v-bind:class="{
      icon: icon !== undefined,
      small: size === 's',
      large: size === 'l',
      primary: type === 'primary',
      danger: type === 'danger',
      square: square !== undefined
    }"
  >
    <vue-feather
      v-if="icon !== undefined"
      v-bind:type="icon"
      v-bind:size="iconSize"
    ></vue-feather>
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type?: 'primary'|'danger'|'default' // Default: default
  icon?: string
  square?: any // If not undefined, will render square
  size?: 's'|'m'|'l' // Default: m
}>()

const iconSize = computed<number>(() => {
  if (props.size === 's') {
    return 8
  } else if (props.size === 'l') {
    return 16
  } else {
    return 12
  }
})

</script>

<style>
button {
  background-color: rgb(210, 210, 210);
  height: 23px;
  border: none;
  padding: 4px 10px;
  margin: 0 5px;
  border-radius: 8px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  color: #333;
}

button svg {
  width: 12px;
  height: 12px;
  stroke: #333;
}

button.primary {
  background-color: rgb(95, 155, 216);
  color: #fff;
}

button.primary svg { stroke: #fff; }

button.danger {
  background-color: rgb(64, 1, 1);
  color: #fff;
}

button.danger svg { stroke: #fff; }

button.danger:hover {
  background-color: rgb(242, 132, 132);
}

button.square {
  padding: 2px 4px;
  margin: 0 2px;
  border-radius: 4px;
  aspect-ratio: 1;
}

@media (prefers-color-scheme: dark) {
  button.danger {
    background-color: rgb(64, 1, 1);
  }
}
</style>