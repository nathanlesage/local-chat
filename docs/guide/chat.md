# The Chat

The chat is the main star of the show. It will be displayed in the central area of the application window when you select a conversation. It displays the conversation information as well as all messages, from old to new one.

At the bottom you can see a text area into which you can type a message to send.

## The general chatting workflow

Chatting in LocalChat works basically as any chat with a messenger app would work, too. You type a message, hit "Send" (or press `Shift+Enter`; you can insert new lines with just `Enter`), and wait for the other party to respond.

The main difference between a chat with your friends and chatting with an AI model is that the AI model will immediately begin responding. Also, instead of seeing the entire message once the model is finished generating it, you will see the message "build up" word for word.

To start chatting, simply enter a query and send it. Then, the chat will display a message that the model is currently generating a response. It will take a bit of time for the model to ingest the previous conversation. Afterwards, it will start to generate new text that will appear word for word in the message body.

While the model is generating, the chat will continuously scroll down so that you can read while the response is being generated. You can abort the message generation with the corresponding button on the status bar (next to the "Generating"-message). This is especially helpful if the model behaves weirdly and generates more and more text with no end in sight.

> Note: On a slower PC where the tokens are generated very slowly, be patient: once you press the abort button, the model will stop generating after the next token has been generated, but it needs to generate that one first.

## Markdown Support

You may have already seen this elsewhere, but many generative models are capable of generating valid Markdown syntax. For example, ChatGPT as well as many of the models that LocalChat support will wrap code in Markdown code blocks, or output proper list items.

LocalChat honors that, in that it will automatically render both your messages and the model's responses from Markdown to HTML. This means that you are also able to use Markdown in your messages.

However, try to use Markdown syntax sparsely. While the models to understand a bit of Markdown, this was not the main goal during training (rather, it was producing coherent responses), so the more complex the syntax is, the more likely it is for the model to understand it.

## Regenerating responses

Especially while you are getting warm with using generative AI, you may have to abort generation a few times while you try to find a good [prompt template](./models) or the right wording to get the model to generate what you want.

In order not having to ask your question ten times in a row, you have the ability to regenerate the last response. You can do so with a button that will appear between the conversation and the text area if that is possible.

> Note that this button will be hidden if the last response cannot be generated. In order for the last response to be regenerated, the last two messages of the conversation need to be first from you, and then from the model. Therefore, at the beginning of a conversation, or if you removed some messages from the chat, the button may not appear.

Regenerating the last response involves two steps: First, LocalChat will delete the last two messages, and then pretend that you have sent your last query again.

## Deleting messages

Of course, it is also possible to delete individual messages. This can help manage long conversations. By default, the library responsible for making a model talk to you tries to automatically remove messages if the conversation is longer than the context size, but this may remove essential messages while keeping unnecessary ones. By removing less important messages manually, you can control the process.

In addition, since the entire chat history will influence what the model will generate next, you can remove messages that you suspect have a detrimental influence on the model answers.

Note, however, that you may not be able to regenerate the last model response this way, especially if removing messages makes it so that the last two messages are no longer first from you, and then from the model.

## Exporting a Conversation

Lastly, you can export a conversation using the button below the text area. Conversations will always be exported in Markdown format.

## Troubleshooting

The technology underlying LocalChat is still nascent, and so there can be hiccups here and there. Crucially, there are two troubleshooting steps you should try first if something seems to happen:

Abort Generation
: If the model suddenly starts producing gibberish, or if the responses look weird to you, press the "Abort generation" button in the status bar. This will instruct the model to cease generating text after the next token. Then you can tweak the configuration and regenerate the model response afterwards.

Force-reload the model
: Sometimes, configuration changes may not have the wanted effect, or something else seems off. In these instances, it may make sense to forcefully reload the model. You can do so by pressing the "Repeat"-icon button in the status bar. This will reload the current model so that you can try again.
