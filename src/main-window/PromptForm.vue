<template>
  <div class="card form">
    <h4 v-if="props.formTitle !== undefined">{{ props.formTitle }}</h4>
    <p>
      <label for="new-template-name">Name:</label>
      <input type="text" placeholder="A unique name" id="new-template-name" v-model="newTemplateName">
      <span class="error" v-if="!nameValid">
        {{ validateName(newTemplateName) }}
      </span>
    </p>
    <p>
      <label for="new-template-user-role">User Role Name:</label>
      <input type="text" placeholder="user" id="new-template-user-role" v-model="newTemplateUserRole">
      <span class="error" v-if="!userRoleValid">
        {{ validateRole(newTemplateUserRole, 'user') }}
      </span>
    </p>
    <p>
      <label for="new-template-model-role">Model Role Name:</label>
      <input type="text" placeholder="assistant" id="new-template-model-role" v-model="newTemplateModelRole">
      <span class="error" v-if="!modelRoleValid">
        {{ validateRole(newTemplateModelRole, 'model') }}
      </span>
    </p>
    <p>
      <label for="new-template-system-role">System Role Name:</label>
      <input type="text" placeholder="system" id="new-template-system-role" v-model="newTemplateSystemRole">
      <span class="error" v-if="!systemRoleValid">
        {{ validateRole(newTemplateSystemRole, 'system') }}
      </span>
    </p>
    <p>
      <label for="new-template-prompt-template">Prompt template:</label>
      <textarea v-bind:placeholder="promptTemplatePlaceholder" v-model="newTemplatePrompt"></textarea>
      <span class="error" v-if="!templateValid">
        {{ validateTemplate(newTemplatePrompt) }}
      </span>
    </p>
    <p>
      <label for="new-template-history-template">History prompt template:</label>
      <textarea v-bind:placeholder="promptHistoryPlaceholder" v-model="newTemplateHistoryPrompt"></textarea>
      <span class="error" v-if="!historyTemplateValid">
        {{ validateHistoryTemplate(newTemplateHistoryPrompt) }}
      </span>
    </p>
    <p>
      <LCButton
        v-bind:class="'primary'"
        v-on:click="maybeSubmit"
      >
        {{ buttonLabel }}
      </LCButton>

      <LCButton v-bind:class="'default'" v-on:click="emit('cancel')">Cancel</LCButton>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef, watch } from 'vue'
import { usePromptTemplateStore } from './pinia/prompt-templates'
import { alertError } from './util/prompts'
import type { CustomPromptTemplate } from 'src/main/PromptManager'
import LCButton from './reusable-components/LCButton.vue'

// These are the chat wrapper templates provided by node-llama-cpp, which can't
// be used as names for custom prompts
const RESERVED_TEMPLATE_NAMES = [
  'llama', 'chatml', 'falcon', 'general', 'empty', 'auto'
]

const promptTemplatePlaceholder: CustomPromptTemplate['template'] = '{{systemPrompt}}\n{{history}}\nassistant:\n{{completion}}\nuser:\n'
const requiredPromptPlaceholders = [ 'history', 'completion' ]
const promptHistoryPlaceholder: CustomPromptTemplate['historyTemplate'] = '{{roleName}}:\n{{message}}\n'
const requiredHistoryPlaceholders = [ 'roleName', 'message' ]

const props = defineProps<{
  /**
   * An optional form title displayed above
   */
  formTitle?: string
  /**
   * A preset for the template name
   */
  name?: string
  /**
   * What should the button read? Default: "Create template"
   */
  buttonLabel?: string
  /**
   * A predefined template to populate the form with.
   */
  template?: CustomPromptTemplate
}>()

const emit = defineEmits<{
  (e: 'submit-form', name: string, template: CustomPromptTemplate): void
  (e: 'cancel'): void
}>()

const promptStore = usePromptTemplateStore()

watch(toRef(props, 'template'), (value) => {
  if (value === undefined) {
    return
  }

  newTemplateUserRole.value = value.userRoleName
  newTemplateModelRole.value = value.modelRoleName
  newTemplateSystemRole.value = value.systemRoleName
  newTemplatePrompt.value = value.template
  newTemplateHistoryPrompt.value = value.historyTemplate
}, { deep: true })

watch(toRef(props, 'name'), (value) => {
  if (value === undefined) {
    return
  }

  newTemplateName.value = value
})

const buttonLabel = computed(() => props.buttonLabel ?? 'Create template')

const newTemplateName = ref(props.name ?? '')
const nameValid = computed(() => validateName(newTemplateName.value) === undefined)
const newTemplateUserRole = ref(props.template?.userRoleName ?? '')
const userRoleValid = computed(() => validateRole(newTemplateUserRole.value, 'user') === undefined)
const newTemplateModelRole = ref(props.template?.modelRoleName ?? '')
const modelRoleValid = computed(() => validateRole(newTemplateModelRole.value, 'model') === undefined)
const newTemplateSystemRole = ref(props.template?.systemRoleName ?? '')
const systemRoleValid = computed(() => validateRole(newTemplateSystemRole.value, 'system') === undefined)
const newTemplatePrompt = ref(props.template?.template ?? '')
const templateValid = computed(() => validateTemplate(newTemplatePrompt.value) === undefined)
const newTemplateHistoryPrompt = ref(props.template?.historyTemplate ?? '')
const historyTemplateValid = computed(() => validateHistoryTemplate(newTemplateHistoryPrompt.value) === undefined)

function maybeSubmit () {
  const validations = [
    nameValid.value,
    userRoleValid.value, modelRoleValid.value, systemRoleValid.value,
    templateValid.value, historyTemplateValid.value
  ]
  
  if (!validations.every(x => x)) {
    return alertError(new Error('Cannot create template: The data was invalid'))
  }

  emit('submit-form', newTemplateName.value, {
      template: newTemplatePrompt.value,
      historyTemplate: newTemplateHistoryPrompt.value,
      modelRoleName: newTemplateModelRole.value,
      userRoleName: newTemplateUserRole.value,
      systemRoleName: newTemplateSystemRole.value
    } as CustomPromptTemplate)
}

function validateName (name: string): string|undefined {
  if (RESERVED_TEMPLATE_NAMES.includes(name.toLowerCase())) {
    return `Cannot use "${name}": Reserved template name`
  }

  if (
    promptStore.promptNames.map(x => x.toLowerCase()).includes(name.toLowerCase()) &&
    name.toLowerCase() !== props.name?.toLowerCase()
  ) {
    return `Cannot use "${name}": Name is already taken`
  }

  if (name.trim().length === 0) {
    return 'The name is required'
  }
}

function validateTemplate (template: string): string|undefined {
  for (const placeholder of requiredPromptPlaceholders) {
    if (!template.includes(`{{${placeholder}}}`)) {
      return `The prompt template must include the placeholder "{{${placeholder}}}"`
    }
  }
}

function validateHistoryTemplate (template: string): string|undefined {
  for (const placeholder of requiredHistoryPlaceholders) {
    if (!template.includes(`{{${placeholder}}}`)) {
      return `The history template must include the placeholder "{{${placeholder}}}"`
    }
  }
}

function validateRole (role: string, which: 'user'|'model'|'system'): string|undefined {
  if (role.trim().length === 0) {
    return `The ${which} role is required`
  }
}
</script>

<style>
</style>
