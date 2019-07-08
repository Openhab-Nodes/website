+++
title = "The Setup & Maintenance Interface"
date = "2019-05-24T08:15:12+02:00"
archives = "2019"
tags = ["iot"]
categories = ["architecture"]
author = "David Graeff"
image = "/img/features/scenes.png"
+++

openHAB X strives to be accessible and easy to grasp, without reading tons of documentation first. An important role plays the **Setup & Maintenance** Interface.

Read on to hear about design considerations, implementation obstacles and technical details.<!--more-->

{{< colpic ratio="60" >}}

The interface was initially developed as a replacement for the [openHAB](https://www.openhab.org) Paper UI configuration interface (picture on the right). Both are web-based graphical solutions to allow to setup, reconfigure and in parts also maintain the installation. 

**Setup & Maintenance** has evolved further than anticipated and is a complete solution now, ranging from installing new Addons, to configure Services, Things, Users as well as inspecting runtime metrics, check logs and act on notifications and alerts.

<split>

<img src="/img/doc/paperui.jpg" class="w-100 mt-3 ml-3" style="transform: perspective(602px) rotateY(-16deg);box-shadow: -5px 8px 8px 0 rgba(0,0,0,0.15);">
<div class="text-center mt-2">openHABs Paper UI</div>

{{< /colpic >}}

What it is not doing
: It does not offer Operating System (OS) management, which includes managing network interfaces, ssh remote access, kernel and hardware configuration and similar. The standalone installation uses Cockpit for this use-case. It also does not allow to "control" your Smarthome or look at Thing state history. There are more suitable solutions with a design tailored for "controlling" and visualing.

## Design 

{{< colpic ratio="50" >}}

<img src="/img/features/scenes.png" class="w-100 m-3" style="transform: perspective(602px) rotateY(16deg);box-shadow: -5px 8px 8px 0 rgba(0,0,0,0.15);">

<split>

A Responsive and an intuitive, beginner friendly design were the driving goals.

* The 3-column design for large and huge screen estate 
allows a clear design concept with actions/sub-navigation on the left, main content with a maximum width for better readability in the middle and a context area (mostly for context help) on the right.
* Medium sized screens will collapse and condense the layout. The context help becomes a dialog.

{{< /colpic >}}

* On small screen estates the left actions/navigation area becomes a slide-able menu.


### Forms or Text
Every configuration, ranging from Addons, Thing, Channels, Rules (also Scenes, Scheduled Actions), are editable via forms and dialogs as well as in a textual view mode. The latter allows search &amp; replace, copy &amp; paste batch editing.

All editors have syntax highlighting and validation as well as auto-suggestions. The format can be switched on the fly from YAML, to TOML, to JSON5 (JSON with comments).

### Newby friendly

* Integrated tutorials are key to make a new user become familiar with core OHX concepts and were to find those within the application.

* Context help is available on every single page. Inline explanation texts are present were necessary.

* Templates / Snippets for Scripts and Configurations: A blank editor is not helpful at all. Templates / Starters are helping to get familiar with the syntax and keywords.

### Discover problems early

It is not reasonable to expect that any addon works without issues. But it helps a lot if you would know if it is actually your fault, or just a faulty implementation. That's why **Setup &amp; Maintenance** embeds known and reported problems whenever possible:

* Binding / Service configuration pages show all open github Issues and Pull requests. This way you can easily spot if a potential problem is already known.
* A binding author might have fixed a problem in a later version. If the author maintains a changelog file, the changes from your current version to the new version are shown, including breaking changes.

## Page Organisation

The top menu bar of **Setup &amp; Maintenance** contains only the most necessary categories. Although still quite a few, they all make sense and are usually used from the left to the right after installation:

Maintenance
: If you are looking for the logs, runtime metrics like CPU, memory usage, user management, access tokens and service configurations then you want to open the maintenance screen. If you run the standalone installation, updates will also be offered here. Linking your device to a openhabx.com subscription happens on this page, too.

Add-ons
: This page shows you the installed addons and also allows you to install and configure addons. Permissions for addons are managed here, too. Some addons require more disk space for example or would like to have more CPU time or memory.

Inbox
: Find all automatically dicovered Things here. Approve them or hide them. Sometimes you need to follow a pairing procedure.

Things
: Configured and Paired Things (like A Hue Bulb, a TV). You may alter configuration on this page, as well as check for the status (Online / Offline / Errors &amp; Logs). You can enter the *Groups* sub-page from here.

Channel Links
: Connect Things together, like your ZWave wall switch to your Hue bulb.

Scheduler
: Shows a graphical representation (scheduler) of future, timed actions. Allows to add new timed actions.

Scenes
: A scene is basically just a rule with the "scene" tag attached. Still, because scenes are presented in a different way (with an associated image), they have their own link in the top menu. Create new scenes on this page as well.

Automation
: Rules can be created and edited on this page.

## Technologies

**Setup &amp; Maintenance** tries to stay maintainable for a long time and not use discarded technology. Some burdens are on developers to keep it this way:

Scripts
: Javascript ES7 and newer is used. Not Coffeescript, not Typescript, not Closure. I do see the benefits of Typescript, but JS gets more and more expressive as well each year. [Jsdoc](https://devhints.io/jsdoc) (Javascript comments) is used to add "types" to arguments and variables. Modern IDEs like Visual Studio Code can interpret those annotations and offer correct auto-completion in real-time. Also only JS6-module compatible JS libraries are allowed.

Styling
: SASS/SCSS is used for styling: This CSS dialect offers a few useful extensions to CSS, but doesn't look to unfamiliar or different like Stylus for example. Bootstrap 4 is used for the base style. Styling fulfils a function, like leading your eye, making you focus specific parts and so on. Material Design was not used on purpose for exactly those reasons.

External libraries
: The Visual Studio Code Editor (monaco editor) has been selected as the editor of choice. For graphical rule editing Rete-JS is used. If any charts are involved charts.js is rendering them.

### JS Framework

The openHAB Paper UI, as mentioned, is the mental predecessor. It is a Single Page Application (SPA) developed using a js framework called Angular.

The downside of using a js framework is that you bind yourself to its API and concepts. Angular has a step learning curve, is not versioned semantically, does breaking changes regulary and people familiar with the framework are rare, because of the many existing and easier to use competitors like React, VueJS, Ember, Backbone, Aurelia, Meteor.js.

SPAs require most libraries and interfaces to be loaded and initialized during startup, although only a fraction is used on every rendered page. openHABs Paper UI fell into the framework trap, not only suffering from unresponsiveness whenever it loaded new data. On top it got really hard to extend the app and basically nothing can be recycled.

For **Setup &amp; Maintenance** a new approach has been chosen.
No js framework ought to be used if not required. Pages are pure html and (s)css and use web-components for interactive parts.
With the "Progressive enhancement" thought in mind, some components are developed to be purely optional. 

The advantage of SPAs are that the shell of the application stays, so there is no flickering while changing to another subpage. This is realised in this project as a progressive enhancement, by adding the custom component `<nav-ajax-page-load></nav-ajax-page-load>` to the page. Clicks are intercepted and only parts of the current shown page are replaced.

The Vue framework is used for reactive parts. One reason is that its component files use regular html with only a few Vue specific annotations and scss/css for styles. Still, to reduce dependency on the framework, html templates are embedded into the html pages whenever possible. Styles are kept outside of component files. If Vue ever gets replaced, we don't want to end up with a bunch of useless vue component files.

Browser support
: Setup &amp; Maintenance targets modern evergreen browsers. This excludes Internet Explorer and that's alright.

### Web Components

Web Components and Custom Components allow for framework independant browser components. **Setup &amp; Maintenance** makes use of Custom Components whenever possible. A huge benefit is also the component life cycle. For example the vscode editor component shuts correctly down and frees resources when the component is unloaded due to a javascript initiated page change.

The following Web Components have been developed and are potentially also useful for other projects:

* fetching and displaying a markdown context help including rendering to html,
* featching and displaying forum topics (used for the openHAB community forum),
* navigation components (breadcrumb, prev/next-buttons),
* openHAB addons documentation fetching and displaying component.

More complex, reactive components are a bit tedious with just the clumsy html dom API alone.
In the future, one option could be [Vue 3](https://medium.com/the-vue-point/plans-for-the-next-iteration-of-vue-js-777ffea6fabf). Thanks
to tree-shaking and building up on modern standards, it will come with a low footprint, suited for standalone html components.

But even today the Custom Component approach is much more maintainable than settling on any framework or worse, a framework+style combination. You find more information about the technial part in the repository readme file: https://github.com/openhab-nodes/setup_and_maintenance.

## Your opinion matters

There is always room for improvement. **Setup & Maintenance** is modular. It is not so hard to contribute

1. a translation or spelling correction,
1. alter specific procedures and maybe add a step to improve intuitiveness,
1. add more context help or improve the workflow on how to archive certain things.

Help texts are written in markdown, like the source of this website.

Sometimes it just helps if you tell your user story. What need to be changed to archive certain outcomes faster? How to reduce mouse pointer travel distances?

Open *Issues* [here](https://www.github.com/openhab-nodes/setup_maintenance_interface) and discuss your findings.

I hope that **Setup & Maintenance** suits your needs or soon will be.

Happy Automating<br>
 — David Graeff