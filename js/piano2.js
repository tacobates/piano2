/****************************************************************************
* Copyright Piano 2.0
* Author: Rob Bates
*
* Tool for creating 2 types of Pianos: traditional & 2.0
* Handles tone generation, highlighting, and linked keys between the pianos.
*
* NOTE: User must interact with page BEFORE you create a Piano2 object or AudioContext will fail
*
* References:
*   - https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode
****************************************************************************/

class Piano2 {
  /**************************** CONSTANTS ****************************/
  static FREQS = [ //C-B in each octave
    //C      C#     D      D#     E      F      F#     G      G#     A      A#     B
                                                                   27.50, 29.14, 30.87, //Lowest Octave (0-2)
    32.70, 34.65, 36.71, 38.89, 41.20, 43.65, 46.25, 49.00, 51.91, 55.00, 58.27, 61.74, //(3-14)
    65.41, 69.30, 73.42, 77.78, 82.41, 87.31, 92.50, 98.00, 103.8, 110.0, 116.5, 123.5, //(15-26)
    130.8, 138.6, 146.8, 155.6, 164.8, 174.6, 185.0, 196.0, 207.7, 220.0, 233.1, 246.9, //(27-38)
    261.6, 277.2, 293.7, 311.1, 329.6, 349.2, 370.0, 392.0, 415.3, 440.0, 466.2, 493.9, //(39-50)
    523.3, 554.4, 587.3, 622.3, 659.3, 698.5, 740.0, 784.0, 830.6, 880.0, 932.3, 987.8, //(51-62)
    1047,  1109,  1175,  1245,  1319,  1397,  1480,  1568,  1661,  1760,  1865,  1976,  //(63-74)
    2093,  2217,  2349,  2489,  2637,  2794,  2960,  3136,  3322,  3520,  3729,  3951,  //(75-86)
    4186,                                                                 //Highest Octave (87)
  ];
  //Key Mappings to FREQS indices
  static KEYS = { //Top 2 rows on the keyboard are black and white keys for Piano 2.0
    "q":23, //F# (A flat in Piano 2.0, because there are no Gs)
    "a":24, "w":25, //A & A#
    "s":26, "e":27, //B & B# (yes, there is a B# in Piano 2.0)
    "d":28, "r":29, //C & C#
    "f":30, "t":31, //D & D#
    "g":32, "y":33, //E & E# (yes, there is an E# in Piano 2.0)
    "h":34, "u":35, //F & F#
    "j":36, "i":37, //back to As on the 2nd Octave (no G or G# in Piano 2.0)
    "k":38, "o":39, //Bs 2nd Octave
    "l":40, "p":41, //Cs 2nd Octave
    ";":42, "[":43, //Ds 2nd Octave
    "'":44, "]":45, //Es 2nd Octave
    "\\":46, "Enter":47, //Fs 2nd Octave
    //Holding down shift key bumps 2 octaves up
    "Q":47, //Duplicate F# in the 2nd octave, same as Enter
    "A":48, "W":49, //As 3rd Octave
    "S":50, "E":51, //Bs 3rd Octave
    "D":52, "R":53, //Cs 3rd Octave
    "F":54, "T":55, //Ds 3rd Octave
    "G":56, "Y":57, //Es 3rd Octave
    "H":58, "U":59, //Fs 3rd Octave
    "J":60, "I":61, //As 4th Octave
    "K":62, "O":63, //Bs 4th Octave
    "L":64, "P":65, //Cs 4th Octave
    ":":66, "{":67, //Ds 4th Octave
    '"':68, "}":69, //Es 4th Octave
    "|":70          //F, but no F# for 4th octave
  };
  //Save indexes from FREQS of all Black Keys (for classic piano)
  static BLACK_KEYS_CLASSIC = {
     1:1,  4:1,  6:1,
     9:1, 11:1, 13:1,
    16:1, 18:1,
    21:1, 23:1, 25:1,
    28:1, 30:1,
    33:1, 35:1, 37:1,
    40:1, 42:1,
    45:1, 47:1, 49:1,
    52:1, 54:1,
    57:1, 59:1, 61:1,
    64:1, 66:1,
    69:1, 71:1, 73:1,
    76:1, 78:1,
    81:1, 83:1, 85:1
  };
  //C#/Db [D in classic] *and* Ab/F# [Ab/G# in classic] get special styling
  static BLACK_KEYS_CENTERED = {5:1, 17:1, 29:1, 41:1, 53:1, 65:1, 77:1};
  static BLACK_KEYS_LONG = {11:1, 23:1, 35:1, 47:1, 59:1, 71:1, 83:1};

