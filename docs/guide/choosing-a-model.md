# Choosing a Model

Amidst the flood of models that are being released every week, it is difficult to choose the right model -- especially since you will not only have to take into account the overall model quality, but the performance of your computer as well. You will not be able to run a 10 GB large model on a computer that only has 4 GB of RAM. (Well, you will be able to, but the generation will simply be unacceptably slow and frustrating.)

In this guide, we collect a few rules of thumb that you can use to roughly decide which model variant to use. Note that the model performance and the fact whether or not you can run a model depends on many factors, so none of these rules should be seen as absolute. Your mileage may vary.

## Finding Models

Finding models requires a little bit of research. This guide contains a [list with a few recommended models](./recommended-models).

Unless you have an industry-standard GPU such as a P40 or even an A100, you will probably have to use quantized versions of the models. Luckily, most GGUF-files contain quantized models, not the full ones. At the time of writing, the most prolific quantizer is "TheBloke" on Huggingface. If you visit <https://huggingface.co/models?sort=trending&search=gguf>, you will see all models in GGUF format, and likely many by "TheBloke".

If you now visit, e.g., [TheBloke's quantized OpenChat 3.5 model](https://huggingface.co/TheBloke/openchat-3.5-0106-GGUF), you will see the model's README file (model card). "TheBloke" is a good source for models, since they always include [a table of all quantized files](https://huggingface.co/TheBloke/openchat-3.5-0106-GGUF#provided-files) including a description of how much the quantization has impacted their performance. Other providers may not include such a description, but with a little bit of experience, it should be easy to judge which quantization method has which effects.

## Full model vs. quantized model

The most fundamental aspect to think about is whether to run a full or a quantized model. For the better or worse, you won't have to think about this too much, since the full models often do not come in the GGUF format and thus will not work with LocalChat. Additionally, most models will be too heavy for the average computer (which is the use-case LocalChat has been developed for).

Luckily, there is a method that can be used to dramatically reduce the size of generative models: quantization. In a nutshell, quantization reduces the precision of the model weights, which research has shown has little impact on the performance of the model if done right. There are many different types of quantization with different effects on performance, so it is crucial to choose the best quantization that still will work on your computer.

Essentially, what quantization will do is the following: each model generates text by performing billions of small calculations in the form `y = mx + b`, where `m` and `b` are floating-point numbers (i.e., `0.1452344`). During training, these numbers have many digits after the period, and each digit that you save naturally costs you space. During quantization, you basically "chop off" most of these digits and turn, e.g., `0.1452344` into just `0.145`.

Of course, the more digits you chop off, the worse the model will perform, so the first rule of thumb is: **Choose the quantization that gives you the largest model that will still fit into your computer's RAM.** At the time of writing, the best allrounder-method of quantization is `Q4_K_M`, but this may change. Especially for very large models, this quantization method will still produce models that are too large, in which case you can try out a more heavily quantized model. If the performance becomes too bad, however, it may be that you need to look for an alternative model.

## Context size

The second aspect you should consider and which will also influence the overall model size that you will be able to use is context size. The context is the text that the model has access to while it generates its response. In the context of LocalChat, this means: all previous messages. The larger the context, the more previous messages the model can have access to, but also the more RAM will be required to run it.

Due to design limitations, generative AI has a fixed maximum context length, it cannot process more tokens than the length of its context. This means that, if you have an especially long conversation, the model cannot see all previous messages, since a few will have to be removed from the context for the model to generate more tokens. Effectively, the context size is the model's memory, and if it has to "remember" too many things, it will "forget" some.

Context size is always expressed in "tokens", where a token is a part of a word. A common rule of thumb says that one word equals ~0.75 tokens. This means that a context size of 1,024 tokens corresponds to about 768 words, so two full pages of text. If the conversation is longer than that, the model must remove previous messages to generate a new response.

If you only ask a single question and then remove a conversation, a context size of as small as 512 tokens (~384 words) may be sufficient, but for longer conversations, you will need to have longer context sizes.

I have found that, on a MacBook M2 Pro 14'' with 16 GB of shared memory, the recommended models will all work with a context size of either 1,024 or 2,048 tokens, so a maximum of 1,500 words (~4 pages of text). If I increase the context size, the library will crash since it cannot reserve so much memory. If you have 32 GB of shared memory, you will likely be able to double this. But, if you want to run larger models than the recommended ones, you may be able to do so if you reduce the context size further.

***

As mentioned, these considerations are just rules of thumb and not fixed, so depending on what computer you have, you may be able to run larger models, or smaller ones. Also, if you run something that also needs the GPU, such as a Zoom call or watching a YouTube video, the text generation may become slower since it cannot access as much memory as it needs to generate new text fast.
