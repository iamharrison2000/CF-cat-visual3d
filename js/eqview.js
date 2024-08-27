//	eqview.js - javascript replacement for `eqview3d.jar'
//
//	REQUIRES <http://threejs.org/build/three.min.js>
//		examples/controls/TrackballControls.js
//		examples/renderers/CanvasRenderer.js
//		examples/renderers/Projector.js
//		examples/effects/StereoEffect.js
//

var version = "0.1.3.1";

var objects = [];

var jvd_cam, jvd_look, jvd_fov;
var center, fault, lineseg;
var renderer, scene, camera, controls, render_type;
var effect, stereoView, bgColor, outcanvas;


// initialize to arrays
center = new Array ();
fault = new Array ();
lineseg = new Array ();


//	function eqview (pathname)
//
//    Read camera position from `filename.JVD' and eq centers, bounding box
// and fault lines from `filename.JVX', then use 3js to plot the data to
// the canvas element with ID `3dview'.
//
function eqview (pname) {
  var xmljvd = new XMLHttpRequest ();
  xmljvd.onreadystatechange = function () {
    if (xmljvd.readyState == 4 && xmljvd.status == 200) {
      // step 1
      parse_jvd_file (xmljvd);

      var xmljvx = new XMLHttpRequest ();
      xmljvx.onreadystatechange = function () {
	if (xmljvx.readyState == 4 && xmljvx.status == 200) {
	  // step 2
	  parse_jvx_file (xmljvx);

	  // step 3: intialize the 3js routines and render the data
	  init ();
	  animate ();
	}
      }
      // step 2: parse the JVX file for EQ centers, faults and bounding box
      xmljvx.open ("GET", pname + "_jvx.xml", true);
      xmljvx.send ();
    }
  }
  // step 1: parse the JVD file for camera position
  xmljvd.open ("GET", pname + "_jvd.xml", true);
  xmljvd.send ();
}	// function read_jvd_file


//	function parse_jvd_file (xmlHttpReq)
//
//   Called after the JVD file has been read into memory - traverses the
// DOM to read the camera position, orientation and field of view and
// stores them in the global variables `jvx_cam', `jvx_look' and `jvx_fov'.
//
function parse_jvd_file (xml) {
  var xmlDoc = xml.responseXML;

  // first read in the active camera from the `cameras' `select' attribute
  var camtags = xmlDoc.getElementsByTagName ("cameras");
  var active = camtags[0].getAttributeNode ("select").value;

  // search through the camera list for the active camera
  var camlist = camtags[0].getElementsByTagName ("camera");
  for (var i = 0; i < camlist.length; i++) {
    if (active != camlist[i].getAttributeNode ("name").value) {
      continue;
    }
    // got the active camera - store the values & quit
    jvd_cam = camlist[i].getElementsByTagName ("position")[0].textContent;
    jvd_look = camlist[i].getElementsByTagName ("interest")[0].textContent;
    jvd_fov = camlist[i].getElementsByTagName ("fieldOfView")[0].textContent;
    break;
  }
//  para_append (document.getElementById ("listing"),
//	       "camera at " + jvd_cam + ", looking at " +
//	       jvd_look + ", field of view " + jvd_fov);
}	// function parse_jvd_file


