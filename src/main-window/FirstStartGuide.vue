<template>
  <div id="first-start-guide-modal">
    <div id="first-start-guide-modal-body">
      <h1>First Start</h1>
      <template v-if="currentStep === 0">
        <p>
          Welcome to LocalChat, your easy to use, privacy-aware chat assistant GUI.
          LocalChat allows you to run a large variety of language models locally to
          recreate the ChatGPT experience, but without any corporation involved.
        </p>
        <p>
          Before we start, first a note of caution. Generative Large Language Models
          (LLMs) are simply probabilistic machine learning models. The models have
          no sense of time, causality, context, and what linguists call pragmatics.
          Thus, they invent events that never happened, mix up facts from entirely
          different events, or tell straight up false facts. The same applies to
          code that these models can generate. This being said:
        </p>
        <ol>
          <li>
            Never trust the model. Always verify facts independently. Try to see
            the models as "keyword-givers" that may provide you with the missing
            word that you need to search for. Often the terms it will generate are
            correct, even if the context surrounding them is not. Sometimes, even
            the terms will be made up, but this is easy to check.
          </li>
          <li>
            Never run code the model gives out. Always read the code and verify
            that it won't delete all your files before running anything these
            models generate.
          </li>
          <li>
            These models have been trained to generate text. That means that these
            models are naturally worse at calculating, and their calculations are
            off even more often than the text they generate.
          </li>
          <li>
            Since these models come from various parties and stakeholders, their
            quality and what they excel at may differ widely. Read the associated
            model cards before you run them so you know what you're up against.
          </li>
        </ol>
        <p>
          When you have read and understood these cautionary notes, click "Next"
          to view a quick start guide.
        </p>
      </template>

      <template v-else-if="currentStep === 1">
        <p>
          LocalChat is designed to be simple to use. This means that you won't
          need any technical knowledge to use it. Setting things up only requires
          a bit of time to download the models (and a comparatively decent
          internet connection), but after you have your models, everything else
          runs locally without any access to the internet.
        </p>
        <p>
          Here are the steps to get started:
        </p>
        <ol>
          <li>
            After you close this guide, open the "Model Manager". The model
            manager gives you instructions on how to obtain models. LocalChat
            works with models that are available in the "gguf" file format.
          </li>
          <li>
            After you have downloaded one or more models, click on "New
            Conversation" in the sidebar. This will create a new chat session
            with the first available model. You can always change the model that
            you use with the dropdown above the chat history. Note, however, that
            switching models mid-session may yield unexpected results.
          </li>
          <li>
            Whenever you create a new conversation, it will by default use the
            last used model, or, if that is not available, the first model that
            is found.
          </li>
          <li>
            Your conversations will be persisted across restarts of the app, so
            that you can continue where you left off.
          </li>
        </ol>
      </template>
      <template v-else>
        <p>
          You're all set! You can now close the quick start guide and get started.
        </p>
      </template>
    </div>

    <div id="first-start-guide-modal-footer">
      <button v-if="currentStep < lastStep" v-on:click="currentStep++">Next</button>
      <button v-on:click="emit('close-modal')">Close</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const currentStep = ref<number>(0)

const lastStep = 2 // NOTE: Increment if applicable!

const emit = defineEmits<{
  (e: 'close-modal'): void
}>()
</script>

<style>
div#first-start-guide-modal {
  z-index: 2;
  position: absolute;
  display: flex;
  flex-direction: column;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  background-color: rgba(230, 230, 230);
  color: rgb(66, 66, 66);
  padding: 20px;
  overflow-x: hidden;
  overflow-y: hidden;
}

div#first-start-guide-modal-body {
  flex-grow: 1;
  overflow-y: auto;
}

div#first-start-guide-modal li {
  margin: 15px 0;
}

@media (prefers-color-scheme: dark) {
  div#first-start-guide-modal {
    background-color: rgb(66, 66, 66);
    color: white;
  }
}
</style>
