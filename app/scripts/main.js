let synth = new Tone.Synth().toMaster();

let bootstrap_alert = function() {}
bootstrap_alert.danger = function(message) {
  $('#alert_placeholder').html('<div class="alert alert-danger"><a class="close" data-dismiss="alert">×</a><span>'+message+'</span></div>');
};

bootstrap_alert.empty = function(){
  $('#alert_placeholder').html('');
};


let definedVars = {};

let beepCommands = [];


$('#execBtn').click(function () {
  $('#execBtn').prop('disabled', true);

  bootstrap_alert.empty();

  definedVars = [];
  beepCommands = [];
  let text = $('#songEntry').val().replace(/&&/g, '\n').replace('--new', '-n');
  let lines = text.split('\n');
  let out = [];
  let startLine = true;

  for(var i = 0; i < lines.length; i++){
    if(startLine){
      out.push(lines[i].replace('\\', '').trim() + ' ');
    } else {
      out[out.length - 1] += lines[i].replace('\\', '').trim() + ' ';
    }

    if(lines[i].endsWith('\\')){
      startLine = false;
    } else {
      startLine = true;
    }
  }

  out = out.map(Function.prototype.call, String.prototype.trim);

  console.log(out);

  try {
    for (let line of out) {
      parseLine(line);
    }
  }
  catch(e){
    definedVars = [];
    beepCommands = [];
    bootstrap_alert.danger(e);
  }

  console.log(definedVars);

  beepCommands.reduce((p, beep) => {
    return p.then(() => beep.play());
  }, Promise.resolve()).then(() => {
    $('#execBtn').prop('disabled', false);
  });
});


function parseLine(line) {
  if(line.trim() === ''){
    // Empty
  } else if(line.startsWith('#')){
    // Comment
  } else if(line.startsWith('beep')){
    beepCommands.push(new BeepCmd(line));
  } else if(line.split('=').length === 2) {
    defineVar(line);
  } else {
    throw 'Parse encountered an unsupported line in the script at "' + line  + '"';
  }
}

function defineVar(line) {
  let parts = line.split('=');
  definedVars[parts[0]] = parseFloat(parts[1]);
}

class BeepCmd{
  constructor(line) {
    line = line.split('#')[0]; // remove any comment on line
    line = line.replace('beep', ''); // remove start of cmd
    line = line.split('-n');
    this.parts = [];
    for(let part of line){
      this.parts.push(new BeepCmdLeaf(part.trim()));
    }
  }

  play(){
    return this.parts.reduce((p, part) => {
      return p.then(() => part.play());
    }, Promise.resolve());
  }

}

/**
 * Needs to parse out
 *  - f  frequency in Hz
 *  - l  length in milliseconds
 *  - r  repeat times  (1 default)
 *  - d delay between reps
 */
class BeepCmdLeaf {
  constructor(line) {
    line = line.split(' ');
    for(let i = 0; i < line.length; i++){
      if(line[i].startsWith('$')){
        let name = line[i].substring(1);
        if(definedVars[name] !== undefined) {
          line[i] = definedVars[name];
        } else {
          throw 'Parse encountered an undefined variable with the name "' + name + '"';
        }
      }
    }

    this.reps = 1;
    this.delay = 100;
    this.delayAfterLast = false;
    this.freq = 440;
    this.len = 200;

    line = line.filter(function (el) {
      return el.trim().length > 0;
    });

    let out = [];
    for(let i = 0; i < line.length; i ++){
      if(line[i].startsWith('-') && line[i].length > 2){
        out.push(line[i].substring(0, 2));
        out.push(line[i].substring(2));
      } else {
        out.push(line[i]);
      }
    }


    for(let i = 0; i < out.length - 1; i += 2){
      switch(out[i]){
        case '-f':
          this.freq = parseFloat(out[i+1]);
          break;
        case '-l':
          this.len = parseInt(out[i+1]);
          break;
        case '-r':
          this.reps = parseInt(out[i+1]);
          break;
        case '-d':
          this.delayAfterLast = false;
          this.delay = parseInt(out[i+1]);
          break;
        case '-D':
          this.delayAfterLast = true;
          this.delay = parseInt(out[i+1]);
          break;
        default:
          throw 'Undefined flag for beep with name"' + out[i] + '"';
      }
    }
  }

  play() {
    if(this.reps === 0){ // 0 reps we just return
      return Promise.resolve();
    }
    return new Promise(resolve => {
      this.reps--;
      resolve(this.playOnce(this.reps > 0 || this.delayAfterLast).then(() => {
        return this.play()
      }));
    });
  }

  playOnce(shouldDelay){
    return new Promise((resolve => {
      console.log(this);
      synth.triggerAttackRelease(this.freq, this.len / 1000);
      setTimeout(() => {
        resolve();
      }, this.len + (shouldDelay ? this.delay : 0))
    }));
  }


}



// Uncomment to enable Bootstrap tooltips
// https://getbootstrap.com/docs/4.0/components/tooltips/#example-enable-tooltips-everywhere
// $(function () { $('[data-toggle="tooltip"]').tooltip(); });

// Uncomment to enable Bootstrap popovers
// https://getbootstrap.com/docs/4.0/components/popovers/#example-enable-popovers-everywhere
// $(function () { $('[data-toggle="popover"]').popover(); });
