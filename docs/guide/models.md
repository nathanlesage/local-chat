# Models

This guide contains everything there is to know about how to manage your models. LocalChat allows you to have a (theoretically) unlimited amount of models installed on your computer. The only limit is your disk space.

Everything interesting with regard to models happens in the model manager.

## The Model Manager

The model manager is your central hub for configuring your models. Here you can download, set up, and remove models. You open it by clicking the model manager button in the status bar.

The model manager has two sections: one for downloading models, and one for managing your existing ones.

## Downloading new models

Downloading new models can be done in two ways. The "boring" way is to simply download a GGUF-file with your web browser, and afterward moving it to your model directory. The built-in way lets you download the model directly in LocalChat.

### Downloading new models with the built-in downloader

We recommend to use the built-in downloader. In this case, you will just need to copy the link to the GGUF-file to your clipboard, paste it into the input field, and click the Download button.

This will initiate the download and begin showing you a few infos regarding the download progress. During download, the model manager will tell you how much of the model has already been downloaded, how fast your current download speed is, and how long it will approximately take until the model is fully downloaded.

However, you don't have to keep the model manager open to see this info: When a model is being downloaded, the statusbar will also show you a progress bar with the most important infos as well, so you can continue chatting with your existing models while you wait for the download to finish.

Once the download is finished, LocalChat will retrieve the metadata from the model file and offer you to use that model.

### Downloading new models manually

Sometimes it may be better to download models manually. For example, it could be that you want to use LocalChat on a computer with no or only very spotty connectivity, and want to download the model as fast as possible. Or you already have the model downloaded to another folder on your computer.

In that case, you need to again open the model manager and then click on the button to open your model directory. This will open Finder (macOS), Explorer (Windows), or whatever file browser your Linux distribution uses. Simply move the GGUF-file into that folder.

After the file has been copied, head back into the model manager and click "Force reload model metadata". This makes LocalChat re-read the model directory and parse the new model you just put there. Now you can use the model.

## Configuring models

Each model is created differently, and so you have a series of options to further configure your model.

Currently, the two settings option are context length and prompt template.

### Context Size

To learn more about context size, see the [guide on choosing a model](./choosing-a-model), which includes an in-depth description of the context length. Basically, the longer the context, the longer the conversations you can have with the model, but the more memory it requires.

> Note: Due to a bug in the underlying library, LocalChat will currently crash if you choose a too long context size. If that happens, simply restart the app, it will reset your model config to the safe default of 512 tokens context length. Model configuration is only persisted if you normally exit the app.

By default, each model will be preset with a context size of 512 tokens. This is very small, but ensures maximum capability, as most computers will be able to fit at least that amount of context into memory. If you have a more powerful machine, you can safely increase the context size.

### Selecting an appropriate Prompt Template

The second option you have regards the prompt template. Each conversation requires a prompt template that wraps your questions and the model's responses in a format that the model can actually generate a reply to. For example, the general template looks like this:

```
### User

{user_message}

### Assistant

{assistant_message}
```

The prompt template must match what the model has been trained on so that (a) the model will understand what you are asking it, and (b) the wrapper is able to stop the generation once the model has emitted the appropriate tokens.

The default is to automatically detect a prompt template, but this may not work perfectly for each model. For example, Mistral's OpenOrca 7b model, the OpenChat 3.5 model, and TinyLlama v1.0 all follow the Llama architecture so LocalChat will select the Llama prompt template, which will cause the models to behave erratically. Instead, they need the "General" template.

Therefore, you can manually choose an appropriate template from the dropdown list. The templates are named after the model architecture, but at the time of writing, the most compatible format seems to be "Generic". Try to start a conversation with a model -- if the model starts generating weird text, this is a good indicator that the prompt template is wrong.
