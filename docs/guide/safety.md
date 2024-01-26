# Safety

Generative AI is a new technology that is still in development. There are many potential pitfalls and dangers awaiting, if you are not careful. This document outlines potential problems while using LocalChat, and how to avoid getting into problems.

## General Advice/Warning

Generative Large Language Models (LLMs) such as GPT and all the models you can use with LocalChat are **probabilistic language models**. This means they are "Stochastic parrots": they are trained on large corpora of text and will generate the next likely word in the sequence of the conversation.

This means that generative AI have no sense of time, causality, context, and what linguists call pragmatics. They tend to invent events that never happened, mix facts from disparate events, or tell straight up lies "hallucination". This means that, as a general rule of thumb:

> **Never trust the model. Never run verbatim code a model generates. Never trust its calculations. Never ever believe a fact that a model generates at face value. Always double-check with research whether the fact was actually true, or not. Use caution and reason at all times.**

That being said, there are a few things LLMs are known to do. All of this falls under the categories of model **bias**, **fairness**, and **safety**. Read the next section carefully.

## Model Bias; Model Fairness; Model Safety

A model will always exhibit inherent biases, generate unfair responses, or outright dangerous ones.

The following list contains potential issues with models but is **incomplete**. There may be other dangers emanating from the usage of generative AI. **Use caution and reason at all times.**

Hallucination
: The largest set of issues with generative AI is its propensity to hallucinate, or confabulate facts. As probabilistic language models, they have no means to test whether president Barack Obama is actually a Republican. If the training data makes it more probable for the model to generate "Barack Obama is a Republican" than "Barack Obama is a Democrat", it will simply generate it and present it as a fact. The same applies to calculations: If you ask the model how many Kilograms one pound is, it may respond that one pound equals 2.7kg, if "2.7kg" is the most probable sequence of characters following "One pound equals". While the amount of hallucination decreases with the amount of times a certain fact has been included in the training data, there is no guarantee. Since most data usually comes from the internet, the more often something is mentioned online, the more likely it is that the responses of a model will be more accurate for these facts. More niche facts (such as who Knut Wallenberg is) may be more often wrong.

Bias towards whiteness; privilege; "normal" behavior
: As mentioned, most training data of generative AI comes from the internet. Since the internet itself has a bias towards norm-abiding behavior, whiteness, and privilege, models are prone to reproduce this. Therefore, if you ask a model for advice, it may give you advice that, in effect, puts non-white people, or economically disadvantaged people, at a disadvantage. Therefore, do not simply implement any advice without thinking through its consequences.

Unfairness towards minorities; women; LGBTIQ*; deprivated communities
: A model can produce unfair responses that do not treat minorities, non-cis-heteronormative people, or members of deprivated communities equal to white people and it may suggest things that can have an unequal effect on these groups.

Generation of offensive or hate speech
: Models may also be susceptible to generating offensive speech. LocalChat gives you the freedom to experiment with the models and does not implement specific guard rails to shield you from offensive or even hate speech. This means that using LocalChat is at your own risk in this respect. If you have fear of becoming retraumatized or triggered by offensiveness, it is best advised not to use generative AI.

Generation of malicious links or code
: Again, following back on the fact that models have no sense of context or causality, they may accidentally generate malicious links or code. Specifically, since these models may generate working Markdown links (that LocalChat will render clickable) that may lead to harmful websites. Therefore, do not blindly click a link without verifying that the link is safe to use. Additionally, these models may accidentally produce valid HTML code that may put your computer at risk. The latter should be very unlikely, but the possibility is given.

## Malicious/Dangerous Models

Another issue concerns the source of these models. Since these models are created by humans, malicious actors may also create a model but ensure that it will always be very likely to generate malicious output. This can include, but is not limited, to JavaScript code that tries to gain access to your computer, or exploit other security issues. While it should be relatively difficult to do so, there is this possibility.

LocalChat itself implements any safeguards possible to ensure you stay safe, but there is always the chance that the app contains a security flaw that such malicious models could exploit.

To ensure your own safety, never download models from untrustworthy sources.

## Markdown and HTML Safety Concerns

A final note on the Markdown-to-HTML conversion in LocalChat. Since most models are capable of generating valid Markdown syntax, and to give you a few formatting tools at hand, LocalChat will render all messages by passing them through a Markdown-to-HTML converter. This means that Markdown code will be converted into HTML that is then rendered.

However, Markdown may already contain valid HTML, and thus it is possible to inject code into the app. LocalChat makes heavy usage of sandboxing to make it impossible for malicious actors to nudge you towards executing harmful code and giving attackers access to your computer.

While we do try to ensure that you remain safe, please be vigilant, because LocalChat cannot account for every possibility, and there is always a slight risk with using Markdown to HTML conversion.