//	function parse_jvx_file (xmlHttpReq)
//
//   Called after the JVX file has been read into memeory - traverses the
// DOM to read the earthquake center positions, which are stored in the
// global variable `center' keyed by color and thickness (size).  Also
// reads the line data (faults and bounding box edges) and stores them in
// the global variables `fault' and `lineseg', keyed by color and
// thickness.
//
function parse_jvx_file (xml) {
  var xmlDoc = xml.responseXML;

  // get all of the `geometry' tags
  var geotags = xmlDoc.getElementsByTagName ("geometry");

//  var outobj = document.getElementById ("listing");
//  para_append (outobj, geotags.length + " `geometry' tags");

  // loop through and save the data
  for (var i = 0; i < geotags.length; i++) {
    var name = geotags[i].getAttributeNode ("name").value;
    var thick = geotags[i].getElementsByTagName ("thickness")[0].textContent;
    var col = geotags[i].getElementsByTagName ("color")[0].textContent;
    var payload = geotags[i].getElementsByTagName ("p");

    var token = col.trim ().split (/\s+/);
    var color = new THREE.Color;
    color.setRGB (token[0], token[1], token[2]);
    var colStr = color.getHexString ();

    if (name != " ") {
      // non-space names are list of points with earthquake centers
      if (thick == 0) {
	continue;		// skip invisible for now
      }
//      para_append (outobj, i + " - name `" + name + "', " + payload.length +
//		   " events in color " + col + " (" + colStr +
//		   "), thickness " + thick);
      if (center[colStr] === undefined) {
	center[colStr] = new Array ();
      }
      if (center[colStr][thick] === undefined) {
	center[colStr][thick] = new THREE.Geometry;
      }
      for (var j = 0; j < payload.length; j++) {
	// trim to remove leading & trailing spaces, split on multiple spaces
	token = payload[j].textContent.trim ().split (/\s+/);
	center[colStr][thick].vertices.push (
	  new THREE.Vector3 (token[0], token[1], token[2])
	);
//	para_append (outobj, "..... " + token[0] + ", " + token[1] + ", " + token[2]);
      }
    } else {
      // it should be a line set - check for continuous lines
      var seglist = geotags[i].getElementsByTagName ("l");
      var ends = line_ends (seglist);

//      para_append (outobj, i + " - line color " + col + " (" + colStr + "), " +
//		   thick + " thickness, with " + seglist.length +
//		   " segments: endpoints " +
//		   (ends === undefined) ? "non-contiguous" : ends);

      if (ends === undefined) {
	if (lineseg[colStr] === undefined) {
	  lineseg[colStr] = new Array ();
	}
	if (lineseg[colStr][+thick] === undefined) {
	  lineseg[colStr][+thick] = new Array ();
	}
	var geo = new THREE.Geometry ();
	for (var j = 0; j < seglist.length; j++) {
	  var endpt = seglist[j].textContent.trim ().split (/\s+/);
	  for (var k = 0; k < endpt.length; k++) {
	    var token = payload[endpt[k]].textContent.trim ().split (/\s+/);
	    geo.vertices.push (
	      new THREE.Vector3 (token[0], token[1], token[2])
	    );
	  }
//	  para_append (outobj, "----- " + payload[endpt[0]].textContent +
//		       " --> " + payload[endpt[1]].textContent);
	}
	geo.computeLineDistances ();
	lineseg[colStr][+thick].push (geo);
      } else {
	if (fault[colStr] === undefined) {
	  fault[colStr] = new Array ();
	}
	if (fault[colStr][+thick] === undefined) {
	  fault[colStr][+thick] = new Array ();
	}
	var geo = new THREE.Geometry ();
	for (var j = 0; j < seglist.length; j++) {
	  var endpt = seglist[j].textContent.trim ().split (/\s+/);
	  if (j == 0) {
	    // need the starting point - the rest are all end points
	    var token = payload[endpt[0]].textContent.trim ().split (/\s+/);
	    geo.vertices.push (
	      new THREE.Vector3 (token[0], token[1], token[2])
	    );
//	    para_append (outobj, "----- " + endpt[0] + ": " +
//			 payload[endpt[0]].textContent);
	  }
	  if (payload[endpt[1]] === undefined) {
	    break;		// truncate line to last vertex
	  }
	  var token = payload[endpt[1]].textContent.trim ().split (/\s+/);
	  geo.vertices.push (
	    new THREE.Vector3 (token[0], token[1], token[2])
	  );
//	  para_append (outobj, "----- " + endpt[1] + ": " +
//		       payload[endpt[1]].textContent);
	}
	geo.computeLineDistances ();
	fault[colStr][+thick].push (geo);
      }
    }
  }
}	// function parse_jvx_file


//	function para_append (out_object, string)
//
//   Creates a new paragraph containing `string' and appends it to
// `out_object'.
//
function para_append (outobj, str) {
  var newp = document.createElement ("p");
  newp.innerHTML = str;
  outobj.appendChild (newp);
}	// function para_append


//	endpoint_string = line_ends (segment_list)
//
//    Determine if a list of line segments represents a continuous line
// (and can thus be stored in a `Line' object) or if it represents
// disjoint line segments (and thus needs to be stored in a
// `LineSegment' object).
//    Returns `undefined' for a non-continuous line or the first and
// last indices of the continuous line in a string separated by a
// space.
//
function line_ends (seglist) {
  var len = seglist.length;

  if (len == 1) {
    // only one segment - just return the endpoints
    return seglist[0].textContent;
  }
  var endpt = [];		// storage for segment end points
  for (var i = 0; i < len; i++) {
    var token = seglist[i].textContent.trim ().split (/\s+/);
    if (endpt[0] === undefined) {
      endpt[0] = token[0];	// first time through:
      endpt[1] = token[1];	//   store for future comparision
      continue;
    }
    if (token[0] != endpt[1]) {
      return undefined;		// non-continuous
    }
    endpt[1] = token[1];
  }
  return endpt.join (" ");	// return the endpoints indices in a string
}	// function line_ends


