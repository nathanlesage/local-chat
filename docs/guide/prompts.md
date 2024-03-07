# Model Prompts

Generative AI is simply a neural network trained to predict the next likely word in some sequence. In order to do this, a model needs two training phases: First a pre-training phase which intends to embed the information contained in the training data in the model. Second, the model needs to be "instruction-tuned". This step involves creating a series of conversations and training the model on that. For this, chunks of information are wrapped in some template that helps the model interpret user messages (questions, inquiries, statements, and so forth) and generate something in the style of an answer.

In order for the model to be as precise as possible, the conversations that you lead with models using LocalChat need to be wrapped in the very same template. If the template that the app uses to wrap a conversation differs from what the model has seen during instruction tuning, this can severly degrade performance since the model will be unable to detect where a user inquiry starts and where it should start generating an answer.

## Built-in Templates

LocalChat ships with a set of standard templates that should work for most cases, which are provided by the underlying library, `node-llama-cpp`. At the time of writing, these are:

* `llama`: For Llama-style models
* `chatml`: For ChatML-compatible models
* `falcon`: For Falcon-style models
* `general`: A general template that provides a basic conversation wrapper
* `empty`: A barebones template without any specific strings
* `auto`: This is what LocalChat will always default to for new models. This aims to detect the template from the model file itself, and resolve to one of the pre-built template wrappers

However, since there are many different models out there, these templates may not suffice. This is why LocalChat gives you the ability to specify custom prompt templates.

## The Process of Prompting

Before diving into the prompt manager, you should understand how a prompt template is being used to generate a reply by the model.

There are five parts to the process of prompting with a template:

1. Roles for the three relevant users in each conversation: user, model, and system
2. An individual message's template; here called "history prompt template"
3. A template to wrap the entire conversation in before starting the generation
4. A string of text that the model expects before generating its response
5. A string of text that the model will generate after it has finished its response and which indicates that the generation should stop

In the context of LocalChat's templates (which are based off `node-llama-cpp`), the final three things are contained in the prompt template. The library will extract parts 4 and 5 from the prompt template.

Here is an example of a history prompt template:

```
\{\{roleName\}\}:
\{\{message\}\}
```

This indicates that the model has, during training, seen messages in this format. If you prompt a model with a template whose "user role" is "Human" with the question "What is generative AI?", the template will result in the following text being passed to the model:

```
Human:
What is generative AI?
```

Next, here is an example of a prompt template:

```
\{\{systemPrompt\}\}
\{\{history\}\}
assistant:
\{\{completion\}\}
user:
```

Using the example from before and ignoring the system prompt for now, this will yield the following text to be passed to the model:

```
Human:
What is generative AI?
assistant:
```

Note that the entire part after `\{\{completion\}\}` is missing. The reason is that the completion placeholder indicates the part of the prompt where the model will actually generate text. "completion" separates the text that will be fed into the model from the text that the library will look for to determine if the model is done generating. In our example, the string that indicates that it is finished is "user:". Note furthermore, that the model will probably not generate "user:", but rather "Human:", because that is what the user role is. Thus, you need to pay attention to this part.

When LocalChat prompts a model, the process of using a prompt template to wrap the existing conversation and prompt it is straight forward:

1. For each message in the conversation history, format it according to the history prompt template, substituting the "roleName" for the appropriate role that you provided earlier in the form.
2. Concatenate this entire history as a long string of text
3. Take the prompt template, substitute the system prompt placeholder (using the history prompt template with the role "system"), then the history placeholder with the history generated in steps 1 and 2, and add any text between the history and completion placeholders. Remove anything from the prompt beginning with the completion placeholder
4. Prompt the model, and inspect the generated text; as soon as the model has generated the text you provided after the completion placeholder, LocalChat knows that the model is done

## The Prompt Manager

You can open the prompt manager by clicking the corresponding icon in the status bar. It looks similar to the model manager, but for your custom prompts.

By default, there are no custom prompts. Click on the button "Create new Prompt" to begin the process of creating a new prompt.

### Creating a New Prompt

Each prompt requires some information. First of all, it needs a unique name. This name cannot be one of the default templates, and needs to be unique among your custom prompts.

Next, you need to define three "role names". These will be used to build the chat history so that the model receives all previous messages. Many models use the basic trias of "user", "model", and "system", but this may differ. Refer to the appropriate model card to find these names.

The final two pieces of information are the prompt template and the history prompt template. Let us first focus on the history prompt template.

This template is used to wrap each individual message. You must specify two placeholders: `\{\{roleName\}\}`, which will be replaced with one of the three specified role names, and `\{\{message\}\}`, which will be replaced with the actual message.

The final piece is the full prompt template. The prompt template should include the placeholder `\{\{systemPrompt\}\}`, as otherwise the model does not receive your system prompt (but this placeholder is optional). Next, you must provide the placeholder `\{\{history\}\}`. This will be replaced with all messages, each wrapped in the history prompt template.

The final part of the prompt template concerns the model's prediction, which is indicated by the placeholder `\{\{completion\}\}`.

Note that you probably need to define some string beforehand, and some afterwards. Usually, the part of the prompt after the `\{\{completion\}\}` placeholder must be some string of characters that the model will generate after it has finished its response, and the part before that placeholder must be a string of characters the model expects before it generates its response.

As an example, for the OpenChat model, the end of sequence-string is `<|end_of_turn|>`. The string in between `\{\{history\}\}` and `\{\{completion\}\}` should be the last text that the model sees in the prompt before it is asked to generate a response, which is usually the model's role name, but may differ. Note that you cannot use `\{\{roleName\}\}` here, since that will not be expaned in the prompt.

### Editing a Prompt

If you spot a mistake, or need to improve the template, you can enter editing mode on an existing prompt by using the editing-button to the top-right of the prompt card. This will load the prompt's information into the same prompt form as you saw when creating a prompt, and allows you to modify any aspect of the model.

Note that when you rename the prompt, you need to adapt the model configuration, since otherwise the model will fall back to the "auto" prompt template.

### Removing a prompt

To remove a prompt, simply click the trash can button in the top right of the prompt card.

## Using Custom Prompts

To use a custom prompt, head over to the model manager and select your custom prompt from the prompt dropdown. Ensure that you reload the model again using the appropriate button in the statusbar so that the changes are propagated into the model.
