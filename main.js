import {GLTFLoader} from "./lib/GLTFLoader.js";

var HALF_PI = Math.PI / 2;
var DATE = new Date();
var BLACK = 0x283954;
var BLACK_HEX = "#283954";

var _width, _height;
var _renderer, _camera, _raycaster;
var _loader = new GLTFLoader();
var _texture_loader = new THREE.TextureLoader();
var _scene = new THREE.Scene();
var _controls = {
	touch: false,
	pos: new THREE.Vector2(),
	prevPos: null,
	offset: new THREE.Vector2(),
	speedFactor: 3.5,
	speed: undefined,
	update: function() {
		if (_controls.offset) {
			if (_controls.offset.x > 0 || _controls.offset.y > 0) {
				let offsetX = _controls.offset.x * 0.05;
				let offsetY = _controls.offset.y * 0.05;

				_current_scene.rotation.y += offsetX;
				// _current_scene.rotation.x -= offsetY;

				// _current_scene.rotation.x = cap(_current_scene.rotation.x, -HALF_PI, HALF_PI);

				_controls.offset.x -= offsetX;
				_controls.offset.y -= offsetY;
			}
		}
	}
};
var _current_scene = null;

function init() {
	// load assets

	let soundcounter = 0;
	for (const name in assets.sounds) {
		let file = assets.sounds[name];
		assets.sounds[name] = new Howl(file);
		soundcounter++;

		assets.sounds[name].on('load', function() {
			soundcounter--;
			if (soundcounter == 0) {
				console.log("all sounds loaded.");
				loadimgs();
			}
		});
	}

	function loadimgs() {
		var imgs = {};
		let imgcounter = 0;
		
		const texture = _texture_loader.load("images/palette.png");
		texture.encoding = THREE.sRGBEncoding;
		texture.flipY = false;
		
		for (const name in assets.images) {
			imgcounter++;
			_loader.load(assets.images[name], function(gltf) {
				const group = gltf.scene;
				
				for (let child of group.children) {
					if ('material' in child) {
						child.material.map = texture;
					}
					imgs[child.name] = child;
				}
				
				imgcounter--;
				if (imgcounter == 0) {
					assets.images = imgs;
					console.log("all images loaded.");
					init_3d();
				}
			});
		}
	}
}

function init_3d() {
	_renderer = new THREE.WebGLRenderer({ alpha: true });
	// _renderer.setClearColor( 0x000000, 0 );
	
	const fov = 75;
	const aspect = 2;
	const near = 1;
	const far = 500;
	_camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
	_camera.position.set(10, 10, 25);
	_camera.lookAt(0, 0, 0);
	_camera.position.y += 3;

	getSize();

	_renderer.outputEncoding = THREE.sRGBEncoding;
	_renderer.domElement.classList.add("centered");
	_renderer.setPixelRatio(window.devicePixelRatio * 1.25);
	document.body.appendChild( _renderer.domElement );

	_raycaster = new THREE.Raycaster();
	
	//
	
	const light1 = new THREE.DirectionalLight(0xf2c46f, 1.75);
	light1.position.x = -1;
	light1.position.z = 1;
	const light2 = new THREE.DirectionalLight(0xf2c46f, 1.1);
	light2.position.x = 1;
	light2.position.z = 1;
	_scene.add(light1);
	_scene.add(light2);

	// controls

	document.addEventListener("mousedown", function() {
		_controls.touch = true;
	});
	document.addEventListener("mousemove", function(e) {
		_controls.move(e);
	});
	document.addEventListener("touchstart", function(e) {
		e.preventDefault();
		_controls.touch = true;
		_controls.move(e);
	});
	document.addEventListener("touchmove", function(e) {
		e.preventDefault();
		_controls.move(e);
	})
	document.addEventListener("mouseup", function(e) {
		_controls.select(e);
	});
	document.addEventListener("touchend", function(e) {
		_controls.select(e);
	});
	document.addEventListener("touchcancel", function(e) {
		_controls.select(e);
	});
	document.addEventListener("blur", function(e) {
		_controls.select(e);
	});
	window.addEventListener("resize", getSize);

	//
	
	draw();
	
	init_scenes();
}