//	function webglAvailable ()
//
//   Returns true if the browser supports WebGL rendering or false if not.
//
function webglAvailable () {
  try {
    var canvas = document.createElement ('canvas');
    return !!(window.WebGLRenderingContext &&
	      (canvas.getContext ('webgl') ||
	       canvas.getContext ('experimental-webgl')));
  } catch (e) {
    return false;
  }
}	// function webglAvailable


//	function init ()
//
//   Set up the 3js rendering environment, read the camera information from
// the global variables `jvx_*'.  Read the earthquake centers from `center'
// and plot them using the `Point's or `Sprite's as necessary; plot the
// fault lines from `fault' and the bounding box edges from `lineseg'.
//
function init () {
  bgColor = 0xe1e1e1;		// canvas background color

  outcanvas = document.getElementById ("3dview");

//  var outobj = document.getElementById ("listing");

  render_type = webglAvailable () ? "webgl" : "canvas";

  if (render_type == "webgl") {
    renderer = new THREE.WebGLRenderer( { canvas: outcanvas } );
  } else {
    renderer = new THREE.CanvasRenderer( { canvas: outcanvas } );
    // don't ask me why - doesn't work otherwise
    renderer.setSize (outcanvas.width, outcanvas.height);
  }
  renderer.setClearColor (bgColor);

  scene = new THREE.Scene();
//  scene.fog = new THREE.Fog (bgColor, 0.5 * CUBE_SIZE, 3.5 * CUBE_SIZE);

  // that's (field of view, aspect ratio, near clip depth, far clip depth)
  camera = new THREE.PerspectiveCamera (jvd_fov * 180 / Math.PI,
					outcanvas.width / outcanvas.height,
					0.1, 1000);
  var token = jvd_cam.trim ().split (/\s+/);
  var campos = new THREE.Vector3 (2 * token[0], 2 * token[1], 2 * token[2]);
  camera.position.x = campos.x;
  camera.position.y = campos.y;
  camera.position.z = campos.z;

//  para_append (outobj, "camera position = " +
//	       campos.x + " " + campos.y + " " + campos.z);

  token = jvd_look.trim ().split (/\s+/);
  var look = new THREE.Vector3 (+token[0], +token[1], +token[2]);
  camera.lookAt (look);

//  para_append (outobj, "camera look at = " +
//	       look.x + " " + look.y + " " + look.z);

  var viewdist = campos.distanceTo (look);

//  para_append (outobj, "view distance = " + viewdist);

  // able to rotate, pan and zoom cameral with three buttons
  controls = new THREE.TrackballControls (camera, renderer.domElement);
  controls.minDistance = 0.01 * viewdist;
  controls.maxDistance = 2 * viewdist;
  controls.zoomSpeed *= 0.2;
  controls.target.copy (look);
  controls.target0.copy (look);		// needed for resetView
  controls.addEventListener ('change', render);

  // set up stereo effect but don't activate it
  effect = new THREE.StereoEffect (renderer);
  effect.eyeSeparation = viewdist / 50;		// good place to start
  effect.defSep = effect.eyeSeparation;		// store for reset
  stereoView = false;
  // need to reset these after setting up stereo
  renderer.setClearColor (bgColor);
  renderer.autoClear = true;

  // 32x32 white disc "floating" on alpha background, disc about 24px
  var disc = THREE.ImageUtils.loadTexture ("disc.png", undefined, resetView);

  // add the earthquake centers first
  for (var c in center) {
    if (center[c] === undefined) {
      continue;		// nothing for this time span - try the next
    }
    for (var t in center[c]) {
      if (center[c][t] === undefined) {
	continue;		// nothing for this magnitude: try the next
      }
      if (render_type == "webgl") {
  	var pts = new THREE.Points (
	  center[c][t],
	  new THREE.PointsMaterial (
	    // both color and size need numbers, not strings
	    { color: +("0x" + c), size: (1 + (2 * t) * 32 / 24), map: disc,
	      sizeAttenuation: false, alphaTest: 0.5, transparent: true
	    }
	  )
	);
	scene.add (pts);
	objects.push (pts);
      } else if (render_type == "canvas") {
	// need to use sprites directly since canvas can't render point sprites
	var matCanvas = new THREE.SpriteCanvasMaterial (
	  { color: +("0x" + c),
	    program: function (context) {
	      context.beginPath ();
	      // that's x, y, radius, startang, stopang, ccw
	      context.arc (0, 0, (+t + 3) * 0.02, 0, 2 * Math.PI, true);
	      context.fill ();
	    }
	  }
	);
	for (var i = 0; i < center[c][t].vertices.length; i++) {
	  var spr = new THREE.Sprite (matCanvas);
	  spr.position.copy (center[c][t].vertices[i]);
	  scene.add (spr);
	}
      }
    }
  }

  // now add the bounding box
  for (var c in lineseg) {
    if (lineseg[c] === undefined) {
      continue;
    }
    for (var t in lineseg[c]) {
      for (var i = 0; i < lineseg[c][t].length; i++) {
      	var ln = new THREE.LineSegments (
	  lineseg[c][t][i],
	  new THREE.LineBasicMaterial (
	    { color: +("0x" + c), linewidth: +t }
	  )
	);
	scene.add (ln);
	objects.push (ln);
      }
    }
  }

  // finally add the faults
  for (var c in fault) {
    if (fault[c] === undefined) {
      continue;
    }
    for (var t in fault[c]) {
      for (var i = 0; i < fault[c][t].length; i++) {
      	var ln = new THREE.Line (
	  fault[c][t][i],
	  new THREE.LineBasicMaterial (
	    { color: +("0x" + c), linewidth: +t }
	  )
	);
	scene.add (ln);
	objects.push (ln);
      }
    }
  }

  // add in keyboard controls
  window.addEventListener ('keypress', onKeyPress, false);

  render ();
}	// function init


