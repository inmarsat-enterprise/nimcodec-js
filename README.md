# Non-IP Modem Codecs for Node.JS

A Node.JS library for decoding and encoding efficient binary blob messages
for Non-IP Modem data transport over constrained satellite networks.

## NIMO

Non-IP Modem for ORBCOMM protocols is derived from a proprietary codec key file
described by XML or JSON. The principle is the first 2 payload bytes comprise
a message key describing *services* (aka SIN) made up of *messages* (aka MIN).
Messages are defined for both *uplink* (aka Mobile-Originated) and *downlink*
(aka Mobile-Terminated) operations.

Using this approach we can define up to 256 **Service**(s) each with up to
256 **Message**(s) in each direction of communication. The intent is that each
micro-service encapsulates a set of related remote operations, and the messages
represent the individual downlink (command/query) or uplink (response/report)
operations.

> [!NOTE]
> When using actual ORBCOMM-protocol based modems (IDP/OGx service) SIN 0-15 are
reserved for system use, and SIN 16-127 are pseudo-reserved for ORBCOMM Lua apps.

> [!TIP]
> The key feature of *NIMO* messages is that data field boundaries do not need to
align with byte boundaries.

Each **`message`** is defined by a set of attributes:
* **`name`** should be unique to the direction in the service
* **`messageKey`** (aka `MIN`) *must* be unique to the direction in the service
* **`description`** is optional
* **`fields`** Defines a set of ordered data types in the message payload,
where each field includes attributes:
    * **`name`** must be unique within `fields`
    * **`description`** is optional to provide additional context
    * **`type`** must be one of the supported data types:
        * `bool` are 1-bit values
        * `enum` define a set number of bits to index discrete *string* values
        * `int` define a set number of bits for signed integer (MSB sign)
        * `uint` define a set number of bits for unsigned integer
        * `string` define a set or maximum number of ASCII character bytes
        * `data` define a set or maximum number of bytes
        * `array` define a set or maximum number of nested child *fields*
        * `bitmasklist` define a set number of bits to index array *fields*
    * **`size`** is used for types: `enum`, `int`, `uint` to represent the
    number of bits of payload used. It repesents the maximum number of bytes
    of payload used for `string` or `data`. It represents the maximum number
    of fields used for `array` or `bitmasklist`. It is not used for `bool`.
    * **`items`** is a list required for `enum` or `bitmasklist` types.
    * **`fields`** is a list required for `array` and `bitmasklist` types,
    defining nested fields.
    * **`optional`** *optional* for any type flags the field as being present
    or not, and consumes 1 bit of payload to indicate presence.
    * **`fixed`** *optional* for variable length fields string, data, array
    to reserve/pad the maximum data length to a specific payload size.

The XML format was historically uploaded to the Viasat/Inmarsat or
ORBCOMM/SkyWave web service API gateways, typically with extension `*.idpmsg`.
Some field types may not be supported on some gateways.

The JSON format provides a condensed version and supports an extended set of
field types. The codec library is intended to prefer JSON representation for
processing external to the service provider API gateways.
