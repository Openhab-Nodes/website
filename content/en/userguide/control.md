+++
title = "Control your Smarthome"
author = "David Graeff"
weight = 60
tags = ["app","control","android","ios"]
+++

All Thing Channels, if not disabled, are automatically exposed to the different control interfaces.

To exclude a Channel from exposition, navigate to the Thing Channels screen
in the Setup &amp; Maintenance application.
Choose "Hide from" and select the interface, for example "Hue Bridge Interface" and "For all Users":

1. a
1. a
1. a

## Hue Apps

You can assign **Channels** to "Rooms", create "Scenes" and use "Timers" and "Rules".

Scenes, Timers and Rules created in Hue Apps are also available to the openHAB X Mobile App
and Dashboard App.

{{< callout title="Hue Apps with different access levels" type="info" >}}
Hue Apps require a pairing procedure.
A pairing in openHAB X is user specific. If you login as the administrator and enable Hue App Pairing,
all connected Apps in that period will act on behalf of the administrator user.

Login as a different user and enable pairing. The Hue App will only see Thing Channels that the specific user is allowed to see and control.
{{< /callout >}}

## openHAB X Mobile App

## Dashboard App

## Amazon Alexa, Google Home, HomeKit

