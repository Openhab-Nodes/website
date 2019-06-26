+++
title = "Administer your System"
author = "David Graeff"
weight = 20
tags = ["administration","users"]
+++

## Create User Accounts

## Disk Space and System Resources

## Updates

## Configuration Via Forms &amp; Textual

{{< colpic >}}
<div style="max-weight:250px">
<img src="/img/doc/form_based_input.png" class="w-100">
A Form based input guides you through inputs, but doesn't allow for Copy &amp; Paste or Find &amp; Replace.
</div>

<split>

All configurations (including Service-, and Thing configuration, Rules, Scheduled Events, Scenes) can be performed via the **Setup & Maintenance** user interface via Forms as well as textual.

Throughout this guide you will only encounter the textual representation for given examples, in all supported input formats though.

<div>
<tab-container>
	<tab-header>
		<tab-header-item class="tab-active">YAML</tab-header-item>
		<tab-header-item>TOML</tab-header-item>
		<tab-header-item>JSon</tab-header-item>
	</tab-header>
	<tab-body>
		<tab-body-item>
        </tab-body-item>
		<tab-body-item>
        </tab-body-item>
		<tab-body-item>
        </tab-body-item>
	</tab-body>
</tab-container>
</div>

You might be familiar with one of these formats. If not, YAML will serve you well. A brief introduction is given in the next section.
{{< /colpic >}}

### The YAML Format

You find the full specification at https://yaml.org/spec/1.2/spec.html.
The basics are simple.

Key-Value assignment
: {{< highlight yaml >}}
my_config_key: "my_value"
{{< /highlight >}}

Values can be Strings (Text) and Numbers with the dot "." as decimal separator (eg `12.54`).

Complex object with many key-value assignments
:  {{< highlight yaml >}}
important_service:
    my_config_key: "my_value"
    my_config_key2: 12.45
{{< /highlight >}}

A list
:  {{< highlight yaml >}}
favourite_colors:
    - first_item
    - second_item
{{< /highlight >}}