  //Default names for Classic Piano (1) and Piano 2.0
  static HALF_STEPS = [ //Paired Index serves as mapping
      ["A", "A#", "B", "C", "C#", "D", "D#", "E",  "F", "F#", "G", "G#"],
      ["A", "A#", "B", "B#", "C", "C#", "D", "D#", "E", "E#", "F", "F#"]
    ];
  //Map Enharmonics for Piano 1.0 (Sharps to Flats and vice-versa)
  static ENHARMONICS_FLAT_1  = {"Ab":"G#", "Bb":"A#", "Cb":"B", "Db":"C#", "Eb":"D#", "Fb":"E", "Gb":"F#"};
  static ENHARMONICS_SHARP_1 = {"A#":"Bb", "B#":"C", "C#":"Db", "D#":"Eb", "E#":"F", "F#":"Gb", "G#":"Ab"};
  static ENHARMONICS_FLAT_2  = {"Ab":"F#", "Bb":"A#", "Cb":"B#", "Db":"C#", "Eb":"D#", "Fb":"E#"}; //Piano 2.0 doesn't skip black keys ever
  static ENHARMONICS_SHARP_2 = {"A#":"Bb", "B#":"Cb", "C#":"Db", "D#":"Eb", "E#":"Fb", "F#":"Ab"};
  //Tone Types we can play
  static OSC_SINE = "sine";
  static OSC_TRIANGLE = "triangle";
  static OSC_SAWTOOTH = "sawtooth";
  static OSC_SQUARE = "square";
  static OSC_TYPES = [Piano2.OSC_SINE, Piano2.OSC_TRIANGLE, Piano2.OSC_SAWTOOTH, Piano2.OSC_SQUARE];
  //Piano Types
  static PIANO_TYPE_CLASSIC = 0; //the 1.0 O.G.
  static PIANO_TYPE_NEW = 1; //the 2.0 piano we are trying to show off here
  //Some Named Notes to use with play() [correspond to FREQS indices]
  static NOTE_A0 = 0;
  static NOTE_A1 = 12;
  static NOTE_A2 = 24;
  static NOTE_A3 = 36; //220hz
  static NOTE_A4 = 48; //440hz
  static NOTE_A5 = 60;
  static NOTE_A6 = 72;
  static NOTE_A7 = 84;
  static NOTE_A = 36; //Default A-F for Piano 2.0 (each 2 half steps apart)
  static NOTE_B = 38;
  static NOTE_C = 40;
  static NOTE_D = 42;
  static NOTE_E = 44;
  static NOTE_F = 46;

  //Counts of Static Quantities
  static MAX_KEYS = 88; //88 keys on a keyboard
  static MS_TO_HIGHLIGHT = 400; //How long to leave a clicked key in a highlighted state
  static NUM_HALF_STEPS = 12; //12 notes in a scale

  //Defaults to use if not specified
  static DEFAULT_DURATION = 1.5; //Seconds for tone to fade in and out //TODO: is this actually seconds ??? ???
  static DEFAULT_FREQ_I = 57; //Index of 440 (A) in FREQS
  static DEFAULT_TONE = Piano2.OSC_SINE;

  
  /**************************** FUNCTIONS ****************************/
  /**
  * Creates a Piano2 object for creating Piano Keyboards in the DOM
  * NOTE: User must interact with page BEFORE you create a Piano2 object (or AudioContext will fail)
  */
  constructor () {
    this.context = new AudioContext(); //AudioContext for Oscillators to generate tones
    this.debug = false;
    this.duration = Piano2.DEFAULT_DURATION;
    this.toneType = Piano2.DEFAULT_TONE;
  }
  
  /**
  * Adds a key listener to generate tones when pressed
  * QWERTY... for black keys
  * ASDFG... for white keys
  * 1234... for tone selection (from OSC_TYPES)
  */
  addKeyListener() {
    //Kludge to keep "this" context
    var temp = this;
    document.addEventListener('keydown', function() { temp.handleKeyPress(event, temp); });
  }
  handleKeyPress(event, p2) {
    if (event.key in Piano2.KEYS) {
      var frequency = Piano2.KEYS[event.key];
      p2.out("Typed " + event.key + " => " + frequency);
      p2.play(frequency);
    } else if (parseInt(event.key) > 0) { //1-4 set Tone Type
      var i = (parseInt(event.key) - 1) % Piano2.OSC_TYPES.length;
      p2.toneType = Piano2.OSC_TYPES[i];
      p2.out(event.key + " => " + p2.toneType);
    }
  }
  handleKeyClick(event, p2) {
    var i = event.target.dataset.freq;
    p2.out("Clicked freq" + i);
    p2.play(i);
  };

  /** These 3 funcs turn console logging on/off, and do the logging */
  disableDebugging() { this.debug = false; }
  enableDebugging()  { this.debug = true; }
  out(msg) { if (this.debug) console.log(msg); }

  /**
  * Plays the Specified frequency with tone & duration
  * @param halfstep: 0 - 107 (index of FREQS) for all the half-steps we can play
  * @param duration: Numeric Length to play the tone for
  * @param toneType: from OSC_TYPES (use Piano2.OSC_* static variables)
  */
  play(halfstep=Piano2.DEFAULT_FREQ_I, duration=this.duration, toneType=this.toneType){
    this.out("Playing " + halfstep + " (" + duration + "|" + toneType + ")");
    var frequency = Piano2.FREQS[halfstep];
    var o = this.context.createOscillator();
    var g = this.context.createGain();
    o.type = toneType;
    o.frequency.value = frequency;
    o.connect(g);
    g.connect(this.context.destination);
    o.start(0);
    g.gain.exponentialRampToValueAtTime(0.00001, this.context.currentTime + duration);
    //TODO: make low notes louder, as they are hard to hear
    //TODO: make volume a trait we can pass in
    
    this.highlightKeys("freq" + halfstep);
  }

