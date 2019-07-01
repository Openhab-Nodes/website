+++
title = "Help out with the documentation"
date = "2019-06-01T08:15:12+02:00"
archives = "2019"
tags = ["documentation"]
categories = []
author = "David Graeff"
+++

A project is only as good as its documentation.

openHAB X is pretty solid when it comes to that. But there is always room for improvement. You encounter a spelling mistake or find a paragraph missleading or expressed in an unusual way? Improving a page, including blog posts, is always welcome. And pretty easy, too. New documents and blog posts are highly appreciated as well, of course.

Documents are written in Markdown. It is a quite intuitive markup dialect and you will find a quick introduction in the next section of this post.

The different pages are compiled into HTML via the static page generator Hugo. Hugo offers additional features on top of Markdown via so called *Shortcodes*. *Shortcodes* allow for layout options, like 2 or 3 column text, figures and diagrams, but cannot be previewed via the Github Editor interface.

## How to Contribute

Click on the "Improve this page" link next to the page title and you will be redirected to the document in edit mode on GitHub. Small fixes or short additions are best done this way.

If you plan on adding an entire new document or require a preview that includes shortcodes, you better clone the website repository on Github and to your computer. You then create a git branch for your changes, make your changes, perform a commit and a git push to finish the procedure.

On the command line you would enter those 

## Markdown

...

## Images, Icons and Figures

## Sourcecode

## Diagrams

There is unfortunately no native support for markup based diagrams in Hugo. Instead the Mermaid.js project and a helper script is used. You define diagrams like this:

<code><pre>
{{*< mermaid context="sprinkler_var_delay">*}}
graph LR;
    A[Cron Schedule] -->|Trigger| turn_on(Sprinkler on)
	turn_on --> delay_1(Delay, 5 min)
	delay_1 --> cond>"30°C Condition"]
	subgraph Delay if condition true
	cond -->|Yes| delay_2(Delay, 5 min)
	end
	delay_2 --> turn_off(Sprinkler off)
	cond -->|No| turn_off
{{*< /mermaid >*}}
</pre></code>

A helper script extracts those mermaid statements and convert them to actual pictures. The above shortcode will inject a simple html image tag. You must call the helper script yourself. Call it by entering `./update_mermaid_diagrams.sh`.The result looks like this:

{{< mermaid align="left" context="sprinkler_var_delay">}}
graph LR;
    A[Cron Schedule] -->|Trigger| turn_on(Sprinkler on)
	turn_on --> delay_1(Delay, 5 min)
	delay_1 --> cond>"30°C Condition"]
	subgraph Delay if condition true
	cond -->|Yes| delay_2(Delay, 5 min)
	end
	delay_2 --> turn_off(Sprinkler off)
	cond -->|No| turn_off
{{< /mermaid >}}
