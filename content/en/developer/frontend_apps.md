+++
title = "User Interfaces"
author = "David Graeff"
weight = 40
tags = ["frontend", "ui", "android", "flutter", "mobile", "dashboard"]
+++

Frontend / user interface development happens on multiple technologies. This chapter introduces those different technology environments. Backends are not focused here. Remember that a "backend" is actually an [IO Service Addon](/developer/addons_ioservice) and those are covered in their own text.

Also covered in its own text is the **Setup &amp; Maintenance interface, that you find in the next chapter.

## The Dashboard App

This application is targeting (Wall-mounted) tablets. Because those tablets generally have a full blown operating system with a webbrowser, the Dashboard is implemented via web technologies.

It consists of only 3 html pages, one for the settings, one for logging in and one that shows the actual dashboard screen.

A user can create and switch between multiple dashboards. Those boards are stored on the openHAB X system via the *User-Inferface-Storage IO Service*.

The *Tiles* that a Dashboard consists of are [custom web components](https://developers.google.com/web/fundamentals/web-components/customelements) that are implementing a specific API (html attributes, javascript events). This is explained in the next section. The Dashboard comes with components for all known Thing and Thing Channel types.

{{< callout info="Technical background" >}}
Components are added via [Dynamic Imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#Dynamic_Import) to the Dashboard and can carry their own CSS style code.
{{< /callout >}}

In the configuration screen you can add additional component repositories.

Theme
: You can select a design theme in the configuration or develop your own css theme and use the css-url-selection in the configuration screen.

Communication
: The Dashboard connects to openHAB X via the *WebThings IO Service*, meaning that HTTP is used and a Websocket connection is established for real-time updates.

There is nothing worse, than an empty screen. Therefore all configured Things are displayed by default on the "Home" Dashboard. *Tiles* are dragable and freely arrangeable. Things with multiple Thing Channels (like a 2-gang Switch Thing) can be reduced to a single, primary Channel. Things can be added multiple times to a dashboard.

### Developing your own Panels

A custom component is used like any other html tag. The tag for a Switch Thing Channel looks like this for example:

```html
<dashboard-thing-switch></dashboard-thing-switch>
```

The dashboard expects that 