  /**
  * Sets the default Tone Type from OSC_TYPES
  * @param type: either a string like OSC_SINE/SQUARE/etc or an int Index to OSC_TYPES
  */
  setDefaultToneType(type) {
    this.out("Setting Tone Type: " + type);
    if (type == Piano2.OSC_SINE || type == Piano2.OSC_TRIANGLE || type == Piano2.OSC_SAWTOOTH || type == Piano2.OSC_SQUARE) {
      this.toneType = type;
    } else { //Assume Int Index
      type = Math.abs(parseInt(type)) % Piano2.OSC_TYPES.length; //Force valid index
      this.out("Tone Index Parsed: " + type);
      this.toneType = Piano2.OSC_TYPES[type];
    }
  }

  /**************************** DOM MANIPULATORS ****************************/

  /**
  * Alters DOM to highlight any keys with the played frequency
  * @param freqClass: "freq0" through "freq87" representing a class a key might have
  */
  highlightKeys(freqClass) {
    var keys = document.getElementsByClassName(freqClass);
    var ids = [];
    for (var i = 0; i < keys.length; ++i) {
      keys[i].classList.add("highlighted");
      ids.push(keys[i].id);
    }

    //Dehighlight in a bit
    //WARNING: had to do in separate loop, AND had to put loop inside timeout
        //ELSE vars get overwritten and it only dehighlights 1 div
    if (ids.length > 0) {
      setTimeout(function() {
        for (var i = 0; i < ids.length; ++i) {
          var div = document.getElementById(ids[i]);
          div.classList.remove("highlighted");
        }
      }, Piano2.MS_TO_HIGHLIGHT);
    }
  }

  /**
  * Creates DOM elements for a keyboard with keys that play frequencies when pressed
  * @param elementId: String representing the ID of the element to append this keyboard into
  * @param pianoType: either PIANO_TYPE_CLASSIC or PIANO_TYPE_NEW (1 & 2)
  * @param includeLabels: true to label all white keys
  */
  generateKeyboard(elementId, pianoType=Piano2.PIANO_TYPE_NEW, includeLabels=false) {
    
    this.out("Generating Keyboard_" + pianoType + " in " + elementId);
    var wrap = document.getElementById(elementId);
    if (null == wrap)
      throw new Error("ERROR: Invalid Element '"+elementId+"' in generateKeyboard()");
    var wrap2 = document.createElement("div");
    wrap2.classList.add("piano");
    
    var divs = [];
    var xOffset = -0.5; //For X-axis offset in display (as CSS var(--xOffset))
    for (var i = 0; i < Piano2.MAX_KEYS; ++i) {
      var randomId = Math.floor(Math.random() * 9999999); //Give it 1 of 10M unique IDs
      randomId = "__p2__key_" + randomId;
      xOffset += 0.5; //Move over 1-half key each time
      var note1 = Piano2.HALF_STEPS[0][i % Piano2.NUM_HALF_STEPS]; //Note Name for Classic Piano
      var note2 = Piano2.HALF_STEPS[1][i % Piano2.NUM_HALF_STEPS]; //Note Name for Piano 2.0

      //Create a Div Representing a Piano Key
      divs.push(document.createElement("div"));
      divs[i].id = randomId;
      divs[i].classList.add("key", "white", "freq" + i); //"black" may replace "white"
      divs[i].dataset.freq = i;
      
      var label = document.createElement("div");
      label.classList.add("keyLabel");
      label.innerHTML = note1;
      divs[i].appendChild(label);

      //Black Key Handling
      if (pianoType == Piano2.PIANO_TYPE_NEW) { //for Piano 2.0
        label.innerHTML = note2;
        divs[i].title = note2 + "  (Classically " + note1 + ")";
        if (i % 2 == 1) { //Odd keys are always Black in 2.0
          divs[i].classList.replace("white", "black");
          if (i in Piano2.BLACK_KEYS_CENTERED)
            divs[i].classList.add("blackCenter");
          else if (i in Piano2.BLACK_KEYS_LONG)
            divs[i].classList.add("blackBig");
          else
            divs[i].classList.add("blackLighter");
        }
      } else { //For Classic style piano (1.0)
        if (i in Piano2.BLACK_KEYS_CLASSIC) {
          divs[i].classList.replace("white", "black");
          divs[i].title = note1;
        }
      }

      //Handle 2 whites in a row (more xOffset needed)
      if (i > 0 && divs[i].classList.contains("white") && divs[i - 1].classList.contains("white"))
        xOffset += 0.5; //Extra half position
      divs[i].style.setProperty("--xOffset", xOffset);
      
      //Make Clickable Note (with Kludge to keep "this" context in p2)
      var p2 = this;
      divs[i].onclick = function() { p2.handleKeyClick(event, p2); };
      wrap2.appendChild(divs[i]);
    }

    wrap.appendChild(wrap2);
  }
}
