/*jshint wsh:true */

var
  FSO_ForReading = 1, FSO_ForWriting = 2,
  PS_MSG = 'Microsoft Windows PowerShell is required.' +
    ' https://technet.microsoft.com/en-us/library/hh847837.aspx',

  input, fso, tty,
  options = (function(conf) {
    var options = {}, arg, args =// Array.prototype.slice.call(WScript.Arguments),
      (function() {
        var args = [], i, iLen;
        for (i = 0, iLen = WScript.Arguments.length; i < iLen; i++)
          { args.push(WScript.Arguments(i)); }
        return args;
      })(),
      confLc = {}, key;

    function decodeDOS(arg) {
      return arg.replace(/#(\d+);/g, function(str, charCode) {
        return String.fromCharCode(+charCode);
      });
    }

    for (key in conf) {
      if (conf.hasOwnProperty(key))
        { confLc[key.toLowerCase()] = {key: key, type: conf[key]}; }
    }

    while (typeof(arg = args.shift()) === 'string') {
      if (!(arg = (arg.match(/^\-+(.+)$/) || [])[1])) { continue; }
      arg = arg.toLowerCase();
      if (confLc[arg]) {
        options[confLc[arg].key] =
          confLc[arg].type === 'boolean' ? true :
          confLc[arg].type === 'string' ? args.shift() : null;
      }
    }
    for (key in conf) {
      if (conf.hasOwnProperty(key) && conf[key] === 'string') {
        if (typeof options[key] !== 'string') { options[key] = ''; }
        else if (options.encoded) { options[key] = decodeDOS(options[key]); }
      }
    }
    return options;
  })({
    display:      'string',
    noEchoBack:   'boolean',
    mask:         'string',
    keyIn:        'boolean',
    encoded:      'boolean'
  });

if (!options.noEchoBack && !options.keyIn) {
  if (options.display !== '') { writeTTY(options.display); }
  input = readByCS();
} else if (options.noEchoBack && !options.keyIn && options.mask === '*') {
  if (options.display !== '') { writeTTY(options.display); }
  input = readByPW();
} else {
  WScript.StdErr.WriteLine(PS_MSG);
  WScript.Quit(1);
}

WScript.StdOut.Write('\'' + input + '\'');

WScript.Quit();

function writeTTY(text) {
  try {
    tty = tty || getFso().OpenTextFile('CONOUT$', FSO_ForWriting, true);
    tty.Write(text);
  } catch (e) {
    WScript.StdErr.WriteLine('TTY Write Error: ' + e.number +
      '\n' + e.description + '\n' + PS_MSG);
    WScript.Quit(1);
  }
}

function readByCS() {
  var text;
  try {
    text = getFso().OpenTextFile('CONIN$', FSO_ForReading).ReadLine();
  } catch (e) {
    WScript.StdErr.WriteLine('TTY Read Error: ' + e.number +
      '\n' + e.description + '\n' + PS_MSG);
    WScript.Quit(1);
  }
  return text;
}

// TTY must be STDIN that is not redirected and not piped.
function readByPW() {
  var text;
  try {
    text = WScript.CreateObject('ScriptPW.Password').GetPassword()
      // Bug? Illegal data may be returned when user types before initializing.
      .replace(/[\u4000-\u40FF]/g, function(chr) {
        var charCode = chr.charCodeAt(0);
        return charCode >= 0x4020 && charCode <= 0x407F ?
          String.fromCharCode(charCode - 0x4000) : '';
      });
  } catch (e) {
    WScript.StdErr.WriteLine('ScriptPW.Password Error: ' + e.number +
      '\n' + e.description + '\n' + PS_MSG);
    WScript.Quit(1);
  }
  writeTTY('\n');
  return text;
}

function getFso() {
  if (!fso) { fso = new ActiveXObject('Scripting.FileSystemObject'); }
  return fso;
}