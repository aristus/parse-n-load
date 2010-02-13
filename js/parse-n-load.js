
//unfortunately you can't get the path of a file input.
// function runTest() {
//     var files = YAHOO.util.Dom.get('js-file').files;
//     console.log(files[0]);
// }

function init() {
    data = [];
    doc = YAHOO.util.Dom.get('js').contentWindow.document;
    win = YAHOO.util.Dom.get('js').contentWindow;
    progress = YAHOO.util.Dom.get('progress');
    file = null;
    runs = 3;
    runnable = true;
}
window.onload = init;

function map(fn, lst) {
    var ret = [];
    for (var i=0; i<lst.length; i++) {
        ret.push(fn(lst[i]));
    }
    return ret;
}

function filter(fn, lst) {
    var ret = [];
    for (var i=0; i<lst.length; i++) {
        if (fn(lst[i])) {
            ret.push(lst[i]);
        }
    }
    return ret;
}

function reduce(fn, lst, acc) {
    for (var i=0; i<lst.length; i++) {
        acc = fn(lst[i], acc);
    }
    return acc;
}

function sum(lst) {
    return reduce(function(a,b){return a+b;}, lst, 0);
}

function avg(lst) {
    var tot = sum(lst);
    return tot / lst.length;
}

function stdev(lst, mean) {
    var tot = sum(lst);
    var squares = map(function(x){return (x-mean)*(x-mean);}, lst);
    return Math.sqrt(sum(squares) / (lst.length-1));
}

function le(lst, lim) {
    return filter(function(a){return a[1]<=lim;}, lst);
}

function nonzero(lst) {
    return filter(function(a){return a[1]<=0;}, lst);
}

function nthPercentile(lst, n) {
    var a = lst.slice();
    a.sort(function(x,y){return x[1]-y[1];});
    var lim = a[Math.floor(a.length * n)][1];
    return le(lst, lim);
}

function flotPlot(data) {
    //data = nonzero(data); // happens ocassionally on FF3.0
    if (YAHOO.util.Dom.get('ignore-spikes').checked) {
        data = nthPercentile(data, 0.95);
    }
    var lst = map(function(x){return x[1];}, data);
    var mean = avg(lst);
    var variance = stdev(lst, mean);
    progress.innerHTML = ['<div><b>File:</b> ',file,'</div>',
                          '<div><b>Mean Average:</b> ',mean.toFixed(0),' msecs</div>',
                          '<div><b>Std. Deviation:</b> ',variance.toFixed(1),' msecs</div>',
                          '<div><small>',navigator.userAgent,'</small></div>']
                        .join('');
    YAHOO.widget.Flot("flot", [data],
                      {color:2,
                       lines:{show:true}
                      });
}


function time() {
    return (new Date()).getTime();
}

function match(s) {
    return nav.indexOf(s) !== -1;
}

//for non-blocking browsers. careful not to blow the stack.
function loadFile(i) {
    if (i<runs) {
        doc.close();
        doc.write('<script>var start = (new Date()).getTime();</script>');
        doc.write('<script id="test" src="'+file+'"></script>');
        doc.write('<script>top.data['+i+'] = ['+i+', (new Date()).getTime() - start];</script>');
        doc.write('<script>var e=document.getElementById("test"); e.parentNode.removeChild(e);</script>');
        doc.write('<script>window.setTimeout(function(){top.loadFile('+(i+1)+');}, 0);</script>');
        doc.close();
    } else {
        flotPlot(data);
    }
}

// browsecap crap.
// blocking = (Safari 4 (but not Chrome)) or (Opera)
var nav = navigator.userAgent;
var blocking = (match('Safari') && !match('Chrome') && match('Version/4')) || match('Opera');

function runTest() {
    data = new Array(runs);
    file = 'test-data/'+YAHOO.util.Dom.get('js-file').value;
    runs = parseInt(YAHOO.util.Dom.get('num-runs').value||'3');
    if (!file) {
        alert('Please choose a filename');
        YAHOO.util.Dom.get('js-file').focus();
        return;
    }

    // Safari 4 blocks when writing script tags. Firefox does not.
    // Chrome does not block, but the naive code path blows the
    // stack after just 20 iterations (ORLY? RLY.)
    // hence the window.setTimeout(fn, 0);
    if (blocking) {
        for (var i=0; i<runs; i++) {
            doc.close();
            var start = time();
            doc.write('<script id="test" src="'+file+'"></script>');
            doc.write('<script>var e=document.getElementById("test"); e.parentNode.removeChild(e);</script>');
            doc.close();
            data[i] = [i, (new Date()).getTime() - start];
        }
        flotPlot(data);
    } else {
        window.setTimeout(function(){loadFile(0);}, 0);
    }
}

function stopTest() {
    runnable = false;
}