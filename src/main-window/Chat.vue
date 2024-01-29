<template>
  <div id="chat">
    <div v-if="currentConversation !== undefined">
      <p>
        You started this conversation
        <strong>{{ formatDate(currentConversation.startedAt, 'datetime') }}</strong>
        with:
      </p>
      <ModelSelectorWidget v-on:select-model="selectModel($event)"></ModelSelectorWidget>
    </div>
    <p v-if="currentConversation !== undefined && currentConversation.messages.length === 0">
      This is the start of your conversation. Send a message to start chatting.
      <!-- TODO: Maybe add some example prompts here? -->
    </p>
    <div
      v-if="currentConversation !== undefined"
      v-for="(message, idx) in currentConversation.messages"
      v-bind:class="{
        message: true,
        user: message.role === 'user',
        assistant: message.role === 'assistant'
      }"
    >
      <div class="message-header">
        <h4>{{ message.role === 'user' ? 'You' : (modelStore.getModelName(currentConversation.modelPath) ?? 'Assistant') }}:</h4>
        <div class="message-timestamp">{{ formatDate(message.timestamp, 'time') }}</div>
        <div class="message-generation-time" v-if="message.generationTime > 0">
          Generated in {{  formatGenerationTime(message.generationTime) }}s
        </div>
        <div class="message-actions">
          <LCButton icon="copy" square="true" title="Copy message to clipboard" v-on:click="copyMessageToClipboard(idx)"></LCButton>
          <LCButton icon="trash-2" square="true" v-bind:type="'danger'" title="Delete this message" v-on:click="deleteMessage(idx)"></LCButton>
        </div>
      </div>
      <div class="message-icon">
        <vue-feather v-if="message.role === 'user'" type="user"></vue-feather>
        <vue-feather v-else type="code"></vue-feather>
      </div>
      <div class="message-body" v-html="md2html(message.content)">
      </div>
    </div>

    <div id="generating-message" class="message assistant" v-if="isGenerating">
      <div class="message-header">
        <h4>{{ currentConversation ? modelStore.getModelName(currentConversation.modelPath) ?? 'Assistant' : 'Assistant' }}:</h4>
        <!-- While generating we only show a loading spinner -->
        <div class="message-timestamp" v-html="LoadingSpinner"></div>
        <div class="message-generation-time">
          {{ formatGenerationTime(currentGenerationTime) }}s
        </div>
      </div>
      <div class="message-icon">
        <vue-feather type="code"></vue-feather>
      </div>
      <div class="message-body" v-html="md2html(responseText)">
      </div>
    </div>

    <div id="regenerate-button-wrapper" v-if="!isGenerating">
      <LCButton v-if="canRegenerateLastResponse()" v-on:click="regenerateLastResponse">Regenerate last response</LCButton>
    </div>

    <!-- Text area -->
    <template v-if="currentConversation !== undefined">
      <textarea
        v-if="currentConversation !== undefined"
        v-model="message"
        id="prompt"
        name="prompt"
        placeholder="Type to chat (Shift+Enter to send)"
        v-on:keydown.enter.shift.exact.prevent="prompt"
        v-bind:disabled="isGenerating"
        autofocus
      ></textarea>

      <div id="chat-button-wrapper">
        <LCButton id="send" type="primary" icon="send" v-on:click.prevent="prompt">
          Send
        </LCButton>
        <LCButton v-on:click.prevent="exportConversation">Export conversation</LCButton>
      </div>

    </template>
    <p v-else>
      Create a new conversation to get started.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onUpdated, computed } from 'vue'

import LoadingSpinner from './icons/loading-spinner.svg'
import { useConversationStore } from './pinia/conversations'
import { formatDate, formatGenerationTime } from './util/dates'
import showdown from 'showdown'
import hljs from 'highlight.js'