//	function onKeyPress (event)
//
//   Event handler for key presses: reset the view; start / stop free
// rotation.
//
function onKeyPress (event) {
  var ch = event.which || event.keyCode;
  switch (ch) {
  case 82:			// 'R'
  case 114:			// 'r'
    resetView ();
    break;
  case 87:			// 'W'
  case 119:			// 'w'
    // turn on free (undamped) rotation
    controls.rotationDampingFactor = 0;
    break;
  case 81:			// 'Q'
  case 113:			// 'q'
    // turn on damped rotation
    controls.rotationDampingFactor = controls.dynamicDampingFactor;
    break;
  case 122:			// 'z'
  case 90:			// 'Z'
    toggleStereo ();
    break;
  case 43:			// '+'
  case 61:			// '='
    // increase the stereo eye distance
    if (stereoView) {
      effect.eyeSeparation += 0.1 * effect.defSep;
      render ();
    }
    break;
  case 45:			// '-'
  case 95:			// '_'
    // decrease the stereo eye distance
    if (stereoView) {
      effect.eyeSeparation -= 0.1 * effect.defSep;
      render ();
    }
    break;
  case 101:			// 'e'
  case 69:			// 'E'
    // reset back to default
    if (stereoView) {
      effect.eyeSeparation = effect.defSep;
      render ();
    }
  }
}	// function onKeyPress


//	function resetView ()
//
//   Reset back to the initial view, stop any current rotation and
// turn on damped rotation.
//
function resetView () {
  // stop free rotation first to stop any spinning
  controls.rotationDampingFactor = 1;
  controls.reset ();
  // reset stereo eye separation, too
  effect.eyeSeparation = effect.defSep;
  // turn on damped rotation 0.1 sec later
  window.setTimeout (function () {
    controls.rotationDampingFactor = controls.dynamicDampingFactor
  }, 100);
}	// function resetView


function toggleStereo () {
  stereoView = !stereoView;
  if (stereoView) {
    outcanvas.setAttribute ("width", 2 * outcanvas.width);
    camera.aspect = outcanvas.width / outcanvas.height;
    renderer.autoClear = false;
    effect.setSize (outcanvas.width, outcanvas.height);
    effect.render (scene, camera);
  } else {
    outcanvas.setAttribute ("width", outcanvas.width / 2);
    renderer.autoClear = true;
    renderer.setSize (outcanvas.width, outcanvas.height);
    camera.aspect = outcanvas.width / outcanvas.height;
    renderer.setClearColor (bgColor);
  }
}	// function toggleStereo


function animate () {
  requestAnimationFrame (animate);
  controls.update ();
}	// function animate


//	function render ()
//
//   Use the 3js controls to update the canvas display.
//
function render () {
//  requestAnimationFrame (render);

//  controls.update ();
  if (stereoView) {
    effect.render (scene, camera);
  } else {
    renderer.render (scene, camera);
  }
}	// function render
