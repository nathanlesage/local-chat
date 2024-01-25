<template>
  <div id="welcome-message">
    <h1>LocalChat</h1>
    <p id="slogan">LocalChat is a ChatGPT-like chat that runs on your computer.</p>
    <p>
      It looks like you don't have any models available. To start chatting, you'll need to get one.
      Open the Model Manager and follow the instructions. It only requires three steps to get started:
    </p>
    <ol>
      <li>Download a suitable model via LocalChat, or directly move one into the model folder</li>
      <li>Create a new conversation</li>
      <li>Chat!</li>
    </ol>
    <p>
      You may also want to tweak the model settings a bit to get the most out of your experience.
    </p>
    <p>
      Please <a href="https://nathanlesage.github.io/local-chat">read the documentation</a> if you have any questions.
    </p>
    <p>
      <strong>
        Do not blindly trust model outputs, and never run any code directly that a model generates.
        Always fact check, and make transparent whenever you have used a language model to generate some text.
      </strong>
    </p>
  </div>
</template>

<script setup lang="ts">
</script>

<style>
#welcome-message {
  max-width: 600px;
  margin: 0 auto;
}

#welcome-message h1 {
  text-align: center;
}

#slogan {
  text-align: center;
  font-style: italic;
  color: rgb(128, 128, 128);
}
</style>
