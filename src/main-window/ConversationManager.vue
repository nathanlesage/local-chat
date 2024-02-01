<template>
  <div id="conversations">
    <h2 style="font-size: 100%;">Your Conversations</h2>
    <div v-if="conversationStore.conversations.length === 0">
      No conversations.
    </div>

    <details v-else class="conversation-group" v-for="group in filteredConv" open>
      <summary>{{ monthNumberToName(group.month) }} {{ group.year }}</summary>
      <div
        v-for="conv in group.conversations"
        v-bind:class="{
          conversation: true,
          active: conversationStore.activeConversation === conv.id }"
        v-on:click="selectConversation(conv.id)"
      >
        <h4>{{ modelStore.getModelName(conv.modelPath) ?? 'Unknown model' }}</h4>

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
    </details>

    <div>
      <LCButton v-on:click="newConversation">New conversation</LCButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ConversationsYearMonth, useConversationStore } from './pinia/conversations'
import { useModelStore } from './pinia/models'
import { alertError } from './util/prompts'
import { ref, computed } from 'vue'
import LCButton from './reusable-components/LCButton.vue'

const conversationStore = useConversationStore()
const modelStore = useModelStore()
const ipcRenderer = window.ipc

const conversationRename = ref<string|undefined>(undefined)
const conversationDescription = ref<string>('')

const filteredConv = computed<ConversationsYearMonth[]>(() => {
  return conversationStore.conversationsByYearMonth
})

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

/**
 * Turns, e.g., 3 into "March"
 *
 * @param   {number}  month  The month number
 *
 * @return  {string}         The month name
 */
function monthNumberToName (month: number): string {
  return {
    1: 'January',
    2: 'February',
    3: 'March',
    4: 'April',
    5: 'May',
    6: 'June',
    7: 'July',
    8: 'August',
    9: 'September',
    10: 'October',
    11: 'November',
    12: 'December',
  }[month] ?? String(month)
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
  grid-template-areas: "title title" "description actions";
  align-items: center;
}

div#conversations details summary {
  font-weight: bold;
  margin: 10px 0;
  /* Add a bit of spacing between the marker and the text */
  list-style-position: outside;
  padding-left: 10px;
  margin-left: 10px;
}

div#conversations details summary::marker {
  color: rgb(150, 150, 150);
  content: "›";
}

div#conversations details[open] summary::marker {
  content: "‹";
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

div#conversations .conversation h4 {
  margin: 0;
  font-size: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  grid-area: title;
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
</style>
