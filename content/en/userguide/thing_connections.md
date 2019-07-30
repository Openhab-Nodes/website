+++
title = "Link Channels"
author = "David Graeff"
weight = 40
tags = ["channels"]
+++

So far you have learned how to install Addons, discover and configure Things and how to control those. In this chapter you learn about establishing connections between Things. Like for example connecting the left button of a ZWave two-gang wall switch with a Zigbee Lightbulb.

Connections are a powerful utility. Not only do they allow to interconnect different brands and devices with each other, but they can also contain small parts of logic. This removes an entire class of otherwise necessary automation rules. You establish connections on the <a class="demolink" href="">Connections</a> page in **Setup &amp; Maintenance**.

You will find all Things arranged in the first column, labeled with "Source", in a two column table. You find action buttons to the right of the Things. Click on the "Add Target" action and select a target Thing from the drop down list.

{{< details type="warning">}}
{{< advanced >}} It can be tedious to connect hundreds of wall switches to hundreds of light sources. Because connection configuration can also take place in text mode, it is possible to connect a large quantity of Things by a script generated yaml or json file.
{{< /details >}}

## Data Flow

{{< img src="/img/doc/thing-connection.svg" >}}

A Thing consists of multiple properties. A coloured light bulb Thing for example at least has an on/off, a brightness and a color property. Additional vendor specific properties like a white-light temperature, or an animation-mode property might be present.

By default you connects two *Things* together via the interface. Internally this boils down to a pair of properties that are linked. openHAB X intelligently selects the correct properties based on the [semantic context](/userguide/tags) of *Things* and their properties.

For example if you connect a wall-switch with an on/off property to a light bulb, openHAB X will select the on/off property of the light bulb Thing. If you connect a wall-dimmer unit with a percentage property, openHAB X will select the brightness property of the light bulb Thing. And for the case of a color wheel unit, openHAB X selects the color property.

Primary Properties
: Now imagine a two-gang wall-switch. If there are multiple properties with the same semantic context, in this case two on/off properties, an addon developer must define a "primary" property.

Connect Properties, not *Things*
: How do you connect the second switch of such a wall-switch then? This is when you want to click on the "Show Properties" action. The various properties are shown and you see connection links drawn from source properties to target properties, instead of from *Thing* to *Thing*. You can now connect properties directly. For example the 2nd on/off property of a two-gang wall-switch with the on/off property of a light bulb *Thing*.

Property Compatibility
: Not all property types are compatible to each other. It doesn't make sense for a video-stream property of a camera *Thing* to be connected to the brightness property of a light bulb Thing. Even if the value type matches, like a number type of a temperature sensor and the mentioned brightness property, a link will not make much sense.

openHAB X uses a compatibility table, based on property types (number, string, boolean, binary-data) and semantic context of a property and will draw non-matching connection links as dotted, red lines instead of solid, black ones.

You may wonder, why OHX still let you link up incompatible properties. The reason is, that a link can transform an input value (say "23°C temperature") to an output value ("on/off: on"). Such a transformation is performed by a so called "Link Processor".

## Link Processors

Imagine you want to turn a wall-switch and have the ceiling lights to gradually fade to 100% or to 0%.
This is what link processors are there for.
A link processor takes an input, and produces an immediate or delayed output or even a stream of outputs like for a fading animation.

{{< img src="/img/doc/thing-connection-link-processor.svg" >}}

You add a link processor by clicking on a link and select a processor from the drop down menu. You remove a processor by clicking the "x" icon and confirm.

You can have more than one link processor on one connection link.
This allows more complex processing, like adding a delay plus playing a fade animation.

{{< details type="warning">}}
{{< advanced >}} Each created link processor has a unique id (uid), that is also shown in the user interface. Via this **uid**, you can stop a link processor from doing whatever it is doing from within rules. A rule can also be triggered by a link processor that got an input or produced an output.
{{< /details >}}

The following link processors are available.

Delay
: Delays the input by the configured time before it is handed to the output.

Toogle
: Takes any input propery and produces an on/off output that toggles each time the input property changes. By default on system start, if not configured otherwise, this link processor is initialized with "off" so the next value it will produce is "on".

OnChange
: The output value can be configured for this link processor. It will output that value whenever the input property changes.

Dimmer
: Takes an on/off, boolean or percentage input and will produce multiple percentage outputs, fading from the current destination value to the input value. The animation time and animation steps can be configured. This link processor stops and starts again with the new value if the input changes during the animation.

RuleFilter
: Only passes the input to the output if the given rule would execute, eg if all rule conditions evaluate to true. You can for example use a rule that has a time condition and would only execute after 6pm. Assign a *RuleFilter* link processor, with that rule configured, to a motion detection sensors and light Thing connection. Now your light is only turned on by the motion sensor after 6pm.
