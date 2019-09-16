+++
title = "Tags"
author = "David Graeff"
weight = 42
tags = ["tags"]
+++

OHX uses the [Brick schema](https://brickschema.org/) to add semantic context to Things via a defined set of *Tags*. Such a context consists of one or more location, equipment and property tags. For example "Garden, MotionDetector, Battery, Current" for the battery current of the garden motion sensor.

What is a semantic context used for?

* It helps user interfaces to choose a more approriate widget for rendering. A percentage value without any context for example could be a light bulb or a rollershutter.
* When you ask for all sensor readings of a room, the natural language processor takes semantic tags into account.
* [Connections](/userguide/thing_connections) between Things need to select source and destination Thing Properties. This selection is also based on the semantic context. For example a wall-switch that is connected to a Hifi Amplifier Thing with an on/off property for power and an on/off property for volume-mute. A wall-switch Thing will prefer a power property and that is also what the average user expects to happen.

Addon developers will usually pre-tag *Things*. For your specific needs you can however change any predefined tag.

{{< img src="/img/doc/semantic_tags.jpg" maxwidth="100%" >}}

## Location Tags

Choose any of the following location tags. You can of course use different location tags as well, but only the following will be internationalized and mapped to natural language processing capabilities.

There is a hierachical concept behind tags. A "Garage" is for example always also a "Building".


| Location Tag | Parent   | Label        | Synonyms                   | Description                               |
|--------------|----------|--------------|----------------------------|-------------------------------------------|
| Indoor       |          | Indoor       |                            | Anything that is inside a closed building |
| Building     | Indoor   | Building     | Buildings                  |                                           |
| Garage       | Building | Garage       | Garages                    |                                           |
| Floor        | Indoor   | Floor        | Floors                     |                                           |
| GroundFloor  | Floor    | Ground Floor | Ground Floors, Downstairs  |                                           |
| FirstFloor   | Floor    | First Floor  | First Floors, Upstairs     |                                           |
| Attic        | Floor    | Attic        | Attics                     |                                           |
| Basement     | Floor    | Basement     | Basements, Cellar, Cellars |                                           |
| Corridor     | Indoor   | Corridor     | Corridors                  |                                           |
| Room         | Indoor   | Room         | Rooms                      |                                           |
| Bedroom      | Room     | Bedroom      | Bedrooms                   |                                           |
| Kitchen      | Room     | Kitchen      | Kitchens                   |                                           |
| Bathroom     | Room     | Bathroom     | Bathrooms, Bath, Baths     |                                           |
| LivingRoom   | Room     | Living Room  | Living Rooms               |                                           |
| Outdoor      |          | Outdoor      |                            |                                           |
| Garden       | Outdoor  | Garden       | Gardens                    |                                           |
| Terrace      | Outdoor  | Terrace      | Terraces, Deck, Decks      |                                           |
| Carport      | Outdoor  | Carport      | Carports                   |                                           |

## Equipment Tags

A binding author may not know the purpose of a switch or relais Thing. That is when you tag the Thing yourself with an equipment type tag.

| Equipment Tag    | Parent | Label             | Synonyms                                                                          |
|------------------|--------|-------------------|-----------------------------------------------------------------------------------|
| Battery          |        | Battery           | Batteries                                                                         |
| Blinds           |        | Blinds            | Rollershutter, Rollershutters, Roller shutter, Roller shutters, Shutter, Shutters |
| Camera           |        | Camera            | Cameras                                                                           |
| Car              |        | Car               | Cars                                                                              |
| CleaningRobot    |        | Cleaning Robot    | Cleaning Robots, Vacuum robot, Vacuum robots                                      |
| Door             |        | Door              | Doors                                                                             |
| FrontDoor        | Door   | Front Door        | Front Doors, Frontdoor, Frontdoors                                                |
| GarageDoor       | Door   | Garage Door       | Garage Doors                                                                      |
| HVAC             |        | HVAC              | Heating, Ventilation, Air Conditioning, A/C, A/Cs, AC                             |
| Inverter         |        | Inverter          | Inverters                                                                         |
| LawnMower        |        | Lawn Mower        | Lawn Mowers                                                                       |
| Lightbulb        |        | Lightbulb         | Lightbulbs, Bulb, Bulbs, Lamp, Lamps, Lights, Lighting                            |
| Lock             |        | Lock              | Locks                                                                             |
| MotionDetector   |        | Motion Detector   | Motion Detectors, Motion sensor, Motion sensors                                   |
| NetworkAppliance |        | Network Appliance | Network Appliances                                                                |
| PowerOutlet      |        | Power Outlet      | Power Outlets, Outlet, Outlets                                                    |
| Projector        |        | Projector         | Projectors, Beamer, Beamers                                                       |
| RadiatorControl  |        | Radiator Control  | Radiator Controls, Radiator, Radiators                                            |
| Receiver         |        | Receiver          | Receivers, Audio Receiver, Audio Receivers, AV Receiver, AV Receivers             |
| RemoteControl    |        | Remote Control    | Remote Controls                                                                   |
| Screen           |        | Screen            | Screens, Television, Televisions, TV, TVs                                         |
| Siren            |        | Siren             | Sirens                                                                            |
| SmokeDetector    |        | Smoke Detector    | Smoke Detectors                                                                   |
| Speaker          |        | Speaker           | Speakers                                                                          |
| Valve            |        | Valve             | Valves                                                                            |
| WallSwitch       |        | Wall Switch       | Wall Switches                                                                     |
| WebService       |        | Web Service       | Web Services                                                                      |
| Window           |        | Window            | Windows                                                                           |
| WhiteGood        |        | White Good        | White Goods                                                                       |
## Property Tags

Especially for the natural language processing it helps to tag a Thing with any of the matching, available property tags. This is usually done by a binding author though.

| Property Tag     | Label             | Synonyms         |
|------------------|-------------------|------------------|
| Temperature      | Temperature       | Temperatures     |
| Light            | Light             | Lights, Lighting |
| ColorTemperature | Color Temperature |                  |
| Humidity         | Humidity          | Moisture         |
| Presence         | Presence          |                  |
| Pressure         | Pressure          |                  |
| Smoke            | Smoke             |                  |
| Noise            | Noise             |                  |
| Rain             | Rain              |                  |
| Wind             | Wind              |                  |
| Water            | Water             |                  |
| CO2              | CO2               | Carbon Dioxide   |
| CO               | CO                | Carbon Monoxide  |
| Energy           | Energy            |                  |
| Power            | Power             |                  |
| Voltage          | Voltage           |                  |
| Current          | Current           |                  |
| Frequency        | Frequency         |                  |
| Gas              | Gas               |                  |
| SoundVolume      | Sound Volume      |                  |
| Oil              | Oil               |                  |