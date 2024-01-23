<template>
  <aside id="conversations">
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
      <h3 class="id">{{ conv.id }}</h3>
      <span class="timestamp">{{ formatDate(conv.startedAt, 'date') }}</span>

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
        <button
          v-if="conversationRename === undefined"
          class="rename icon"
          v-on:click.prevent.stop="startChangeDescription(conv.id)"
          title="Change description"
        >
          <vue-feather type="edit" size="12"></vue-feather>
        </button>
        <button class="delete icon" v-on:click.prevent.stop="deleteConversation(conv.id)" title="Delete conversation">
          <vue-feather type="trash-2" size="12"></vue-feather>
        </button>
      </div>
    </div>

    <div>
      <button
        class="delete"
        v-on:click="newConversation"
      >New conversation</button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useConversationStore } from './pinia/conversations'
import { useModelStore } from './pinia/models'
import { alertError } from './util/prompts'
import { formatDate } from './util/dates'
import { ref } from 'vue'

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
aside#conversations {
  grid-area: sidebar;
  background-color: rgb(55, 55, 55);
  padding: 10px;
  padding-top: 30px; /* NOTE: Accommodate for sidebar toggle */
  color: white;
  overflow-y: auto;
}

aside#conversations .conversation {
  padding: 5px;
  border-radius: 8px;
  font-size: 80%;
  line-height: 20px;
  cursor: default;
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: auto auto;
  grid-template-areas: "title time" "description description" "count actions";
  align-items: center;
}

aside#conversations .conversation button.delete {
  background-color: rgb(64, 1, 1);
  color: white;
}

aside#conversations .conversation button {
  padding: 2px 4px;
  margin: 0 2px;
  border-radius: 4px;
  aspect-ratio: 1;
  display: none;
}

aside#conversations .conversation:hover button {
  display: initial;
}

aside#conversations .conversation .action-button-wrapper {
  grid-area: actions;
  text-align: right;
}

aside#conversations .conversation input[type=text] {
  grid-area: description;
}

aside#conversations .conversation button.delete:hover {
  background-color: rgb(242, 132, 132);
}

aside#conversations .conversation h3 {
  margin: 0;
  font-size: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  grid-area: title;
}

aside#conversations .conversation .timestamp {
  grid-area: time;
  white-space: nowrap;
  opacity: 0.7;
}

aside#conversations .conversation:hover, aside#conversations .conversation.active {
  background-color :rgb(110, 110, 110);
}

aside#conversations .conversation .description {
  display: block;
  margin: 5px 0;
  line-height: 120%;
  grid-area: description;
}

aside#conversations .conversation .message-count {
  display: block;
  opacity: 0.7;
  margin: 8px 0;
  grid-area: count
}

@media (prefers-color-scheme: dark) {
  div#sidebar {
    background-color: #333;
  }

  aside#conversations .conversation button.delete {
    background-color: rgb(64, 1, 1);
  }
}
</style>
