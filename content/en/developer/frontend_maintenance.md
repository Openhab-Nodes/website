+++
title = "Maintenance UI"
author = "David Graeff"
weight = 41
tags = ["frontend", "ui"]
+++

openHAB X strives to be accessible and easy to grasp, without reading tons of documentation first. An important role plays the **Setup & Maintenance** Interface.

This chapter introduces into this interface, technical backgrounds and how to start hacking on it.<!--more-->

{{< colpic ratio="60" >}}

The interface was initially developed as a replacement for the [openHAB](https://www.openhab.org) Paper UI configuration interface (picture on the right). Both are web-based graphical solutions to allow to setup, reconfigure and in parts also maintain the installation. 

**Setup & Maintenance** has evolved further than anticipated and is a complete solution now, ranging from installing new Addons, to configure Services, Things, Users as well as inspecting runtime metrics, check logs and act on notifications and alerts.

<split>

<img src="/img/doc/paperui.jpg" class="w-100 mt-3 ml-3" style="transform: perspective(602px) rotateY(-16deg);box-shadow: -5px 8px 8px 0 rgba(0,0,0,0.15);">
<div class="text-center mt-2">openHABs Paper UI</div>

{{< /colpic >}}

Non goals for this interface are:

* Operating System (OS) management, which includes managing network interfaces, ssh remote access, kernel and hardware configuration and similar. The standalone installation uses Cockpit for this use-case.
* It also does not and should not offer any "control" parts. 

## Design 

{{< colpic ratio="50" >}}

<img src="/img/features/scenes.png" class="w-100 m-3" style="transform: perspective(602px) rotateY(16deg);box-shadow: -5px 8px 8px 0 rgba(0,0,0,0.15);">

<split>

A Responsive and an intuitive, beginner friendly design were the driving goals.

* The 3-column design for large and huge screen estate 
allows a clear design concept with actions/sub-navigation on the left, main content with a maximum width for better readability in the middle and a context area (mostly for context help) on the right.
* Medium sized screens will collapse and condense the layout. The context help becomes a dialog.
* On small screen estates the left actions/navigation area becomes a slide-able menu.

{{< /colpic >}}

### Forms or Text
Every configuration, ranging from Addons, Thing, Channels, Rules (also Scenes, Scheduled Actions), are editable via forms and dialogs as well as in a textual view mode. The latter allows search &amp; replace, copy &amp; paste batch editing.

If new objects and components are introduced, textual configuration should always be considered! Syntax highlighting and validation happens via the vscode editor support for JsonSchema. Every configuration in openHAB X must reqister a corresponding JsonSchema and that is queried for.

Vscodes support for YAML, TOML and JSON is used to offer the user a choice during editing and changing between those formats.

### Newby friendly

* New features should also gain a tutorial page for the tutorial section. That means a html page in `src/tutorial-*.html`. If the feature is complex, an exercise might need to be added to `src/tutorial-exercises.html`. Exercises are javascript based guided tours.

* New pages must have a corresponding context help text. A context help text is written in markdown and must be located at `assets/contexthelp`.

* Templates / Snippets for Scripts and Configurations are very helpful. Consider to add new ones to `assets/scriptsnippets/javascript` for scripts.

## Technologies

**Setup &amp; Maintenance** tries to stay maintainable for a long time and not use discarded technology.

It is NOT a Single Page Application (SPA). No js framework ought to be used if not required. Pages are pure html and (s)css and use web-components for interactive parts.
With the "Progressive enhancement" thought in mind, some components are developed to be purely optional. 

Scripts
: Javascript ES7 and newer is used. Not Coffeescript, not Typescript, not Closure. I do see the benefits of Typescript, but JS gets more and more expressive as well each year. [Jsdoc](https://devhints.io/jsdoc) (Javascript comments) is used to add "types" to arguments and variables. Modern IDEs like Visual Studio Code can interpret those annotations and offer correct auto-completion in real-time. Also only JS6-module compatible JS libraries are allowed.

Styling
: SASS/SCSS is used for styling: This CSS dialect offers a few useful extensions to CSS, but doesn't look to unfamiliar or different like Stylus for example. Bootstrap 4 is used for the base style. Styling fulfils a function, like leading your eye, making you focus specific parts and so on. Material Design was not used on purpose for exactly those reasons.

Graphical Rule Editor
: For graphical rule editing Rete-JS is used. Its memory leaks have been fixed (even de-registration was not implemented) and its vue renderer plugin has been adapter to use es6 modules. It's API has not been changed and should always stay upstream compatible!

Minimal Page Reloading while Server Side Rendered
: The advantage of SPAs are that the shell of the application stays, so there is no flickering while changing to another subpage. This project is fully "server-side-rendered" and a similar page change feature is realized as a progressive enhancement, by adding the custom component `<nav-ajax-page-load></nav-ajax-page-load>` to the page. Clicks are intercepted and only parts of the current shown page are replaced.

Code Editor
: The Visual Studio Code Editor (monaco editor) has been selected as the editor of choice. It supports syntax highlighting and auto-completion for all supported programming languages and half-structed data formats like json, yaml, toml. It allows to load JSonSchema files for advanced, semantic auto-completion.

Reactivity
: The Vue framework and Svelte are used for reactive parts. One reason is that Vue and Svelte component files use regular html with only a few Vue/Svelte specific annotations and scss/css for styles.
To reduce dependencies on frameworks, html templates should be embedded into html pages in-place whenever possible. Styles must be kept outside of component files and either be global or referenced. If Vue or Svelte ever gets replaced, we don't want to end up with a bunch of useless component files.

Browser support
: Setup &amp; Maintenance targets modern evergreen browsers. This excludes Internet Explorer.

### Web Components

Web Components and Custom Components allow for framework independant browser components. **Setup &amp; Maintenance** makes use of Custom Components whenever possible. A huge benefit is the component life cycle. For example the vscode editor component shuts correctly down and frees resources when the component is unloaded due to a javascript initiated page change. This is quite important because VScode is 8 Mb in size and would cloak the javascript engine if loaded multiple times.

The following Web Components have been developed and are potentially also useful for other projects:

* fetching and displaying markdown context help including rendering to html,
* featching and displaying forum topics (used for the openHAB community forum),
* navigation components (breadcrumb, prev/next-buttons),
* openHAB and openHAB X addons documentation fetching and displaying component.

More complex, reactive components are a bit tedious with just the clumsy html dom API alone. Svelte is
In the future, one option could be [Vue 3](https://medium.com/the-vue-point/plans-for-the-next-iteration-of-vue-js-777ffea6fabf). Thanks
to tree-shaking and building up on modern standards, it will come with a low footprint, suited for standalone html components.

But even today the Custom Component approach is much more maintainable than settling on any framework or worse, a framework+style combination. You find more information about the technial part in the repository readme file: https://github.com/openhab-nodes/setup_and_maintenance.

## Getting started

* Clone the repository with git
* Install the node package manager (npm)
* Execute `npm install` in the repository root directory.
* Execute `npm run dev` to start a small embedded http server and automatically open a browser page.