<template>
  <div id="sidebar">Sidebar</div>
</template>

<script setup lang="ts"></script>

<style>
div#sidebar {
  grid-area: sidebar;
  background-color: #ddd;
  padding: 10px;
}

@media (prefers-color-scheme: dark) {
  div#sidebar {
    background-color: #333;
  }
}
</style>
