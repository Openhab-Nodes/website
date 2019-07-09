+++
title = "User Interfaces"
author = "David Graeff"
weight = 40
tags = ["frontend", "ui", "android", "flutter", "mobile", "dashboard"]
+++

This chapter introduces into the user interface development. Backends are not focused here and are covered in their own chapter [IO Service Addons](/developer/addons_ioservice).

Because addons should be able to extend how applications render Things, all OHX native applications use web technologies in one or another form.

Also covered in its own text is the **Setup &amp; Maintenance** interface.

## The Dashboard App

This application is targeting (Wall-mounted) tablets. Because those tablets generally have a full blown operating system with a webbrowser, the Dashboard is implemented via web technologies.

It consists of only 3 html pages, one for the settings, one for logging in and one that shows the actual dashboard screen.

A user can create and switch between multiple dashboards. Those boards are stored on the openHAB X system via the *User-Inferface-Storage IO Service*.

The *Tiles* that a Dashboard consists of are [custom web components](https://developers.google.com/web/fundamentals/web-components/customelements) that are implementing a specific API (html attributes, javascript events). This is explained in the next section. The Dashboard comes with *Tiles* for all common Thing and Thing Channel types.

In the configuration screen you can add additional *Tile* repositories, like a github repository of another user.

Theme
: You can select one of the two shipped design themes in the configuration screen or develop your own cascading style sheet (css) based theme and upload it to a github repository. In the configuration screen you then enter the url to your style sheet.

Communication
: The Dashboard connects to openHAB X via the *WebThings IO Service*, meaning that HTTP is used and a Websocket connection is established for real-time updates.

There is nothing worse, than an empty screen. Therefore all configured Things are displayed by default on the "Home" Dashboard.

A Thing is rendered as a *Tile*. *Tiles* are dragable and freely arrangeable. Things with multiple Thing Channels (like a 2-gang Switch Thing) can be reduced to a single, primary Channel. If multiple render options exist, you can select between them. Things can be added multiple times to a dashboard.

### Tile Registry

The dashboard app first requests all Things from the OHX instance. It then needs to decide how to render a "Switch" Thing or a "Light" Thing or a complex Thing like a stereo amplifier Thing.

It does so by maintaining a registry of available *Tiles* and *Tile* capabilities. Tiles have a priority assigned and the one that is matching and has the highest priority value is selected. For many common Things a Tile is available. Addon provided Tiles have a higher priority than shipped ones. Externally added Tiles have again a higher priority.

If no *Tile* can be found, the Thing is rendered as a "Grouping Tile" with each Thing Channel rendered as its own *Tile*. The binary switch, text or numbers fallback *Tiles* are used if nothing else can be found.

Imagine you develop a Spotify&trade; Addon that exposes a Spotify&trade; Control Thing with a volume channel, a playlist next/previous and play command channel and a song title search input channel.

The dashboard app will of course be able to render the thing, but it will most certainly not win a design award, nor does it present a very usability friendly interface. You can change that by providing your own dashboard tile with your Spotify&trade; Addon.

### Developing your own Tiles

As mentioned, a Tile is a custom web component.
A custom component is used like any other html tag. The tag for a Switch Thing Channel looks like this for example:

```html
<dashboard-thing-switch></dashboard-thing-switch>
```

You start by defining your component. The functionality of a custom element is defined using an ES2015 class which extends HTMLElement. Extending HTMLElement ensures the custom element inherits the entire DOM API and means any properties/methods that you add to the class become part of the element's DOM interface. Essentially, use the class to create a public JavaScript API for your tag.

```js
window.customElements.define('dashboard-bold-text', class extends HTMLElement {
    constructor() { /* optional constructor */
        super();
    }
    connectedCallback() { /* called when actually inserted into the page */
        this.innerHTML = `<b>${this.getAttribute("value")}</b>`;
    }
    disconnectedCallback() { /* when page is unloaded or tag gets removed */
    }
});

const dashboard_tile = { /* Meta data for the Tile Registry */
    version: 1.0,
    title: "Bold Render Tile",
    description: "A tile that renders text in bold",
    type: "text" /* The registry selects tiles based on the type */
};
export { dashboard_tile };
```

Shipping with an Addon
: Save your component file in `static/dashboard/` for example as `dashboard-my-thing.js` in your addon directory.

Independent Tile
: If you just want to provide alternatives to already existing Tiles, store the above content for instance in a `dashboard-my-thing.js` file in a github repository and add the link in the dashboard app configuration screen.

You find an article that talks about almost every aspect of custom components here: https://developers.google.com/web/fundamentals/web-components/customelements.

No matter if you have used the `static/dashboard` addon directory or an external github repository, your javascript file will be loaded dynamically by the dashboard and your given `dashboard_tile` are inserted into the *Tile Registry*.

The above Tile would replace the shipped Tile for text Things or Thing Channels and does nothing more than rendering text in bold font.

The dashboard expects a few events from a Tile and provides some attributes to a Tile.

#### Attributes

#### Events

## The OHX Mobile App

The mobile App is a Google Flutter application. Flutter does not render via the native, platform widgets of iOS or Android, but imitates the look and feel of the platform to a high degree of perfection. Using Flutter allows to have only one codebase for both major mobile operating systems.

A Flutter app is usually written in Dart which compiles down to native ARM machine code and allows for smooth animations and maximum performance, superior to Android Java bytecode apps.

Things are rendered via Flutter Widgets. The OHX App comes with *Widgets* for all common Thing and Thing Channel types.

If no *Widget* can be found, the Thing is rendered as a "Grouping Widget" with each Thing Channel rendered as its own *Widget*. The binary switch, text or numbers fallback *Widget* are used if nothing else can be found.

Imagine you develop a Spotify&trade; Addon that exposes a Spotify&trade; Control Thing with a volume channel, a playlist next/previous and play command channel and a song title search input channel.

The mobole app will of course be able to render the thing, but it will most certainly not win a design award, nor does it present a very usability friendly interface. You can change that by providing your own Widget with your Spotify&trade; Addon.

### Develop your own Widgets

As mentioned in the introduction, one of the goals of OHX native apps is that an Addon developer should be able to supply custom "Widgets" for developed Things. This is realized via custom web components and *Tiles* for the dashboard, as described in the last section.

For the mobile App the Flutter library [MXFlutter](https://github.com/TGIF-iMatrix/MXFlutter/blob/master/Documentation/readmeEnglish.md) has been used for Thing Widgets. The library allows to write Javascript code that mimics the dart code style but allows to push Widgets to the app during runtime.

Shipping with an Addon
: Save your widget file in `static/flutter/` for example as `bold-text.js` in your addon directory.

Independent Widget
: If you just want to provide alternatives to already existing Widgets, store the widget file content for instance in a `bold-text.js` file in a github repository and add the link in the mobile app configuration screen.
