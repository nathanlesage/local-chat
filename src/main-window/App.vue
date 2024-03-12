<template>
  <div
    id="window-content"
    v-on:mouseup="endResizing"
    v-on:mousemove="onResizing"
    v-bind:class="{ 'sidebar-hidden': !appState.showSidebar }"
  >
    <aside v-show="appState.showSidebar" id="sidebar">
      <div id="sidebar-header">
        <template v-if="showSearchBar">
          <input
            ref="filterInput"
            type="search"
            placeholder="Search…"
            v-model="conversationFilterQuery"
            v-on:keydown.prevent.escape="showSearchBar = false"
          >
        </template>
        <template v-else>
          <LCButton v-on:click="showSearchBar = true" type="primary" icon="search" square="true" title="Search conversations"></LCButton>
          <LCButton v-on:click="newConversation" icon="plus-square" square="true" title="New conversation"></LCButton>
        </template>
      </div>
      <div id="sidebar-wrapper">
        <ConversationManager v-bind:filter="conversationFilterQuery"></ConversationManager>
      </div>
    </aside>
    <div v-if="appState.showSidebar" id="resizer" v-on:mousedown="beginResizing"></div>

    <div
      id="toggle-sidebar"
      title="Toggle sidebar"
      v-bind:class="{ 'sidebar-open': appState.showSidebar }"
    >
      <vue-feather
        v-if="!showSearchBar"
        v-on:click="toggleSidebar" type="menu"
      ></vue-feather>
      <vue-feather
        v-else
        v-on:click="showSearchBar = false" type="x"
      ></vue-feather>
    </div>

    <div id="chat-wrapper">
      <!-- Show modals if applicable -->
      <ModelManager v-if="appState.showModelManager"></ModelManager>
      <PromptManager v-else-if="appState.showPromptManager"></PromptManager>
      <!-- Otherwise, show the welcome message if there are no models. -->
      <WelcomeMessage v-else-if="modelStore.models.length === 0"></WelcomeMessage>
      <!-- Else, if we have a conversation, display that one ...-->
      <Chat v-else></Chat>
    </div>
    <Statusbar></Statusbar>
  </div>
</template>

<script setup lang="ts">
import Chat from './Chat.vue'
import Statusbar from './Statusbar.vue'
import ConversationManager from './ConversationManager.vue'
import { nextTick, ref, watch } from 'vue'
import { useModelStore } from './pinia/models'
import ModelManager from './ModelManager.vue'
import PromptManager from './PromptManager.vue'
import WelcomeMessage from './WelcomeMessage.vue'
import LCButton from './reusable-components/LCButton.vue'
import { useAppStateStore } from './pinia/app-state'
import { useConversationStore } from './pinia/conversations'
import { alertError } from './util/prompts'

const ipcRenderer = window.ipc

const modelStore = useModelStore()
const conversationStore = useConversationStore()
const appState = useAppStateStore()

const showSearchBar = ref<boolean>(false) // DEBUG
const conversationFilterQuery = ref<string>('')
const filterInput = ref<HTMLInputElement|null>(null)

const sidebarWidth = ref<string>('200px')

const isResizing = ref<boolean>(false)
const lastOffset = ref<number>(0)

watch(showSearchBar, (newValue, oldValue) => {
  if (!oldValue && newValue) {
    nextTick().then(() =>{
      // Focus filter input
      filterInput.value?.focus()
      filterInput.value?.select()
    })
  } else if (!newValue) {
    conversationFilterQuery.value = '' // Reset filter
  }
})

function newConversation () {
  ipcRenderer.invoke('new-conversation', modelStore.currentModel?.path)
    .catch(err => alertError(err))
}

function beginResizing (event: MouseEvent) {
  if (!appState.showSidebar) {
    return
  }
  isResizing.value = true
  lastOffset.value = event.clientX
}

function onResizing (event: MouseEvent) {
  if (!isResizing.value || !appState.showSidebar) {
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
  appState.showSidebar = !appState.showSidebar
}

</script>

<style>
* {
  box-sizing: border-box;
}

/* Loading spinner styles */
.spinner_V8m1 {
  transform-origin: center;
  animation:spinner_zKoa 2s linear infinite
}
.spinner_V8m1 circle {
  stroke-linecap: round;
  animation: spinner_YpZS 1.5s ease-in-out infinite;
}
@keyframes spinner_zKoa {
  100% { transform: rotate(360deg) }
}
@keyframes spinner_YpZS {
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
  --sidebar-header-height: 40px;
}

div#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

div#chat-wrapper {
  grid-area: chat;
  overflow-y: auto;
  padding: 40px;
}

aside#sidebar {
  position: relative;
  grid-area: sidebar;
  background-color: rgb(55, 55, 55);
  color: white;
  overflow-y: auto;
}

div#sidebar-wrapper {
  padding: 10px;
  padding-top: var(--sidebar-header-height);
}

div#sidebar-header {
  width: v-bind(sidebarWidth);
  height: var(--sidebar-header-height);
  background-color: rgba(55, 55, 55, .7);
  backdrop-filter: blur(5px);
  position: fixed;
  z-index: 1;
  padding: 10px;
  text-align: right;
}

div#sidebar-header input[type="search"] {
  height: var(--sidebar-header-height);
  width: v-bind(sidebarWidth);
  background-color: transparent;
  outline: none;
  color: inherit;
  border: none;
  display: block;
  padding: 0;
  padding-left: 40px; /* Offset from the sidebar hiding button */
  margin: -10px;
}

div#toggle-sidebar {
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 40px;
  padding-left: 10px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  z-index: 1;
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

abbr {
  cursor: help;
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

  aside#sidebar {
    background-color: #333;
  }
}
</style>
./pinia/models
