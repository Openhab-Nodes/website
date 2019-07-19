+++
title = "User Interfaces"
author = "David Graeff"
weight = 40
tags = ["frontend", "ui", "android", "flutter", "mobile", "dashboard"]
[pygmentsOptions]
    linenos = "table"
+++

This chapter introduces into the user interface development. Backends are not focused here and are covered in their own chapter [IO Service Addons](/developer/addons_ioservice).

Because addons should be able to extend how applications render Things, all OHX native applications use web technologies in one or another form.

Also covered in its own text is the **Setup &amp; Maintenance** interface.

This documents expects javascript knowdledge or willing to read a few referenced blog posts.

## The Dashboard App

This application is targeting (Wall-mounted) tablets. Because those tablets generally have a full blown operating system with a webbrowser, the Dashboard is implemented via web technologies.

It consists of only 3 html pages, one for the settings, one for logging in and one that shows the actual dashboard screen. The Dashboard App is developed with html, scss for styling (transpiled to css) and svelte for the javascript part.

A user can create and switch between multiple dashboards. Those boards are stored on the openHAB X system via the *User-Inferface-Storage IO Service*.

The *Tiles* that a Dashboard consists of are [custom web components](https://developers.google.com/web/fundamentals/web-components/customelements). 
A custom component is used like any other html tag. The tag for a Switch Thing property looks like this for example:

{{< highlight html >}}
<dashboard-thing-switch></dashboard-thing-switch>
{{< /highlight >}}

The app will place those components dynamically whenever it wants to render a dashboard with its Things and Thing Properties. This is explained in a later section. The Dashboard comes with *Tiles* for all common Thing and Thing property types.

You only need `npm` installed to get started. If you want to &hellip;

*  contribute to the dashboard App you will find the dashboard repository here: https://www.github.com/openhab-nodes/ui-dashboard
* develop your own *Tile*, you should check out the *Tile* example repository over here: https://www.github.com/openhab-nodes/ui-dashboard-tile-example


### Tile Registry

The dashboard app first requests all Things from the OHX instance. It then needs to decide how to render a "Switch" Thing or a "Light" Thing or a complex Thing like a stereo amplifier Thing.

It does so by maintaining a registry of available *Tiles* and supported Thing or Thing Property types. For many common Things a Tile is available. Multiple *Tiles* might match a Thing. In this case a priority system is used:

Core Tiles (Shipped) << Addon Tiles << External Tiles

So an external *Tile* has always the highest priority. If no *Tile* can be found, the Thing is rendered as a "Grouping Tile" with each Thing Property rendered on its own. The binary switch, text or numbers fallback *Tiles* are used for those Thing Properties if nothing else matches.

Addon Tiles
: Imagine you develop a Spotify&trade; Addon that exposes a Spotify&trade; Control Thing with a volume property, a playlist next/previous and play command property and a song title search input property.

The dashboard app will of course be able to render the thing, as described above with the fallback Tiles, but that will most certainly not win a design award, nor does it present a very usability friendly interface. You can change that by providing your own dashboard tile with your Spotify&trade; Addon.

### Developing your own Tiles

You start by defining your component. The functionality of a custom element is defined using an ES2015 class which extends HTMLElement. Extending HTMLElement ensures the custom element inherits the entire DOM API and means any properties/methods that you add to the class become part of the element's DOM interface.

{{< highlight js "linenos=table" >}}
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
{{< /highlight >}}

Shipping with an Addon
: Save your component file in `static/dashboard/` for example as `dashboard-my-thing.js` in your addon directory.

Independent Tile
: If you just want to provide alternatives to already existing Tiles, store the above content for instance in a `dashboard-my-thing.js` file in a github repository and add the link in the dashboard app configuration screen.

You find an article that talks about almost every aspect of custom components here: https://developers.google.com/web/fundamentals/web-components/customelements.

No matter if you have used the `static/dashboard` addon directory or an external github repository, your javascript file will be loaded dynamically by the dashboard and your given `dashboard_tile` is inserted into the *Tile Registry*.

The above Tile would replace the shipped Tile for text Things or Thing Properties and does nothing more than rendering text in bold font.

The dashboard expects a few events from a Tile and provides some attributes to a Tile.

#### Html Attributes

Those are always strings.
For example: `<dashboard-example an-attribute="value"></dashboard-example>`

value
: A stringified value of the given Thing or Thing Property

You see an example usage in the javascript snippet above (`this.getAttribute("value")`). You can also be notified of attribute changes. You need to return attributes that you want to be notified of in `observedAttributes` and then implement `attributeChangedCallback`.


{{< highlight js "linenos=table" >}}
window.customElements.define('dashboard-bold-text', class extends HTMLElement {
    attributeChangedCallback(attrName, oldVal, newVal) {
        ...
    }
    static get observedAttributes() {
        return ['disabled', 'value'];
    }
});
{{< /highlight >}}

#### Properties

Can be any javascript supported type, even complex objects.
For example: `dashboardExample.rawvalue = { "complex": "value", "v": 12};`

rawvalue
: The raw value from the state database. Might be a javascript object or just a plain value.

Usually you add getters/setters for `rawvalue` as in the code snippet below, so that you can react whenever that changes.

{{< highlight js "linenos=table" >}}
window.customElements.define('dashboard-bold-text', class extends HTMLElement {
    constructor() {
        super();
        this._rawvalue = {};
    }
    get rawvalue() {
        return this._rawvalue;
    }

    set rawvalue(val) {
        this._rawvalue = val;
    }
});
{{< /highlight >}}

#### Events

Events that your custom web component can emit and that are understood by the dashboard app.

command
: When the user interacts with your *Tile*, you need to send the changed value back to the openHAB X instance. You do so by issuing a "command" event. Depending on the the type of your *Tile* this is either a string, a boolean, a number or a complex javascript object. A light Thing for example can receive a complex type containing one or more values like the hue, brightness, saturation, color temperature.

{{< highlight js "linenos=table" >}}
window.customElements.define('dashboard-bold-text', class extends HTMLElement {
    my_fun() {
        this.dispatchEvent(new CustomEvent('command', {detail: {brightness:50,on:true}}));
    }
});
{{< /highlight >}}

## The OHX Mobile App

The mobile App is a Google Flutter application. Flutter does not render via the native, platform widgets of iOS or Android, but imitates the look and feel of the platform to a high degree of perfection. Using Flutter allows to have only one codebase for both major mobile operating systems.

A Flutter app is usually written in Dart which compiles down to native ARM machine code and allows for smooth animations and interaction.

Things are rendered via Flutter Widgets. The OHX App comes with *Widgets* for all common Thing and Thing Property types.

If no *Widget* can be found, the Thing is rendered as a "Grouping Widget" with each Thing Property rendered as its own *Widget*. The binary switch, text or numbers fallback *Widget* are used if nothing else can be found.

As mentioned in the introduction, one of the goals of OHX native apps is that an Addon developer should be able to supply custom "Widgets" for developed Things. This is realized via custom web components and *Tiles* for the dashboard app. This is also possible for the mobile App.

You need the Android Studio and Flutter SDK installed to get started. If you want to &hellip;

*  contribute to the dashboard App you will find the dashboard repository here: https://www.github.com/openhab-nodes/ui-mobile-app
* develop your own *Widget*, you should check out the *Widget* example repository over here: https://www.github.com/openhab-nodes/ui-mobile-app-widget-example

### Develop your own Widgets

For the mobile App the Flutter library [MXFlutter](https://github.com/TGIF-iMatrix/MXFlutter/blob/master/Documentation/readmeEnglish.md) has been used for Thing Widgets. Instead of Dart, you write the UI code in javascript which mimics the dart code style almost 1:1 (meaning all kind of Flutter tuturials are still usefull), but allows to push that code to the app during runtime.

Shipping with an Addon
: Save your widget file in `static/flutter/` for example as `bold-text.js` in your addon directory.

Independent Widget
: If you just want to provide alternatives to already existing Widgets, store the widget file content for instance in a `bold-text.js` file in a github repository and add the link in the mobile app configuration screen.
