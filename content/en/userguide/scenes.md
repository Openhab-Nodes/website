+++
title = "Scenes"
author = "David Graeff"
weight = 90
tags = ["scene"]
+++

{{< colpic ratio="30" left="pb-3" >}}

<img src="/img/doc/living-scene.png" class="w-100 pt-3" style="transform: perspective(602px) rotateY(16deg);box-shadow: -5px 8px 8px 0 rgba(0,0,0,0.15);">

<split>

A scene is a collection of selected **Thing Property** states.

When you execute a *Scene*, all affected *Properties* will be restored to the stored state.

{{< callout type="info" >}}
#### Motivation
A "Cooking" scene turns on all
your kitchen lights to a dimmed value of 70% except
the serving cabinet which is on full brightness. The kitchen radio is tuned in to your favorite jazz channel on a moderate volume.
{{< /callout >}}

{{< /colpic >}}

## Create a Scene

To create a *Scene* you first bring your *Things* into the desired state (correct color, brightness, volume, etc).

{{< col3md >}}

#### Hue App

Create a *Scene* via the Scene screen.

<split>

#### openHAB X App

Slide in the left navigation menu and choose "Create Scene".

<split>

#### Setup &amp; Maintenance

Head over to the <a class="demolink" href="">Scenes</a> page and create a new Scene.
This interface also allows to enter and edit a Scene in text form.

{{< /col3md >}}

In all cases you need to select the Thing Properties that should be part of the new *Scene*.

## Run a Scene
{{< colpic ratio="70" >}}

Scenes will appear in control interfaces, like the Hue App, openHAB X App, openHAB X Dashboard and also in the Setup &amp; Maintenance interface.

All interfaces offer to run a Scene, some might offer to edit the Scene.

<split>

<img src="/img/doc/basicui-scene-run.png" class="w-100 pt-3" style="transform: perspective(602px) rotateY(-16deg);box-shadow: -5px 8px 8px 0 rgba(0,0,0,0.15);">

{{< /colpic >}}

## The Inners of a Scene

Scenes are implemented as **Rules**. You will get to know rules in a later chapter in detail. What you need to know is that a Rule consists of *Triggers*, *Conditions* and *Actions*. A *Scene* only contains *Actions* and is marked or tagged as `scene`.

That's why you can alter and delete scenes from within the <a class="demolink" href="">Rules</a> page as well.

*Rules* and therefore also *Scenes* are classified as *Configuration* and thus considered for the backup service and are part of the configuration snapshots concept.

A *Scene* in text form (enter via the Setup &amp; Maintenance interface) would look like this:

{{< code-toggle file="switch_off_after_5_min">}}
my_kitchen_scene:
  title: Cooking
  description: Lights to 70%, serving cabinet 100%, radion on
  tags:
    - scene
  actions:
     kitchen_lights_dimmed:
        type: tagscommand # Send a command to all "kitchenlight" tagged Things
        target: kitchenlight
        command: 70
     serving_cabinet_full:
        type: propertycommand
        target: kitchen_serving_cabinet
        command: 100
{{< /code-toggle >}}
