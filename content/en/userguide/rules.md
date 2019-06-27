+++
title = "Making It Smart: Rule engine"
author = "David Graeff"
weight = 110
tags = ["rules"]
+++

A Rule consists of a **Name**, a unique **ID** and optional **Triggers**, **Conditions** and **Actions**.
    Rules are the fundament for *Scenes* and *Time based actions*.

<img class="tutimage" src="img/tutorial/rules.png">

A binding or service, installed via the *Add-ons* screen, might add more Triggers, Conditions or Actions
    to the table.

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

You can list, create and modify Rules on the <a href="" class="demolink">Rules</a> page.

<h4>Scripts in Rules</h4>

With *Rules*, *Profiles* and *Transformations* you can handle about 98% of your automation
    needs. Very advanced, unusual or complex scenarios might require a scripted solution though.


A *Script* is more powerful, but also harder to edit, maintain and process for openHAB.
    Multiple programming languages are supported: Jython (Python 2.6 dialect), JavaScript, or Groovy (Java dialect).

Many rules can run in parallel, but only a single instance per each rule is allowed by default.
You may change that for a specific rule by toggling the "Single Instance" switch to off.

If a rule is triggered again, a previous already running instance is stopped first.

## Rule Limitations

Some people may find it weird to start with limitations. It is absolutely necessary though that you understand what **Rules** mean in openHAB X.

Rules follow a very strict Trigger-Condition-Action schema.