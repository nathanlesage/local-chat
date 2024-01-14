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
      <span class="description">{{ conv.description }}</span>
      <span class="message-count">{{ conv.messages.length }} messages</span>
      <button class="delete" v-on:click.prevent.stop="deleteConversation(conv.id)">Delete</button>
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

const conversationStore = useConversationStore()
const modelStore = useModelStore()
const ipcRenderer = window.ipc

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
</script>

<style>
aside#conversations {
  grid-area: sidebar;
  background-color: rgb(55, 55, 55);
  padding: 10px;
  color: white;
  overflow-y: auto;
}

aside#conversations .conversation {
  padding: 5px;
  border-radius: 8px;
  cursor: default;
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: auto auto;
  grid-template-areas: "title time" "description description" "count delete-button";
  align-items: center;
}

aside#conversations .conversation button.delete {
  background-color: rgb(64, 1, 1);
  color: white;
  font-size: 70%;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 4px;
  margin: 0 2px;
  display: none;
}

aside#conversations .conversation:hover button {
  display: initial;
}

aside#conversations .conversation button.delete {
  grid-area: delete-button;
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
  font-size: 70%;
  opacity: 0.7;
}

aside#conversations .conversation:hover, aside#conversations .conversation.active {
  background-color :rgb(110, 110, 110);
}

aside#conversations .conversation .description {
  display: block;
  margin: 5px 0;
  grid-area: description;
}

aside#conversations .conversation .message-count {
  display: block;
  font-size: 70%;
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
