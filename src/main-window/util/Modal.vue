<template>
  <Teleport to="body">
    <div class="modal">
      <div
        class="modal-close"
        v-on:click="emit('close-modal')"
      >
        &times;
      </div>
      <div class="modal-header">
        <slot name="modal-header"></slot>
      </div>
      <div class="modal-body">
        <slot name="modal-body"></slot>
      </div>
      <div class="modal-footer">
        <slot name="modal-footer"></slot>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">

const emit = defineEmits<{
  (e: 'close-modal'): void
}>()

</script>

<style>

div.modal {
  position: absolute;
  z-index: 2;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  background-color: rgba(230, 230, 230);
  color: rgb(66, 66, 66);
  padding: 20px;
  overflow-x: hidden;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

div.modal .modal-body {
  flex-grow: 1;
  overflow-y: auto;
}

div.modal .modal-close {
  position: absolute;
  top: 20px;
  right: 20px;
  cursor: pointer;
  font-size: 200%;
}

@media (prefers-color-scheme: dark) {
  div.modal {
    background-color: rgb(66, 66, 66);
    color: white;
  }
}
</style>
