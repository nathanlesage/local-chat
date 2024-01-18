# LocalChat

> LocalChat is a simple, easy to set-up local AI chat built on top of [llama.cpp](https://github.com/ggerganov/llama.cpp). It requires no technical knowledge and enables users to experience ChatGPT-like behavior on their own machines — fully GDPR-compliant and without the fear of accidentally leaking information.

<p align="center">
  <a href="#overview">Overview</a> |
  <a href="#system-requirements">System Requirements</a> |
  <a href="#setup">Setup Guide</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="#configurationsystem-prompt">Configuration</a>
</p>

![An impression of LocalChat running OpenOrca Mistral 7b quantized](./static/screenshot.png)

## Overview

LocalChat provides a chat-like interface for interacting with generative Large Language Models (LLMs). It looks and feels like any chat conversation, but happens locally on your computer. No data is ever transmitted to some cloud server.

There are already several extremely capable generative language models which look and feel almost like ChatGPT. The major difference is that those models run locally and are open-weight.

> [!IMPORTANT]
> A note of caution. As you probably already know, chatting with a language model may feel very natural, but the model remains probabilistic: It will generate the next likely word based on what else is in the prompt. The model has no sense of time, causality, context, and what linguists call pragmatics. Thus, it may invent events that never happened, mix up facts from entirely different events, or tell straight up false facts. The same applies to code that this model can output. This being said:
> * Never trust the model. Confirm each and every bit of information it provides with independent research. A quick Google search for many things it outputs will give you more factually correct information.
> * Do not blindly run code it gives out. The code may work, but while working may erase your entire disk.
> * Do not trust its calculations.
> * Try to keep each conversation on a single topic to increase the quality.
>
> Exercise caution and use this model at your own risk. Keep in mind that it is a toy, not something reliable.

### Why?

When ChatGPT launched in November 2022, I was extremely excited – but at the same time also cautious. While I was very impressed by GPT-3's capabilities, I was painfully aware of the fact that the model was proprietary, and, even if it wasn't, would be impossible to run locally. As a privacy-aware European citizen, I don't like the thought of being dependent on a multi-billion dollar corporation that can cut-off access at any moment's notice.

Due to this, I couldn't really play around with GPT and decided to wait for the inevitable: the development of smaller and better tools. By now, there are several models that tick all the boxes: They run locally *and* they feel like ChatGPT.

However, even if good models exist, if you don't have any experience with creating language models, it will be hard to even *run* them. So I decided to create this frontend that takes away all configuration responsibility from you. You only install the app, download a model, and off you go.

## System Requirements

This app requires a moderately recent computer to be run. However, the most resource-hungry component of this app are the models that you will need to actually use the model. This app itself merely handles the interaction with these models. There are already models that run reasonably fast on even computers without a dedicated GPU, but depending on what computer you are running this on, your mileage may vary.

> [!IMPORTANT]
> As a large language model, generating responses will take a bit of time. To give you a sense of time, on my MacBook Pro 14'' M2 Pro with 16 GB of shared memory, it takes between 5 and 20 seconds to generate a non-trivial response from the model `mistral-7b-openorca.Q4_K_M`, which increases when I unplug my laptop from the wall. So please be a bit patient, especially if you are running the model on a weaker GPU, or even on the CPU.

## Getting Started

1. Download the app from the releases section of this repository, and install it
2. Open it, and open the model manager to receive instructions to download a model
   1. Visit Huggingface.co
   2. Download a model in GGUF-format
   3. Place that model file into the app's model directory
3. Chat!

The user interface is separated into three major components:

* The sidebar to the left contains a list of your conversations. You will need to create a new conversation to start chatting, By default, this conversation will utilize the first available model. You can change this later. Conversations and chats are persisted across restarts of the app.
* The main area is occupied by the chat interface. Here you will see the current conversation's messages, can type a new one, and see how the model is generating a response.
* The status bar at the bottom gives you a few status indications as to how the app and model are doing. Here, you can also switch the model which the currently active conversation uses.

## License

This code is licensed via GNU GPL 3.0. Read more in the [LICENSE file](./LICENSE).
