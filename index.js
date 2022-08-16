const midi = require('easymidi');
const { program } = require('commander');

program
  .option('-l, --list', 'List all the connected MIDI devices')
  .option('-i, --input <char>', 'The input MIDI device name')
  .option('-o, --output <char>', 'The virtual output MIDI device name. Defaults to [INPUT]-delayed.')
  .option('-d, --delay <number>', 'How long in ms to delay the midi noteoff signal', 100)
  .option('-w, --wait <number>', 'How long in ms to wait between each connection attempt to the midi input', 1000)
  .option('-db, --debounce', 'Debounce noteon so that a 2nd noteon message that is received before a delayed noteoff is sent, gets ignored.')
  .option('-v, --verbose', 'Log MIDI messages to the screen');

program.parse();

/**
 * Attempt to connect to the provided MIDI device name, resolve when connected.
 * Automatically retries every {wait} ms.
 *
 * @param {string} midiName The MIDI device name to connect to
 * @param {number} wait The number of milliseconds to wait before reconnect. If wait is 0, an exception is thrown on failure.
 * @returns {Promise<midi.Input>}
 */
const attemptConnect = async (midiName, wait) => {
  return new Promise(resolve => {
    const handler = () => {
      try {
        resolve(new midi.Input(midiName));
      } catch (e) {
        if (!wait) {
          throw e;
        }

        setTimeout(handler, wait);
      }
    };

    handler();
  });
};

// Main program loop
(async () => {
  const options = program.opts();

  // List outputs the midi device names
  if (options.list) {
    const devices = midi.getInputs();
    console.log('Available MIDI devices...');
    devices.forEach(device => {
      console.log(` - ${device}`);
    });
    return;
  }

  // We must have an input name
  if (!options.input) {
    console.error('Please provide a midi input name with -i or --input');
    process.exit(1);
  }

  const INPUT_NAME = options.input;
  const OUTPUT_NAME = options.output || `${INPUT_NAME}-delayed`;
  const TIMEOUT = options.delay;

  console.log(`Connecting to ${INPUT_NAME}`);

  const input = await attemptConnect(INPUT_NAME, options.wait);
  console.log('Connected');

  console.log(`Setting up virtual MIDI output: ${OUTPUT_NAME}`);
  const output = new midi.Output(OUTPUT_NAME, true);
  console.log('Connected');

  let noteOffTimeouts = [];

  /**
   * Send a midi message
   * @param {string} type The MIDI message type
   * @param {Object} msg The MIDI payload { channel: number, note: number, velocity: number }
   */
  function send(type, msg) {
    if (options.verbose) {
      const date = new Date();
      const dateString = date.toISOString();
      console.log(dateString, type, msg);
    }
    output.send(type, msg);
  }

  /**
   * Delay sending a MIDI message
   * @param {string} type The MIDI message type
   * @param {Object} msg The MIDI payload { channel: number, note: number, velocity: number }
   * @param {number} timeout The delay timeout in ms
   */
  function delaySend(type, msg, timeout) {
    const index = `${msg.channel}-${msg.note}`;
    clearSendTimeout(index);

    noteOffTimeouts[index] = setTimeout(() => {
      send(type, msg);
      clearSendTimeout(index);
    }, timeout);
  }

  /**
   * Clears send message timeout
   * @param {string} index Timeout index
   */
  function clearSendTimeout(index) {
    if (noteOffTimeouts[index]) {
      clearTimeout(noteOffTimeouts[index]);
      delete noteOffTimeouts[index];
    }
  }

  // Setup noteon handler
  input.on('noteon', function (msg) {
    // Noteon with velocity > 0 is a true noteon
    if (msg.velocity > 0) {
      const index = `${msg.channel}-${msg.note}`;

      // If debounce option is provided, any subsequent noteon messages received AFTER the first noteon but BEFORE a delayed
      // noteoff message is sent get ignored
      if (options.db) {
        if (!noteOffTimeouts[index]) {
          send('noteon', msg);
        }

      // Else by default, subsequent noteon messages received AFTER the first noteon clear the delayed noteoff timer and
      // the timer is reset to the LAST noteon message received
      } else {
        clearSendTimeout(index);
        send('noteon', msg);
      }
    }

    // Noteon with velocity = 0 is a fake noteoff
    if (msg.velocity === 0) {
      delaySend('noteon', msg, TIMEOUT);
    }
  });

  // Setup noteoff handler
  input.on('noteoff', function (msg) {
    delaySend('noteoff', msg, TIMEOUT);
  });
})();
