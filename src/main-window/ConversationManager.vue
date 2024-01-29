<template>
  <div id="conversations">
    <h2 style="font-size: 100%;">Your Conversations</h2>
    <div v-if="conversationStore.conversations.length === 0">
      No conversations.
    </div>

    <div
      v-else
      v-for="conv in conversationStore.conversations"
      v-bind:class="{
        conversation: true,
        active: conversationStore.activeConversation === conv.id }"
      v-on:click="selectConversation(conv.id)"
    >
      <h3>{{ modelStore.getModelName(conv.modelPath) ?? 'Unknown model' }}</h3>
      <span class="timestamp" v-bind:title="`Conversation ${conv.id}`">
        {{ formatDate(conv.startedAt, 'date') }}
      </span>

      <!-- NOTE: The input allows both Enter and Shift-Enter to change the description -->
      <input
        v-if="conversationRename !== undefined && conversationRename === conv.id"
        type="text"
        placeholder="Describe this conversation..."
        v-model="conversationDescription"
        v-on:keydown.shift.enter.prevent="finishChangeDescription()"
        v-on:keydown.enter.prevent="finishChangeDescription()"
        v-on:keydown.esc.prevent="abortChangeDescription()"
        v-on:click.prevent.stop=""
        autofocus="true"
      >

      <span v-if="conversationRename !== conv.id" class="description">{{ conv.description !== '' ? conv.description : 'No description' }}</span>
      
      <span class="message-count">{{ conv.messages.length }} messages</span>
      <div class="action-button-wrapper">
        <LCButton
          v-if="conversationRename === undefined"
          icon="edit"
          square="true"
          v-on:click.prevent.stop="startChangeDescription(conv.id)"
          title="Change description"
        >
        </LCButton>
        <LCButton icon="trash-2" type="danger" square="true" v-on:click.prevent.stop="deleteConversation(conv.id)" title="Delete conversation"></LCButton>
      </div>
    </div>

    <div>
      <LCButton v-on:click="newConversation">New conversation</LCButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConversationStore } from './pinia/conversations'
import { useModelStore } from './pinia/models'
import { alertError } from './util/prompts'
import { formatDate } from './util/dates'
import { ref } from 'vue'
import LCButton from './reusable-components/LCButton.vue'

const conversationStore = useConversationStore()
const modelStore = useModelStore()
const ipcRenderer = window.ipc

const conversationRename = ref<string|undefined>(undefined)
const conversationDescription = ref<string>('')

function newConversation () {
  ipcRenderer.invoke('new-conversation', modelStore.currentModel?.path)
    .catch(err => alertError(err))
}

function selectConversation (conversationId: string) {
  ipcRenderer.invoke('select-conversation', conversationId)
    .catch(err => alertError(err))
}

function deleteConversation (conversationId: string) {
  ipcRenderer.invoke('delete-conversation', conversationId)
    .catch(err => alertError(err))
}

/**
 * Starts the process of changing a conversation's description
 *
 * @param   {string}  conversationId  The conversation to be rephrased
 */
function startChangeDescription (conversationId: string) {
  console.log('Starting rename')
  const convo = conversationStore.conversations.find(c => c.id === conversationId)
  if (convo === undefined) {
    return
  }

  conversationRename.value = conversationId
  conversationDescription.value = convo.description
}

/**
 * Finishes the process of changing a conversation's description by sending the
 * new description to main.
 */
function finishChangeDescription () {
  if (conversationRename.value === undefined) {
    alertError(new Error('Cannot rename conversation: None found'))
    return
  }

  ipcRenderer.invoke('rename-conversation', {
    conversationId: conversationRename.value,
    description: conversationDescription.value
  })
    .catch(err => alertError(err))

  conversationRename.value = undefined
  conversationDescription.value = ''
}

/**
 * Aborts a change of description.
 */
function abortChangeDescription () {
  conversationRename.value = undefined
  conversationDescription.value = ''
}
</script>

<style>
div#conversations .conversation {
  padding: 5px;
  border-radius: 8px;
  font-size: 80%;
  line-height: 20px;
  cursor: default;
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: auto 75px;
  grid-template-areas: "title time" "description description" "count actions";
  align-items: center;
}

div#conversations .conversation button {
  display: none;
}

div#conversations .conversation:hover button {
  display: initial;
}

div#conversations .conversation .action-button-wrapper {
  grid-area: actions;
  text-align: right;
}

div#conversations .conversation input[type=text] {
  grid-area: description;
}

div#conversations .conversation h3 {
  margin: 0;
  font-size: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  grid-area: title;
}

div#conversations .conversation .timestamp {
  grid-area: time;
  text-align: right;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

div#conversations .conversation .timestamp,
div#conversations .conversation .message-count {
  color: rgb(150, 150, 150);
}

div#conversations .conversation:hover, div#conversations .conversation.active {
  background-color :rgb(110, 110, 110);
}

div#conversations .conversation .description {
  display: block;
  margin: 5px 0;
  line-height: 120%;
  grid-area: description;
}

div#conversations .conversation .message-count {
  display: block;
  margin: 8px 0;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  grid-area: count
}
</style>