import 'highlight.js/styles/atom-one-dark.min.css'
import 'highlightjs-copy/dist/highlightjs-copy.min.css'
import type { Conversation } from 'src/main/ConversationManager'
import { alertError } from './util/prompts'
import ModelSelectorWidget from './reusable-components/ModelSelectorWidget.vue'
import LCButton from './reusable-components/LCButton.vue'
import { useModelStore } from './pinia/models'
import CopyButtonPlugin from 'highlightjs-copy'

const ipcRenderer = window.ipc

// Additional setup
// Add copy button plugin
hljs.addPlugin(new CopyButtonPlugin())
const converter = new showdown.Converter({
  tables: true,
  smoothLivePreview: true
})
const DEFAULT_RESPONSE_TEXT = 'Generating response…'

// Add stores
const conversationStore = useConversationStore()
const modelStore = useModelStore()

// Refs and computed values
const currentConversation = computed<Conversation|undefined>(() => {
  return conversationStore.getCurrentConversation()
})

const responseText = ref<string>(DEFAULT_RESPONSE_TEXT)
const message = ref<string>('')
const currentGenerationTime = ref<number>(0)
const isGenerating = ref<boolean>(false)

/**
 * Scrolls the chat wrapper down. This happens automatically, for example,
 * during the generation of a response so the user can follow it being
 * generated.
 */
function scrollChatDown () {
  const elem = document.getElementById('chat-wrapper')
  if (elem !== null) {
    elem.scrollTop = elem.scrollHeight
  }
}

/**
 * Turns a string of Markdown into HTML
 *
 * @param   {string}  content  The plain text
 *
 * @return  {string}           The HTML
 */
function md2html (content: string): string {
  return converter.makeHtml(content)
}

/**
 * Copies a given message to the clipboard
 *
 * @param   {number}  idx  The message index
 */
function copyMessageToClipboard(idx: number) {
  if (currentConversation.value === undefined) {
    return
  }

  const plain = currentConversation.value.messages[idx].content
  const html = md2html(plain)
  const data = new ClipboardItem({
    'text/plain': new Blob([plain], { type: 'text/plain' }),
    'text/html': new Blob([html], { type: 'text/html' })
  })
  navigator.clipboard.write([data])
}

/**
 * A listener to update all code block highlightints as soon as the DOM has been
 * updated.
 */
onUpdated(() => { hljs.highlightAll() })

/**
 * Takes the user message and generates a response to it. This also registers
 * a few listeners and callbacks so that there is some dynamics during
 * generation.
 */
function prompt () {
  isGenerating.value = true
  const start = Date.now()
  currentGenerationTime.value = 0
  responseText.value = DEFAULT_RESPONSE_TEXT

  const off = ipcRenderer.on('answer-token-stream', (event, payload: string) => {
    if (responseText.value === DEFAULT_RESPONSE_TEXT) {
      responseText.value = ''
    }

    responseText.value = responseText.value + payload
  })

  const int = setInterval(() => {
    currentGenerationTime.value = Date.now() - start
    scrollChatDown() // While we are receiving a token stream, continuously scroll down.
  }, 100)

  ipcRenderer.invoke('prompt', message.value)
    .catch(err => alertError(err))
    .finally(() => {
      isGenerating.value = false
      clearInterval(int)
      off() // Remove event listener again
    })

  // Immediately clear the value
  message.value = ''
}

/**
 * Changes the model for the given conversation
 *
 * @param   {string}  modelPath  The new model's path
 */
function selectModel (modelPath: string) {
  ipcRenderer.invoke('select-model', modelPath)
    .catch(err => alertError(err))
}

/**
 * Initiates a conversation export
 */
function exportConversation () {
  if (currentConversation.value === undefined) {
    return
  }

  ipcRenderer.invoke('export-conversation', currentConversation.value.id)
    .catch(err => alertError(err))
}

/**
 * Deletes the provided message by index from the converrsation
 *
 * @param   {number}  messageIdx      The message to delete
 */
