<template>
  <Sidebar></Sidebar>
  <Chat></Chat>
  <Statusbar></Statusbar>
</template>

<script setup lang="ts">
import Chat from './Chat.vue'
import Statusbar from './Statusbar.vue'
import Sidebar from './Sidebar.vue'

</script>

<style>
* {
  box-sizing: border-box;
}

div#app {
  display: grid;
  grid-template-areas: "sidebar chat" "sidebar statusbar";
  grid-template-columns: 200px auto;
  grid-template-rows: auto 30px;
  width: 100vw;
  height: 100vh;
  overflow: auto;
}

html, body {
  padding: 0;
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

body {
  width: 100vw;
  height: 100vh;
  background-color: white;
}

@media (prefers-color-scheme: dark) {
  body {
    background-color: #222230;
    color: #eee;
  }

  svg {
    stroke: #eee;
  }
}
</style>
./pinia/models
