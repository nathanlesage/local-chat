<template>
  <div id="chat-wrapper">
    <div id="chat">
      <p v-if="currentConversation !== undefined">
        You are conversing with: <ModelSelectorWidget v-on:select-model="selectModel($event)"></ModelSelectorWidget>.
      </p>
      <div
        v-if="currentConversation !== undefined"
        v-for="message in currentConversation.messages"
        v-bind:class="messageClass(message)"
      >
        <div class="message-header">
          <h4>{{ messageUser(message.role) }}:</h4>
          <div class="message-timestamp">{{ formatDate(message.timestamp) }}</div>
          <div class="message-generation-time">
            Generated in {{  formatGenerationTime(message.generationTime) }}s
          </div>
        </div>
        <div class="message-icon" v-html="messageIcon(message)">
        </div>
        <div class="message-body" v-html="md2html(message.content)">
        </div>
      </div>

      <div id="generating-message" class="message assistant" v-if="isGenerating">
        <div class="message-header">
          <h4>{{ messageUser('assistant') }}:</h4>
          <!-- While generating we only show a loading spinner -->
          <div class="message-timestamp" v-html="LoadingSpinner"></div>
          <div class="message-generation-time">
            {{ formatGenerationTime(currentGenerationTime) }}s
          </div>
        </div>
        <div class="message-icon" v-html="CodeIcon">
        </div>
        <div class="message-body" v-html="md2html(responseText)">
        </div>
      </div>

      <!-- Text area -->
      <template v-if="currentConversation !== undefined">
        <textarea
          v-if="currentConversation !== undefined"
          v-model="message"
          id="prompt"
          name="prompt"
          placeholder="Type to chat..."
          v-on:keydown.enter.shift.exact.prevent="prompt"
          v-bind:disabled="isGenerating"
          autofocus
        ></textarea>
      </template>
      <p v-else>
        Create a new conversation to get started.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUpdated, computed } from 'vue'

import CodeIcon from './icons/code.svg'
import UserIcon from './icons/user.svg'
import LoadingSpinner from './icons/loading-spinner.svg'
import { useConversationStore } from './pinia/conversations'
import { formatDate } from './util/dates'
import showdown from 'showdown'
import hljs from 'highlight.js'

import 'highlight.js/styles/atom-one-dark.min.css'
import type { ChatMessage, Conversation } from 'src/providers/ConversationManager'
import { alertError } from './util/prompts'
import ModelSelectorWidget from './ModelSelectorWidget.vue'

const converter = new showdown.Converter()

const conversationStore = useConversationStore()

const DEFAULT_RESPONSE_TEXT = 'Generating response…'

const responseText = ref<string>(DEFAULT_RESPONSE_TEXT)

const ipcRenderer = window.ipc

const currentConversation = computed<Conversation|undefined>(() => {
  return conversationStore.getCurrentConversation()
})

const message = ref<string>('')

const currentGenerationTime = ref<number>(0)

const isGenerating = ref<boolean>(false)

function messageClass (message: ChatMessage): string {
  return [ 'message', message.role ].join(' ')
}

function messageUser (role: 'user'|'assistant'): string {
  if (role === 'user') {
    return 'You'
  } else {
    return currentConversation.value?.model.name ?? 'Assistant'
  }
}

function md2html (content: string): string {
  return converter.makeHtml(content)
}

function messageIcon (message: ChatMessage): string {
  if (message.role === 'user') {
    return UserIcon
  } else {
    return CodeIcon
  }
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
  responseText.value = DEFAULT_RESPONSE_TEXT
  const elem = document.getElementById('chat')
  if (elem !== null) {
    elem.scrollTop = elem.scrollHeight
  }

  const off = ipcRenderer.on('answer-token-stream', (event, payload: string) => {
    if (responseText.value === DEFAULT_RESPONSE_TEXT) {
      responseText.value = ''
    }

    responseText.value = responseText.value + payload
  })

  const int = setInterval(() => {
    currentGenerationTime.value = Date.now() - start
  }, 100)

  ipcRenderer.invoke('prompt', message.value)
    .catch(err => alertError(err))
    .finally(() => {
      isGenerating.value = false
      clearInterval(int)
      off() // Remove event listener again
      if (elem !== null) {
        elem.scrollTop = elem.scrollHeight
      }
    })

  // Immediately clear the value
  message.value = ''
}

function selectModel (modelPath: string) {
  ipcRenderer.invoke('select-model', modelPath)
    .catch(err => alertError(err))
}
</script>

<style>
div#chat-wrapper {
  grid-area: chat;
  overflow-y: auto;
  padding: 0 40px;
}

div#chat {
  max-width: 600px;
  margin: 0 auto;
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
  overflow-x: hidden;
}

.message .message-body code {
  overflow-x: auto;
}

.message:not(:last-child) .message-body {
  border-bottom: 1px solid rgba(0, 0, 0, .1);
}

.message .message-icon {
  grid-area: icon;
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
