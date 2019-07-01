+++
title = "Making It Smart: Rule engine"
author = "David Graeff"
weight = 110
tags = ["rules"]
+++

This chapter introduces you to to openHAB X Rules. A Rule, in contrast to a Flow or Flow Graph follows a strict Trigger-Condition-Action schema. Control flow options like if-then-else are not supported.

OHX Rules share this "limitation", on purpose.
Rules do not have the goal to replace complex, control flow driven scripts and are defined in a declarative way. This allows to offer an easy to grasp, graphical Rule Editor and Rule sharing. The provided means, explained throuout this chapter, still allow for powerful, expressive rules.

You can list, create and modify Rules on the <a href="" class="demolink">Rules</a> page.

Rule Purpose
: In most cases you are covered with [*Channel Links*](/userguide/linkchannels). If you only want to interconnect devices from different vendors, you will not even need to use Rules. Chose the right tool for the right task! 

Examples for Rules are:

* Switch off a specific light bulb, 5 minutes after it has been switched on. But only if no motion sensor movement has been registered.
* Turn on the garden sprinkler every day at 7 in the morning in the months from May-Oct. Turn it off after 10 mins if the last 3 days had a mid-day temperature above 30°C otherwise after 5 mins.

Non-Rules are:

* A complex trigger like "If a USB device from 'Tamahachi' has been connected". This should be implemented as an Addon instead. Addons can be written in a multitude of languages, also script languages like Javascript, check out the [developer page](/developer/addons). 
* "Turn on all hallway lights". Create a [*Group*](/userguide/linkchannels#groups) instead.
* 

Efficieny
: The rule engine is fast and low on memory. 10000 rule executions a second is not an issue; talking about the Raspberry Pi Zero with 1 Ghz single core processor only. You can tune the engine to your needs, configuring the rules executed in parallel (default is 5), default maximum run-time (default: 5 minutes).

Security
: All rules are executed in the same process. A malicous Rule Module () The engine and available rule modules are not extendable via addons, but ony by reviewed code contributions to the source code repository.

## A Rule

A Rule consists of a **Name**, a unique **ID** and optional **Triggers**, **Conditions** and **Actions**.
    Rules are the fundament for *Scenes* and *Time based actions*.

<img class="tutimage" src="/img/doc/rules.png">




<section class="card border-success p-3 mb-2">
    <h5>Triggers</h5>
    
    Defines the events when the Rule will trigger.
    Triggers may have Outputs. You can connect those to Inputs of Conditions and Actions.
    
</section>

<details class="mb-4">
    <summary>Some triggers are part of the core installation</summary>
    <table class="table table-striped table-bordered" style="width: initial">
    <thead>
        <tr>
        <th>Trigger Type</th>
        <th>What it does</th>
        </tr>
    </thead>
    <tbody>
        <tr>
        <td>A trigger channel fires</td>
        <td>Triggers a Rule when a Channel trigger fires such as is used in the Dash Button binding or
            Astro binding for astronomical events. Both the Channel and the event can be defined.</td>
        </tr>
        <tr>
        <td>An item state changes</td>
        <td>Triggers the Rule when the
            selected Item changes state. One can optionally define the previous state and new state.</td>
        </tr>
        <tr>
        <td>An item receives a command</td>
        <td>Triggers the Rule when
            the selected Item receives a command. One can optionally define the command received.</td>
        </tr>
        <tr>
        <td>An item state is updated</td>
        <td>Triggers the Rule when the
            selected Item receives an update. One can optionally define the update received.</td>
        </tr>
        <tr>
        <td>It is a fixed time of day</td>
        <td>Sets the Rule to trigger at a specific time of day every day.</td>
        </tr>
        <tr>
        <td>The rule is activated</td>
        <td>Triggers when a rule is activated the first time. This causes the Rule to trigger when it is
            first loaded by OH.</strong></td>
        </tr>
    </tbody>
    </table>
</details>

<section class="card border-info p-3 mb-2">
    <h5>Conditions</h5>
    
    Defines the conditions under which the Rule will run when triggered.
    If you define more than one condition, all conditions have to pass.
    
</section>

<details class="mb-4">
    <summary>Some conditions are part of the core installation</summary>
    <table class="table table-striped table-bordered" style="width: initial">
    <thead>
        <tr>
        <th>Condition Type</th>
        <th>What it does</th>
        </tr>
    </thead>
    <tbody>
        <tr>
        <td>An item has a given state</td>
        <td>Select the Item, comparison operator, and the value to compare against. For example,
            MyTemperature Item &gt;= (is greater or equal to) 20.</td>
        </tr>
        <tr>
        <td>A given script* evaluates to true</td>
        <td>A script to execute whose last line evaluates true or false. If the that line is true, the rule
            will be allowed to run (assuming all the other defined conditions are also true). Currently
            only JavaScript is supported. Everything available to the Action Script is available here as
            well. The Script just needs to return true or false.</td>
        </tr>
        <tr>
        <td>It is a certain day of the week</td>
        <td>Allows one to select the day of the week that it must be for the Rule to run. This combined
            with “it is a fixed time of day” allows one to write Rules that trigger at a certain time on
            certain days.</td>
        </tr>
    </tbody>
    </table>
</details>

<section class="card border-danger p-3 mb-2">
    <h5>Actions</h5>
    
    Defines what actions the Rule takes when it runs.
    Actions are performed in the order they are listed in the *Rule*.
    Actions may have Outputs. You can connect those to Inputs of other Actions, that are executed later in the
    execution order.
    
</section>

<details class="mb-4">
    <summary>Some actions are part of the core installation</summary>
    <table class="table table-striped table-bordered" style="width: initial">
    <thead>
        <tr>
        <th>Action Type</th>
        <th>What it does</th>
        </tr>
    </thead>
    <tbody>
        <tr>
        <td>Send a command</td>
        <td>Allows one to send a command to an Item when the Rule runs. This can be very useful for
            creating links between proxy Items and device Items.</td>
        </tr>
        <tr>
        <td>Run rules</td>
        <td>Allows the triggering of other Rule(s) to run when this Rule triggers.</td>
        </tr>
        <tr>
        <td>Enables or disable rules</td>
        <td>Enable or disable Rule(s). This is useful to create “away
            mode” type Rule sets as they can be enabled/disabled based on events.</td>
        </tr>
        <tr>
        <td>Execute a given script*</td>
        <td>Define a *Script* to execute when the Rule runs.</td>
        </tr>
        <tr>
        <td>Play a sound</td>
        <td>Send a sound to the selected audio sink.</td>
        </tr>
        <tr>
        <td>Say something</td>
        <td>Send Text-to-speech to the selected audio sink. The text is statically defined but you can
            generate dynamic text in a script.</td>
        </tr>
    </tbody>
    </table>
</details>

## Rule Templates

Because of the strict schema, Rules turn out to be more generic.
A rule that contains *Placeholders* instead of fixed values is called a **Rule Template**. The editor allows to create, modify and share *Rule Templates* with the community. Install **Rule Templates** via this website or find them in the "Rule Templates" sub-page of  <a class="demolink" href="">Rules</a>.

## Nesting Rules

An *Action* is a *Rule* itself and can carry own *Conditions* and own child *Actions*.
Child actions are only executed if the conditions match, like with a top level rule.

This way you can implement control flow ("if warmer than 30° today turn on havoc at 7 otherwise at 9" ).

In the graphical Rule Editor you click on the **Edit Children** link

## Scripts in Rules

With *Rules*, [*IO Service Filters*](/userguide/control) and [*Channel Links*](/userguide/linkchannels) you can handle about 98% of your automation
    needs. Very advanced, unusual or complex scenarios might require a scripted solution though.


A *Script* is more powerful, but also harder to edit, maintain and process for openHAB.
    Multiple programming languages are supported: Jython (Python 2.6 dialect), JavaScript, or Groovy (Java dialect).

Many rules can run in parallel, but only a single instance per each rule is allowed by default.
You may change that for a specific rule by toggling the "Single Instance" switch to off.

If a rule is triggered again, a previous already running instance is stopped first.
