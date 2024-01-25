<template>
  <div
    id="window-content"
    v-on:mouseup="endResizing"
    v-on:mousemove="onResizing"
    v-bind:class="{ 'sidebar-hidden': !showSidebar }"
  >
    <div
      id="toggle-sidebar"
      title="Toggle sidebar"
      v-on:click="toggleSidebar"
    >
      <vue-feather type="menu"></vue-feather>
    </div>

    <Sidebar v-show="showSidebar"></Sidebar>
    <Chat></Chat>
    <Statusbar></Statusbar>
    <div v-if="showSidebar" id="resizer" v-on:mousedown="beginResizing"></div>
    <FirstStartGuide
      v-if="showFirstStartGuide"
      v-on:close-modal="showFirstStartGuide = false"
    >
    </FirstStartGuide>
  </div>
</template>

<script setup lang="ts">
import Chat from './Chat.vue'
import Statusbar from './Statusbar.vue'
import Sidebar from './Sidebar.vue'
import FirstStartGuide from './FirstStartGuide.vue'
import { ref } from 'vue'

const ipcRenderer = window.ipc

const sidebarWidth = ref<string>('200px')
const showSidebar = ref<boolean>(true)

const isResizing = ref<boolean>(false)
const lastOffset = ref<number>(0)
const showFirstStartGuide = ref<boolean>(false)

ipcRenderer.invoke('should-show-first-start-guide')
  .then((res: boolean) => {
    showFirstStartGuide.value = res
  })

function beginResizing (event: MouseEvent) {
  if (!showSidebar.value) {
    return
  }
  isResizing.value = true
  lastOffset.value = event.clientX
}

function onResizing (event: MouseEvent) {
  if (!isResizing.value || !showSidebar.value) {
    return
  }

  event.preventDefault()
  const offset = event.clientX
  sidebarWidth.value = `${offset}px`
  lastOffset.value = offset
}

function endResizing (event: MouseEvent) {
  isResizing.value = false
  lastOffset.value = 0
}

function toggleSidebar () {
  showSidebar.value = !showSidebar.value
}

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

:root {
  --footer-height: 30px;
}

div#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

div#toggle-sidebar {
  position: absolute;
  top: 10px;
  left: 10px;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

div#toggle-sidebar svg {
  width: 15px;
  height: 15px;
  color: white;
}

div#window-content {
  display: grid;
  grid-template-areas: "sidebar chat" "statusbar statusbar";
  /* Bind a variable size width to the template columns */
  grid-template-columns: v-bind(sidebarWidth) auto;
  grid-template-rows: auto var(--footer-height);
  width: 100vw;
  height: 100vh;
  overflow: auto;
}

div#window-content.sidebar-hidden {
  grid-template-areas: "chat" "statusbar";
  grid-template-columns: auto;
}

div#resizer {
  width: 6px;
  position: absolute;
  top: 0px;
  bottom: var(--footer-height);
  left: calc(v-bind(sidebarWidth) - 3px);
  cursor: ew-resize;
  transition: 0.2s background-color ease;
  z-index: 1;
}

div#resizer:hover {
  background-color: rgba(0, 0, 0, .5);
}

html, body {
  padding: 0;
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  cursor: default;
}

body {
  width: 100vw;
  height: 100vh;
  background-color: white;
}

select {
  background-color: rgb(210, 210, 210);
  border: none;
  padding: 4px 10px;
  margin: 0 5px;
  border-radius: 8px;
}

details summary {
  cursor: pointer;
}

li {
  margin-top: 15px;
}

@media (prefers-color-scheme: light) {
  div#window-content.sidebar-hidden div#toggle-sidebar svg {
    color: #333;
  }
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
