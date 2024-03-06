<template>
  <h1>Prompt Template Manager</h1>
  <p>
    LocalChat supports a set of predefined prompt templates that work with many
    different models. However, some models use custom templates that are not
    included with LocalChat. Here you can define these prompt templates for use
    with your models.
  </p>
  <h2>Custom Prompts</h2>
  <template v-if="promptStore.promptNames.length > 0" v-for="[name, template] in promptStore.prompts.entries()">
    <PromptForm
      v-if="currentlyEditing === name"
      v-key="name"
      v-bind:name="name"
      v-bind:template="template"
      v-bind:button-label="'Save changes'"
      v-bind:form-title="'Edit template'"
      v-on:cancel="currentlyEditing = undefined"
      v-on:submit-form="updateTemplate"
    ></PromptForm>
    <div v-else v-key="name" class="card template">
      <h4>{{ name }}</h4>
      <div class="actions">
        <LCButton
          v-on:click="currentlyEditing = name"
          square="true"
          icon="edit"
          title="Edit template"
          v-bind:type="'primary'"
        >
        </LCButton>
        <LCButton
          v-on:click="deleteTemplate(name)"
          square="true"
          icon="trash-2"
          title="Delete template"
          v-bind:type="'danger'"
        >
        </LCButton>
      </div>
      <div class="roles">
        <dl>
          <dt>User Role Name</dt>
          <dd>{{ template.userRoleName }}</dd>

          <dt>Model Role Name</dt>
          <dd>{{ template.modelRoleName }}</dd>

          <dt>System Role Name</dt>
          <dd>{{ template.systemRoleName }}</dd>
        </dl>
      </div>

      <div class="templates">
        <p><strong>Prompt Template</strong></p>
        <pre class="template-string"><code>{{ template.template }}</code></pre>
    
        <p><strong>History Template</strong></p>
        <pre class="template-string"><code>{{ template.historyTemplate }}</code></pre>
      </div>

    </div>
  </template>
  <div v-else>
    No custom prompts.
  </div>

  <template v-if="currentlyAdding">
    <h2>Create new Prompt</h2>
    <PromptForm
      v-on:submit-form="createNewTemplate"
      v-on:cancel="currentlyAdding = false"
    ></PromptForm>
  </template>
  <template v-else>
    <LCButton v-on:click="currentlyAdding = true">Create new Prompt</LCButton>
  </template>
</template>

<script setup lang="ts">
import { usePromptTemplateStore } from './pinia/prompt-templates'
import { type CustomPromptTemplate } from 'src/main/PromptManager'
import LCButton from './reusable-components/LCButton.vue'
import PromptForm from './PromptForm.vue'
import { alertError } from './util/prompts'
import { ref } from 'vue'

const ipcRenderer = window.ipc

const promptStore = usePromptTemplateStore()

const currentlyEditing = ref<undefined|string>(undefined)
const currentlyAdding = ref(false)

function createNewTemplate (name: string, promptTemplate: CustomPromptTemplate) {
  ipcRenderer.invoke('set-custom-prompt', { name, promptTemplate }).catch(err => alertError(err))
}

function updateTemplate (name: string, promptTemplate: CustomPromptTemplate) {
  if (name !== currentlyEditing.value && currentlyEditing.value !== undefined) {
    // Strictly speaking, we need to remove the given template now
    deleteTemplate(currentlyEditing.value)
  }
  ipcRenderer.invoke('set-custom-prompt', { name, promptTemplate })
    .catch(err => alertError(err))
    .finally(() => currentlyEditing.value = undefined)
}

function deleteTemplate (name: string) {
  ipcRenderer.invoke('delete-custom-prompt', name).catch(err => alertError(err))
}
</script>

<style>
.card {
  margin: 20px 0px;
  padding: 10px 20px;
  border: 2px solid black;
  border-radius: 10px;
}

.card.template {
  display: grid;
  grid-template-rows: auto auto;
  grid-template-columns: 50% calc(50% - 100px) 100px;
  grid-template-areas: "name name actions"
  "roles templates templates";
  align-items: top;
  overflow: auto;
}

.card.template .roles { grid-area: roles; }
.card.template .templates { grid-area: templates; }
.card.template h4 { grid-area: name; }
.card.template .actions {
  grid-area: actions;
  text-align: right;
}

.card.template .roles dl dt {
  font-weight: bold;
}

.card.template .roles dl dd {
  margin: 5px 0 20px 0;
  font-family: monospace;
}

.card.template .templates pre.template-string {
  overflow-x: auto;
}

.card.template .templates pre.template-string {
  border-radius: 4px;
  padding: 10px;
  background-color: rgb(240, 240, 240);
}

.card.form input, .card.form textarea {
  display: block;
  border: 1px solid black;
  padding: 5px;
  margin: 5px 0;
  border-radius: 4px;
  width: 100%;
}

.card.form textarea {
  min-height: 100px;
}

.card.form span.error {
  font-size: 80%;
  color: rgb(180, 0, 0);
}

@media (prefers-color-scheme: dark) {
  .card {
    border-color: white;
  }

  .card.form input, .card.form textarea {
    color: white;
    background-color: rgb(50, 50, 70);
    border-color: rgb(30, 30, 30);
  }

  .card.template .templates pre.template-string {
    background-color: rgb(50, 50, 70);
  }
}
</style>