function deleteMessage (messageIdx: number) {
  if (currentConversation.value === undefined) {
    return alertError(new Error('Cannot delete message from conversation: None active'))
  }

  ipcRenderer.invoke('delete-messages', {
    conversationId: currentConversation.value.id,
    messageIdx: [messageIdx]
  })
    .catch(err => alertError(err))
}

/**
 * Returns true if the current response can be regenerated.
 *
 * @return  {boolean} False if it is not possible, otherwise true.
 */
function canRegenerateLastResponse (): boolean {
  if (currentConversation.value === undefined || currentConversation.value.messages.length < 2) {
    return false
  }

  // First, assert that the last message is by the model
  const msgs = currentConversation.value.messages
  const messageCount = currentConversation.value.messages.length
  if (msgs[messageCount - 1].role !== 'assistant' || msgs[messageCount - 2].role !== 'user') {
    return false
  }

  return true
}

/**
 * Composes an action to regenerate the last model response by deleting the two
 * last messages (user question + model response) and re-prompting with the user
 * question.
 */
function regenerateLastResponse () {
  // Regenerating basically involves deleting the last two messages, and
  // then prompting with the second-to-last (user) message
  if (!canRegenerateLastResponse() || currentConversation.value === undefined) {
    return
  }

  const messageCount = currentConversation.value.messages.length
  const oldPrompt = currentConversation.value.messages[messageCount - 2].content

  ipcRenderer.invoke('delete-messages', {
    conversationId: currentConversation.value.id,
    messageIdx: [messageCount - 2, messageCount - 1]
  })
    .catch(err => alertError(err))
    .then(() => {
      message.value = oldPrompt
      prompt()
    })
}
</script>

<style>
div#chat {
  max-width: 600px;
  margin: 0 auto;
}

div#regenerate-button-wrapper {
  text-align: center;
  padding: 5px 0;
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

#chat-button-wrapper {
  display: flex;
  justify-content: flex-start;
}

.message {
  padding: 6px 12px;
  margin: 10px 0;
  display: grid;
  align-items: center;
  grid-template-columns: 40px auto;
  grid-template-areas: "icon header"
  "trash body";
}

.message .message-header {
  grid-area: header;
  display: grid;
  grid-template-columns: auto 100px;
  grid-template-areas: "user timestamp"
  "generation-time actions"
  "blank actions";
  align-items: center;
}

.message.user .message-header {
  /* User messages don't have a generation time */
  grid-template-areas: "user timestamp"
  "user actions"
  "user actions";
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

.message-header .message-actions {
  grid-area: actions;
  text-align: right;
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
  cursor: text;
}

.message .message-body code {
  font-family: 'Menlo', 'Inconsolata', 'Liberation Mono', monospace;
  overflow-x: auto;
  border-radius: 4px;
}

.message .message-body code:not(.hljs) {
  font-weight: bold;
  color: rgb(69, 162, 231);
}

.message:not(:last-child) .message-body {
  border-bottom: 1px solid rgba(0, 0, 0, .1);
}

.message .message-icon {
  grid-area: icon;
  display: flex;
  justify-content: center;
  align-items: center;
}

/** Basic table styling */
.message table {
  border-collapse: collapse;
  width: 100%;
  display: block;
  overflow-x: auto;
}
.message table th {
  border-bottom: 1px solid rgb(128, 128, 128);
}

.message table th, .message table td {
  padding: 4px 8px;
}

.message table tr:nth-child(2n) {
  background-color: rgb(214, 224, 247);
}

@media (prefers-color-scheme: dark) {
  textarea#prompt {
    background-color: rgb(33, 33, 33);
  }

  .message:not(:last-child) .message-body {
    border-bottom-color: rgba(255, 255, 255, .2);
  }


.message table tr:nth-child(2n) {
  background-color: rgb(55, 60, 69);
}
}
</style>
src/main/ConversationManager
