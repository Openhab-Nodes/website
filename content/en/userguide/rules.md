+++
title = "Making It Smart: Rule engine"
author = "David Graeff"
weight = 110
tags = ["rules"]
+++

This chapter introduces you into the concepts of openHAB X Rules, its limitations and its extensibility via Scripts.

Rules do not have the goal to replace complex, control flow driven scripts and are defined in a declarative way. This allows to offer an easy to grasp, graphical Rule Editor and Rule sharing.
That's why you will not find a step-by-step "how to create a Rule" guide in this chapter.
It's really self-explanatory, but the <a href="" class="demolink">Rules</a> page also includes context help and assistants for most steps.

Rule Purpose
: In most cases you are covered with [*Thing Connections*](/userguide/thing_connections). If you only want to interconnect devices from different vendors, you will not even need to use Rules. Chose the right tool for the right task! 

Examples for Rules are:

* Switch off a specific light bulb, 5 minutes after it has been switched on. But only if no motion sensor movement has been registered.
* Turn on the garden sprinkler every day at 7 in the morning in the months from May-Oct. Turn it off after 10 mins if the last 3 days had a mid-day temperature above 30°C otherwise after 5 mins.

The next section talks about Non-Rules and how you would realize certain scenarios in openHAB X in the idiomatic way.

## Non-Rules

If your rules reads like "Turn on all hallway lights", the easier and more ideomatic approch is to use [*Group*](/userguide/groups). If you don't want those groups to appear in user-interfaces, just tag them as "no-ui" or similar and make use of [*State Filters*](/userguide/thing_connections).

A very hardware or service specific trigger or condition like "If a USB device from 'Tamahachi' has been connected" is a candidate for an Addon. Just expose a **Thing** and act on that *Things* state. Addons can be written in a multitude of languages, also script languages like Javascript, check out the [developer page](/developer/addons). 

If you think of an English sentence equivalent of your rule and it contains a lot of "ifs" and "else" and "repeats", it might make sentence to write a scripted solution instead. Find details in the [Scripts Section](#scripts) of this chapter.

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
        <td>An event fires</td>
        <td>Triggers a Rule when a Thing Event fires.</td>
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
    If you define more than one condition, all conditions have to be met.
    
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
{{<md>}}
Defines what actions the Rule takes when it runs.
Actions are performed in the order they are listed in the *Rule*.

Actions may have Outputs.You can connect those to Inputs of other Actions, that are executed later in the execution order.
{{</md>}}
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

### Text Mode

It is sometimes easier for Copy&amp;Paste purposes or Search&amp;Replace to use the text mode instead of the graphical one.

A Rule is declared like in the following code snippet.
All futher keys, triggers, conditions, actions are subsidiary to the ID which is `switch_off_after_5_min` in this case.

{{< code-toggle file="rule_example" class="code-toggle-limited" >}}
switch_off_after_5_min:
  title: Switch off after 5 Minutes
  tags: # optional
    - auto_off_rule 
  triggers:
     -  _id: on_state_change
        type: propertychange
        source: my_light.brightness
        equals: "ON"
  actions:
     -  _id: a_delay_action
        type: "delay"
        delay_in_sec: 360
     -  _id: turn_off
        type: propertycommand
        target: my_light.brightness
        command: "OFF"
{{< /code-toggle >}}

There are no `conditions` in this example. `triggers`, `conditions` and `actions` are lists and each item is defined by a rule unique ID like `_id: on_state_change`.

The *type* is unique across the entire rule engine and references the *Rule Module* that should be excuted or used. For `on_state_change` that would be the `type: propertychange` trigger module.

You best explore rules via the graphical editor first and study the generated declarative text later on.

## Rule Templates

Because of the strict schema, Rules turn out to be quite generic.
A rule that contains *Placeholders* instead of fixed values is called a **Rule Template**.

{{< mermaid align="left" context="rule_template">}}
graph LR;
  trigger("<b>Trigger</b>: Sunrise")
  condition("<b>Condition</b>: Month is between May-Oct")
  action("<b>Action</b>: PLACEHOLDER")

  trigger --> condition
  condition --> action
{{< /mermaid >}}

The editor allows to create, modify and share *Rule Templates* with the community. Install **Rule Templates** via this website or find them in the "Rule Templates" sub-page of  <a class="demolink" href="">Rules</a>.

## Nesting Rules

An *Action* is a *Rule* itself and can carry own *Conditions* and own child *Actions*.
Child actions are only executed if the conditions match, like with a top level rule.

This way you can implement control flow ("if warmer than 30°C today turn on havoc at max level otherwise use medium for >= 25°C" ).

{{< mermaid maxwidth="100%" context="rules_nesting">}}
graph LR;
  trigger("<b>Trigger</b>: At 7 am")
  condition("<b>Condition</b>: Weather Forecast says > 25°C")
  havoc_med("<b>Action</b>: Havoc Medium")
  subgraph Action: Havoc Max
  condition_30("<b>Condition</b>: Weather Forecast says > 30°C")
  end

  trigger --> havoc_med
  havoc_med --> condition_30
{{< /mermaid >}}


In the graphical Rule Editor you click on the **Edit Children** link.

## Single Instance by Default

The engine allows up to 5 rules to be executed in parallel* (can be configured), but only a single instance per each rule. If an already running rule is triggered again, the previous instance is stopped first.

This limitation is helping to reason about how many and what rules are running at the same time.
Usually it is sufficient to use [*Thing Connections*](/userguide/thing_connections)
if you want multiple, same-like actions to happen for instance to animate a different light with a different wall-switch each.

{{< mermaid align="left" context="rules_instance">}}
graph LR;
  switch1("Wall-Switch p¹")
  switch2("Wall-Switch p²")
  propertylink("Thing Link Processer<div><small>Gradually animate</small></div>")
  light1("Light L¹")
  light2("Light L²")

  switch1 -->|"p¹: On/Off"| propertylink
  propertylink -->|"p¹: dim"| light1
  switch2 -->|"p²: On/Off"| propertylink
  propertylink -->|"p²: dim"| light2
{{< /mermaid >}}

{{< callout type="info" title="*Parallel Running" >}}
This needs clearification. A "sleeping" as in "delayed" rule does not count towards the limit. Scheduled rules do not count. This is really just the rules that are executing like in doing stuff at the same time. An example could be a rule that uploads a file.
{{< /callout >}}

## Scripts

With *Rules*, [*State Filters*](/userguide/control) and [*Thing Connections*](/userguide/thing_connections) you can handle about 98% of your automation needs. Very advanced, unusual or complex scenarios with plenty of control flow might require a scripted solution.

The script language of openHAB X is [Javascript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) and the specific version that is supported is ECMAScript Draft 2020.

External Libraries
: You can use javascript libraries, as long as those do not expect a browser specific API to be present (like `window` and `DOM` APIs) and use the official javascript module import syntax (as opposed to Nodejs `require` imports). Look out for ES6-Module libraries.

Logging
: Scripts are bit harder to edit, because you will find out about errors only at runtime. Script errors and script logs are to be found in the *Rule Engines* log.

Performance
: Scripts can only be executed ("triggered") as part of a *Rule* and require you to specify a maximum execution duration. They are not loaded at start-up. This means that the first time a script is referenced, it will take a bit longer to execute because it needs to be fetched from the configuration storage and needs to be parsed. Scripts are cached in memory though for future executions.

You learn best on how to use scripts, by looking at the examples in https://github.com/openhab-nodes/core/ruleengine/examples.