function draw() {
	DATE = new Date();

	_controls.update();

	// _raycaster.setFromCamera(new THREE.Vector2(), _camera);
	// const intersects = _raycaster.intersectObjects(_scene.children);
	// if (intersects[0]) {
	// 	intersects[0].object.material.color.set(0xff0000);
	// }

	// render

	_renderer.render(_scene, _camera);

	requestAnimationFrame(draw);
}

_controls.move = function(e) {
	let x, y;

	if (e.touches) {
		let touch = e.touches[0] || e.changedTouches[0] || null;
		x = touch.pageX;
		y = touch.pageY;
	} else {
		x = e.pageX;
		y = e.pageY;
	}
	let pos = normalizedMousePosition(x, y);

	if (!_controls.prevPos) {
		_controls.prevPos = new THREE.Vector2(pos.x, pos.y);
	} else {
		_controls.prevPos.set(_controls.pos.x, _controls.pos.y);
	}
	_controls.pos.set(pos.x, pos.y);

	// hold and drag action
	if (_controls.touch) {
		_controls.offset.set(
			(_controls.pos.x - _controls.prevPos.x) * _controls.speed,
			(_controls.pos.y - _controls.prevPos.y) * _controls.speed
		);

		_current_scene.rotation.y += _controls.offset.x;
		// _current_scene.rotation.x -= _controls.offset.y;

		// _current_scene.rotation.x = cap(_current_scene.rotation.x, -HALF_PI, HALF_PI);
	}

	// move action

}

function normalizedMousePosition(x, y) {
	const rect = _renderer.domElement.getBoundingClientRect();

	return {
		x: ((x - rect.left) / rect.width * 2) - 1,
		y: - ((y - rect.top) / rect.height * 2) + 1,
	}
}

_controls.select = function(e) { // mouseup
	// click

	// reset
	_controls.touch = false;
	_controls.prevPos = null;
}

function cap(value, min, max) {
	if (value < min) {
		return min
	}

	if (value > max) {
		return max
	}

	return value
}

function getSize() {
	_height = document.documentElement.clientHeight;
	_width = document.documentElement.clientWidth;

	if (_height <= _width) {
		// _height = height;
		// _width = height;/9*16;
		_controls.speed = _controls.speedFactor * _height / 1000;
	} else {
		// _height = width;/16*9;
		// _width = width;
		_controls.speed = _controls.speedFactor * _width / 1000;
	}
	
	_camera.aspect = _width / _height;
  _camera.updateProjectionMatrix();

	_renderer.setSize( _width, _height );
}

function getMousePosition( dom, x, y ) {
	const rect = dom.getBoundingClientRect();
	return [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];
}

// SCENES

var ref = [];

class scene {
	constructor(p) {
		this.id = ref.length;
		this.objects = p.objects;

		this.init = p.init;

		var group = new THREE.Group();
		group.visible = false;
		_scene.add(group);
		this.group = group;
		this.neverLoaded = true;

		ref.push(this);
	}

	load() {
		if (this.neverLoaded) {
			this.init(this.group);
			this.neverLoaded = false;
		}
		
		if (_current_scene) {
			_current_scene.visible = false;
		}

		this.group.visible = true;
		this.group.rotation.set(0, 0, 0);

		_current_scene = this.group;
	}
}

class screen {
	constructor(p) {
		this.id = ref.length;

		ref.push(this);
	}

	check() {

	}
}

//

var assets = {
	images: {
		"bedroom": "images/bedroom.glb",
	},
	sounds: {
		"alarm": { src: "sounds/alarm.wav", loop: true },
	},
};
var bedroom = new scene({
	music: "alarm",
	init: function(group) {
		const load = [
			"floor",
			
			"3",
			"6",
			"9",
			"12",
			"hour_hand",
			"minute_hand",
			"clock_lines",
			"clock",
			
			"bed",
			
			"phone_case",
			"phone_screen",
			
			"chair",
			"desk",
			"keyboar",
			"mouse",
			
			"computer_plug",
			"pc",
			"pc_screen",
			
			"charger",
			"charger001",
			"charger002",
			"charger003",
			
			"window",
			"curtain_lever",
			
			"deer"
		];
		
		for (const obj of load) {
			group.add(assets.images[obj]);
		}
		
		group.rotation.y = -1.7521712817716457;
	},
});

function init_scenes() {
	bedroom.load();
	
	console.log("all scenes loaded.");
}

window.onload = function() {
	init();
};