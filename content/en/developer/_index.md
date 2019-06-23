+++
title = "Developer documentation"
layout = "list"
+++

{{< readfile file="developer/_partials/authorsnote.inc" markdown="false" >}}

<p class="p-4">
Welcome to <b>The openHAB X Developer Documentation</b>, an introductory guide to make you familiar with design principles, the project philosophy, overall architecture as well component specific architecture.
</p>

## Who This Guide Is For
This documentation assumes that you’ve written code in another programming language. Software Developer Kits for addon development in different languages are introduced.

Quite a few chapters are dedicated to openHAB X Core development. OpenHAB X follows the idea of micro-services. You will read about concepts and the overall as well as service individual architecture. The programming language is [Rust](https://doc.rust-lang.org/book).

Frontend developers as well as App developers are very much welcome and will feel at home in the [Frontend: Apps / Web-UI](developer/frontend) chapter.

## How to Use This Guide

In general, this guide assumes no specific reading order.

The first few chapters outline the design principles and goals of the project. openHAB X consists of various components, organised in multiple repositories. You probably don't want to miss out on the [Architecture](/developer/architecture) chapter which provides links to all those different repositories and align them in a bigger picture. Later chapters are giving inside in some of the design decisions of specific components and how to extend or contribute to those. The developer guide finishes with the project governance structure.

You will not find class diagrams or API lists in this guide! Each component defines its own versioned APIs and uses the documentation style that is appropriate for the respective programming language.

The chapters are outlined like this:

<split>

## Code of Conduct

We are committed to providing a friendly, safe and welcoming environment for all. Please check the [Code of Conduct](/conduct) for more details.

## How to Contribute

openHAB X uses <button class="btn-link contexthelp" id="aboutgit" title="Context help">Git</button> as its version control system and [GitHub](https://www.github.com/openhab-nodes) for hosting the different repositories and source code.

<template data-popover="aboutgit">
<p style="max-width: 500px">
You will get in contact with <i><a href="https://git-scm.com/" target="_blank">Git</a></i> in many places and it makes sense to get yourself familiar with its basic commands and concepts. There are many pages to learn about Git. Try <a href="http://rogerdudler.github.io/git-guide" target="_blank">Git - The Simple Guide</a> as a start. In Git it is common to send *Pull Requests* from your own source code clone back to the official repository.
</p>
</template>
<ui-tooltip target="aboutgit"></ui-tooltip>

We are always thrilled to receive pull requests, and do our best to process them as fast as possible. Not sure if that typo is worth a pull request? Do it! We will appreciate it.

If your pull request is not accepted on the first try, don't be discouraged! If there's a problem with the implementation, hopefully you received feedback on what to improve.

openHAB X consists of various components, organised in multiple repositories. You find a comprehensive list in the [Architecture](/developer/architecture) chapter.

We’d love to have you contribute, too.
