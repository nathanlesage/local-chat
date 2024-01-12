<template>
  <div id="chat">
    <p>You are conversing with: {{ store.currentModelId }}</p>
    <div
      v-for="message in conversationStore.conversations?.messages"
      v-bind:class="messageClass(message)"
    >
      <div class="message-header">
        <h4>{{ messageUser(message) }}:</h4>
        <div class="message-timestamp">{{ formatDate(message.timestamp) }}</div>
        <div class="message-generation-time">
          Generated in {{  formatGenerationTime(message.generationTime) }}s
        </div>
      </div>
      <div class="message-icon" v-html="messageIcon(message)">
      </div>
      <div class="message-body" v-html="messageHTML(message)">
      </div>
    </div>

    <div id="generating-message" class="message assistant" v-if="isGenerating">
      <div class="message-header">
        <h4>Assistant:</h4>
        <div class="message-timestamp">0</div>
        <div class="message-generation-time">
          {{ formatGenerationTime(currentGenerationTime) }}s
        </div>
      </div>
      <div class="message-icon" v-html="CodeIcon">
      </div>
      <div class="message-body">
        Generating response&hellip;
        <!-- Loading spinner taken from https://github.com/n3r4zzurr0/svg-spinners; License: MIT -->
        <svg width="24" height="24" stroke="#000" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g class="spinner_V8m1"><circle cx="12" cy="12" r="9.5" fill="none" stroke-width="3"></circle></g></svg>
      </div>
    </div>

    <!-- Text area -->
    <textarea
      v-if="hasModel"
      v-model="message"
      id="prompt"
      name="prompt"
      placeholder="Type to chat..."
      v-on:keydown.enter.shift.exact.prevent="prompt"
      v-bind:disabled="isGenerating"
      autofocus
    ></textarea>
    <p v-else>Select a model to start chatting.</p>
    <button v-on:click="reset">Reset Session</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onUpdated, computed } from 'vue'

import CodeIcon from './icons/code.svg'
import UserIcon from './icons/user.svg'
import { useModelStore } from './pinia/models'
import { useConversationStore } from './pinia/conversations'
import showdown from 'showdown'
import hljs from 'highlight.js'
import { DateTime } from 'luxon'

import 'highlight.js/styles/atom-one-dark.min.css'
import type { ChatMessage } from 'src/providers/LlamaProvider'

const converter = new showdown.Converter()

const store = useModelStore()
const conversationStore = useConversationStore()

const ipcRenderer = window.ipc

const hasModel = computed<boolean>(() => {
  const model = store.models.find(model => model.name === store.currentModelId)
  return model !== undefined
})

const message = ref<string>('')

const currentGenerationTime = ref<number>(0)

const isGenerating = ref<boolean>(false)

const ROLEMAP = {
  user: 'You',
  assistant: 'TinyLlama' // TODO
}

function messageClass (message: ChatMessage): string {
  return [ 'message', message.role ].join(' ')
}

function messageUser (message: ChatMessage): string {
  return ROLEMAP[message.role]
}

function messageHTML (message: ChatMessage): string {
  return converter.makeHtml(message.content)
}

function messageIcon (message: ChatMessage): string {
  if (message.role === 'user') {
    return UserIcon
  } else {
    return CodeIcon
  }
}

function formatDate (date: number): string {
  const dt = DateTime.fromMillis(date)
  return dt.toRelative({
    style: 'short',
    locale: 'en-US'
  }) ?? date.toString()
}

function formatGenerationTime (time: number): string {
  const t = String(Math.round(time / 100) / 10)
  return (!t.includes('.')) ? `${t}.0` : t
}

onUpdated(() => hljs.highlightAll())

function prompt () {
  isGenerating.value = true
  const start = Date.now()
  currentGenerationTime.value = 0
  const int = setInterval(() => {
    currentGenerationTime.value = Date.now() - start
  }, 100)
  ipcRenderer.invoke('prompt', message.value)
    .catch(err => console.error(err))
    .finally(() => {
      message.value = ''
      isGenerating.value = false
      clearInterval(int)
    })
}

function reset () {
  ipcRenderer.invoke('reset').catch(err => console.error(err))
}
</script>

<style>
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

div#chat {
  grid-area: chat;
  overflow-y: auto;
  padding: 0 40px;
}

textarea#prompt {
  background-color: #f7f7f7;
  color: inherit;
  width: 100%;
  border: 1px solid #aaa;
  border-radius: 8px;
  min-height: 150px;
  padding: 8px;
  resize: vertical;
  font-family: inherit;
}

.message {
  padding: 6px 12px;
  margin: 10px 0;
  display: grid;
  grid-template-columns: 40px auto;
  grid-template-areas: "icon header"
  "icon body";
}

.message .message-header {
  grid-area: header;
  display: grid;
  margin-bottom: 10px;
  grid-template-columns: auto 100px;
  grid-template-areas: "user timestamp"
  "generation-time timestamp";
}

.message-header h4 {
  margin: 0px;
  grid-area: user;
}

.message-header .message-timestamp {
  font-size: 70%;
  text-align: right;
  grid-area: timestamp;
}

.message-header .message-generation-time {
  font-size: 70%;
  grid-area: generation-time;
  font-family: 'Menlo', 'Inconsolata', 'Liberation Mono', monospace;
}

.message-header .message-timestamp, .message-header .message-generation-time {
  opacity: 0.5;
}

.message .message-body {
  hyphens: auto;
  grid-area: body;
}

.message:not(:last-child) .message-body {
  border-bottom: 1px solid rgba(0, 0, 0, .1);
}

.message .message-icon {
  grid-area: icon;
}

div#generating-message.message .message-body {
  display: flex;
  gap: 20px;
}

@media (prefers-color-scheme: dark) {
  textarea#prompt {
    background-color: rgb(33, 33, 33);
  }

  .message:not(:last-child) .message-body {
    border-bottom-color: rgba(255, 255, 255, .2);
  }

  svg {
    stroke: #eee;
  }
}
</style>
