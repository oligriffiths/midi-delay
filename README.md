# MIDI Delay Module

This is a very simple node terminal application that takes an input MIDI device name, and delays `noteoff`
(and `noteon velocity=0`) messages by a provided number of milliseconds (100ms default).

To use, simply:

`npm install` or `yarn`

Then:

`node index.js -l` to list your connected midi devices, e.g.:

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

Now, press a MIDI note
