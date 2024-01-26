# Recommended Models

There are hundreds of chat models available already, and with the current pace, their number is likely to increase by several magnitudes over the coming years. It requires some experience to find the ~~droids~~ model you are looking for, so on this page we have collected a small list of models that we find are overall well-balanced for everyday tasks.

This list is very subjective and incomplete, but it should give you a starting point. For finding more models, we recommend you go to HuggingFace yourself and look through all available models, read their model cards, and decide which one to try next. To give you some guidance, we have written a small guide on [how to choose the right model](./choosing-a-model).

[TinyLlama 1.1B v1.0](https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF) -- Recommended starter model

: TinyLlama has been released in late 2023 and is a very small model that offers a great compromise between compatibility, size, and performance. Its generated text is sometimes doubtful, but it is capable of having a conversation. Additionally, due to its small size, it puts very low requirements onto your computer and should run on most computers out there.
: 
: **We recommend the variant [tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf](https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/blob/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf) since it is only ~800 MB in size and requires about 3 GB of (V)RAM.** To download the model, click on the link and use the "download" link on the page.

[OpenChat 3.5 0106](https://huggingface.co/TheBloke/openchat-3.5-0106-GGUF) -- Recommended allrounder

: OpenChat aims to produce an open model that offers comparable performance to ChatGPT. It is an allrounder, so if you need to write code and require a model that outputs the best-possible quality, you may want to download a specialized coding model, but for things from summarizing, rephrasing, and writing text, transforming outlines into drafts, and recipe help, this model truly excels.
: 
: **We recommend the variant [openchat-3.5-0106.Q4_K_M.gguf](https://huggingface.co/TheBloke/openchat-3.5-0106-GGUF/blob/main/openchat-3.5-0106.Q4_K_M.gguf). It is a little over 4 GB in size and requires roughly 7 GB of (V)RAM, so with any 16GB computer/MacBook, you should be good to go.** To download the model, click on the link and use the "download" link on the page.

[WizardCoder 7B v1.0](https://huggingface.co/TheBloke/WizardCoder-Python-7B-V1.0-GGUF) -- Recommended coding model

: WizardCoder is a model that has been specialized on writing code. It will still produce coherent sentences, though, so don't worry that it will only respond with code. This model is bigger (since writing accurate code requires the model to have enough parameters), but you can squeeze it in on 16GB computers/MacBooks by reducing its context size.
: 
: **We recommend the variant [wizardcoder-python-7b-v1.0.Q4_K_M.gguf](https://huggingface.co/TheBloke/WizardCoder-Python-7B-V1.0-GGUF/blob/main/wizardcoder-python-7b-v1.0.Q4_K_M.gguf). It is a little over 4 GB in size and requires roughly 7 GB of (V)RAM.** To download the model, click on the link and use the "download" link on the page.
