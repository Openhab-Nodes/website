+++
title = "Help out with the documentation"
date = "2019-06-01T08:15:12+02:00"
archives = "2019"
tags = ["documentation"]
categories = []
author = "David Graeff"
+++

A project is only as good as its documentation.

openHAB X is pretty solid when it comes to that. But there is always room for improvement. You encounter a spelling mistake or find a paragraph missleading or expressed in an unusual way? Improving a page, including blog posts, is always welcome. And it's pretty easy, too.<!--more-->New documents and blog posts are highly appreciated as well, of course.


Documents are written in Markdown. It is a quite intuitive markup dialect and you will find a quick introduction in the next section of this post.

The different pages are compiled into HTML via the static page generator Hugo. Hugo offers additional features on top of Markdown via so called *Shortcodes*. *Shortcodes* allow for layout options, like 2 or 3 column text, figures and diagrams, but cannot be previewed via the Github Editor interface.

## How to Contribute

Click on the "Improve this page" link next to the page title and you will be redirected to the document in edit mode on GitHub. Small fixes or short additions are best done this way.

If you plan on adding an entire new document or require a preview that includes shortcodes, you better clone the website repository on Github and to your computer. Create a git branch for your changes, make your changes, perform a commit and a git push to finish the procedure.

On the command line you would enter:

1. `git checkout -o new_branch`
1. make changes
1. `git add .`
1. `git commit -m "A message that describes what happened" -s`
1. `git push`

## Markdown

Markdown is used to format documents. 

* Use `#`, `##`, `###`, `####` for different types of headings.
* Inline markup: `**bold**` **bold** and `*italic*` *italic* and both `***both***` ***both*** and strike-through `~~strike~~` ~~strike~~
* Links: `[Title](https://www.example.com)` and internal links: `[Title](/developer/addons)`
* Inline `sourcecode` via backticks: ``sourcecode` `

## Images, Icons and Figures

You can always just include the html img tag: `<img src="/img/doc/some_image.png">`.

There are also some shortcodes for preformatted images and font-awesome icons:

* <code>{<span></span>{< img src="/img/doc/some_image.png" title="a title" >}}</code>
* <code>{<span></span>{< imgicon src="fas fa-lightbulb" title="a title" >}}</code>

Each with optional arguments `maxwidth="20px"` and `height="20px"`. 

If you like the 3d rotated, shadowed images that 

## Layout

Sometimes you want to render a picture next to a piece of text. Unfortunately css `float` doesn't really work. The shortcode <code>{<span></span>{< colpic ratio="50" >}}left<<span></span>split>right{<span></span>{< /colpic >}}</code> ("column picture") splits the text area into two columns with the given ratio percentage.

For arbitrary columns with equal sized width use

<code>{<span></span>{< col >}}<br>
&nbsp;&nbsp;1st<br>
&nbsp;&nbsp;<<span></span>split><br>
&nbsp;&nbsp;2nd<br>
&nbsp;&nbsp;<<span></span>split><br>
&nbsp;&nbsp;3rd<br>
{<span></span>{< /col >}}</code>

## Configuration examples

Configuration parts where json, yaml and toml examples are given, are implemented via the `codetoggle` shortcode. Only yaml source is provide and the other formats are computed.

<pre>
{<span></span>{< code-toggle file="switch_off_after_5_min">}}
my_kitchen_scene:
  title: Cooking
  description: Lights to 70%, serving cabinet 100%, radion on
  tags:
    - scene
{<span></span>{< /code-toggle >}}
</pre>

This is rendered to:

{{< code-toggle file="switch_off_after_5_min">}}
my_kitchen_scene:
  title: Cooking
  description: Lights to 70%, serving cabinet 100%, radion on
  tags:
    - scene
{{< /code-toggle >}}

## Sourcecode

Use three backticks around multiple lines of code and specify the highlight syntax:

<pre>
`<span></span>`<span></span>` json
{
    "some":"value"
}
```
</pre>

``` json
{
    "some":"value"
}
```

Sometimes you get better results by directly using Hugo's highlight shortcode:

<pre>
{<span></span>{< highlight yaml >}}
my_config_key: "my_value"
{<span></span>{< /highlight >}}
</pre>

If you like to give code examples in different languages in a tabbed design, you need to fall back to html. 


<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
			<tab-header-item>C++</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< md >}}
```rust
fn main() {
    // ...
}
```
{{< /md >}}</tab-body-item >
<tab-body-item >{{< md >}}
```c++
int main(int argc, char** argv) {
    // ...
}
```
{{< /md >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

A custom html component is used for rendering:

```html
<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
			<tab-header-item>C++</tab-header-item>
		</tab-header>
		<tab-body>
			<tab-body-item >...</tab-body-item >
		</tab-body>
    </tab-container>
</div>
```

Because html disables markdown rendering, you need to wrap your source code in the highlight shortcode mentioned above or use the <code>{<span></span>{< md >}}markdown{<span></span>{< /md >}}</code> markdown shortcode to re-enable markdown rendering.

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
