<template>
  <Modal>
    <template v-slot:modal-header>
      <h1>First Start</h1>
    </template>
    <template v-slot:modal-body>
      <div v-html="currentStepText"></div>
    </template>
    <template v-slot:modal-footer>
      <LCButton v-if="currentStep < FIRST_START_GUIDE_PAGES.length" v-on:click="currentStep++">Next</LCButton>
      <LCButton v-else v-on:click="emit('close-modal')">Close</LCButton>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Modal from './util/Modal.vue'
import LCButton from './reusable-components/LCButton.vue';
import showdown from 'showdown'

const converter = new showdown.Converter()

const FIRST_START_GUIDE_PAGES = [
`## Welcome!

Welcome to LocalChat, your easy to use, privacy-aware chat assistant GUI.
LocalChat allows you to run a large variety of language models locally to
recreate the ChatGPT experience, but without any corporation involved.

Before we start, **first a note of caution**. Generative Large Language Models
(LLMs) are simply probabilistic machine learning models. The models have no
sense of time, causality, context, and what linguists call pragmatics. Thus,
they invent events that never happened, mix up facts from entirely different
events, or tell straight up false facts. The same applies to code that these
models can generate. This being said:

- **Never trust the model**. Always verify facts independently. Try to see the
  models as "keyword-givers" that may provide you with the missing word that you
  need to search for. Often the terms it will generate are correct, even if the
  context surrounding them is not. Sometimes, even the terms will be made up,
  but this is easy to check.
- **Never run code from the model**. Always read the code and verify that it
  won't delete all your files before running anything these models generate.
- These models have been trained to generate text. That means that these models
  are naturally worse at calculating, and their calculations are off even more
  often than the text they generate.
- Since these models come from various parties and stakeholders, their quality
  and what they excel at may differ widely. Read the associated model cards
  before you run them so you know what you're up against.

When you have read and understood these cautionary notes, click "Next" to view a
quick start guide.`,
////////////////////////////////////////////////////////////////////////////////
`## Quick Start

LocalChat is designed to be simple to use. You don't need any technical
knowledge get started. Setting things up only requires a bit of time to download
the models. After you have your model(s), everything else runs locally without
any access to the internet.

Here are the steps to get started:

1. After this guide, open the "Model Manager" to download your first model. We
   have a set of recommended models collected on our website. You can choose any
   model you want, as long as it fits into your computer's memory and it is
   provided in the GGUF file format.
2. Once you found a model, you can either download it with your browser, or you
   can paste the link into the text field in the model manager and click
   "Download". If you manually download the file, you simply have to copy it
   into the model folder, which you can open with the corresponding button in
   the model manager.
3. Once your first model is in your model folder, you can create a new
   conversation and start chatting.
4. You may want to adjust the settings in the model manager further. Please
   refer to our documentation for any additional questions.`,
////////////////////////////////////////////////////////////////////////////////
`You're all set! You can now close the quick start guide.`
]

const currentStep = ref<number>(0)

const currentStepText = computed<string>(() => {
  console.log('Returning next text')
  if (currentStep.value === FIRST_START_GUIDE_PAGES.length) {
    return ''
  } else {
    return converter.makeHtml(FIRST_START_GUIDE_PAGES[currentStep.value])
  }
})

const emit = defineEmits<{
  (e: 'close-modal'): void
}>()
</script>

<style>
</style>
