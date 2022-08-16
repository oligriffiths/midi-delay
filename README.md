# MIDI Delay Module

This is a very simple node terminal application that takes an input MIDI device name, and delays `noteoff`
(and `noteon velocity=0`) messages by a provided number of milliseconds (100ms default).
This is necessary for MIDI devices that send the `noteoff` message in quick succession to the `noteon` message,
as is the case with most MIDI drum kits. The intention of the delay is to allow other software listening for these
messages to have time to react (e.g. lighting software to flash a light when a drum head is hit).

## Setup

`npm install` or `yarn`

## Usage

```
Usage: index [options]

Options:
  -l, --list            List all the connected MIDI devices
  -i, --input <char>    The input MIDI device name
  -o, --output <char>   The virtual output MIDI device name. Defaults to [INPUT]-delayed.
  -d, --delay <number>  How long in ms to delay the midi noteoff signal (default: 100)
  -w, --wait <number>   How long in ms to wait between each connection attempt to the midi input (default: 1000)
  -db, --debounce       Debounce noteon so that a 2nd noteon message that is received before a delayed noteoff is sent, gets ignored.
  -v, --verbose         Log MIDI messages to the screen
  -h, --help            display help for command
```

For example: `node index.js -l` to list your connected midi devices, e.g.:

```
Available MIDI devices...
 - IAC Driver Bus 1
 - IAC Driver Bus 2
 - IAC Driver Bus 3
 - IAC Driver Bus 4
 - Alesis Turbo
 ```

Once you find your device name, copy the device name and run:

`node index.js -i "Alesis Turbo" -v` and you should get:

```
Connecting to Alesis Turbo
Connected
Setting up virtual MIDI output: Alesis Turbo-delayed
Connected
```

This sets up a virtual MIDI output device with the input device name and `-delayed` appended.

You can set a custom output device name with `--output|-o`.

Now, press a MIDI note, and you should see:

```
2022-08-16T21:09:51.286Z noteon { channel: 9, note: 48, velocity: 54, _type: 'noteon' }
2022-08-16T21:09:51.408Z noteon { channel: 9, note: 48, velocity: 0, _type: 'noteon' }
```

Note that the 2nd `noteon` (or `noteoff`) will be delayed by at least the delay time (default 100ms).

## Debounce

The way this works is very simple, an event handler is setup to respond to `noteon` and `noteoff` events.
When a `noteon` event is received it is immediate transmitted back to the output device.
When a `noteoff` (or `noteon velocity=0`) event is received, it is delayed by `--delay` (default 100) milliseconds
before being sent to the output device. The MIDI payload is sent exactly as it is received.

If a subsequent `noteon` even is received before the delayed `noteoff` event is sent, the delay timer is reset and the `noteoff`
event is sent `--delay` milliseconds after the subsequent `noteon` event is received.

Alternatively, if `--debounce` flag is provided, any subsequent `noteon` events received whilst there is a pending `noteoff`
event waiting to be sent are ignored.

## Thanks

Thanks for checking this library out, I hope it's useful to someone. I personally use it to delay the `noteoff` events
from a MIDI drum kit to trigger effects on a lighting console so that each drum head corresponds to a different light
being illuminated when hit.
