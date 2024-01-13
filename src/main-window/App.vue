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

/* Loading spinner styles */
.spinner_V8m1{
  transform-origin: center;
  animation:spinner_zKoa 2s linear infinite
}
.spinner_V8m1 circle{
  stroke-linecap: round;
  animation: spinner_YpZS 1.5s ease-in-out infinite;
}
@keyframes spinner_zKoa{
  100% { transform: rotate(360deg) }
}
@keyframes spinner_YpZS{
  0% {
    stroke-dasharray: 0 150;
    stroke-dashoffset:0;
  }
  47.5%{
    stroke-dasharray: 42 150;
    stroke-dashoffset:-16;
  }
  95%,100%{
    stroke-dasharray: 42 150;
    stroke-dashoffset: -59;
  }
}
/* End loading spinner styles */


div#app {
  display: grid;
  grid-template-areas: "sidebar chat" "statusbar statusbar";
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

  a {
    color: rgb(138, 130, 255);
  }
}
</style>
./pinia/models
